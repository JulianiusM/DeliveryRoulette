import {AppDataSource} from '../database/dataSource';
import {SyncJob, SyncJobStatus} from '../database/entities/sync/SyncJob';
import {RestaurantProviderRef} from '../database/entities/restaurant/RestaurantProviderRef';
import * as restaurantService from '../database/services/RestaurantService';
import * as menuService from '../database/services/MenuService';
import * as providerRefService from '../database/services/RestaurantProviderRefService';
import * as dietInferenceService from '../database/services/DietInferenceService';
import * as ConnectorRegistry from '../../providers/ConnectorRegistry';
import {ProviderKey} from '../../providers/ProviderKey';
import {DeliveryProviderConnector} from '../../providers/DeliveryProviderConnector';
import {ProviderRestaurant} from '../../providers/ProviderTypes';

/**
 * Unified provider sync pipeline.
 *
 * Supports two connector styles through a **single** code path:
 *
 * - **fetch** (default): Look up existing {@link RestaurantProviderRef}
 *   rows for the requested provider, then fetch menus from the connector.
 *
 * - **push**: The connector itself provides a restaurant list via
 *   `listRestaurants()`.  The pipeline creates / updates restaurants
 *   and provider refs generically, then processes menus through the
 *   same shared path.
 *
 * The pipeline is connector-agnostic: it never references any specific
 * connector implementation.
 *
 * Concurrency is guarded by a simple job-table lock: only one
 * `in_progress` job is allowed at a time.
 */

// ── Lock helpers ────────────────────────────────────────────

/**
 * Return `true` when another sync job is already running.
 */
export async function isLocked(): Promise<boolean> {
    const repo = AppDataSource.getRepository(SyncJob);
    const running = await repo.findOne({where: {status: 'in_progress' as SyncJobStatus}});
    return running !== null;
}

// ── Core pipeline ───────────────────────────────────────────

export interface SyncResult {
    jobId: string;
    status: SyncJobStatus;
    restaurantsSynced: number;
    errorMessage?: string | null;
}

export interface PushSyncRestaurantResult {
    name: string;
    success: boolean;
    error?: string;
}

export interface PushSyncResult extends SyncResult {
    restaurants: PushSyncRestaurantResult[];
}

/** Options for {@link runSync}. */
export interface RunSyncOptions {
    /**
     * When syncing fetch-style connectors, restrict to this provider key.
     * Omit to sync ALL registered connectors.
     */
    providerKey?: ProviderKey;

    /**
     * Provide a push-style connector instance directly.
     * The pipeline will call `listRestaurants()` to obtain the data,
     * then process each restaurant through the shared pipeline.
     */
    pushConnector?: DeliveryProviderConnector;
}

/**
 * Run the sync pipeline.
 *
 * - When `pushConnector` is provided the pipeline operates in **push**
 *   mode: restaurants are obtained from the connector, created/updated
 *   in the database, and their menus synced.
 * - Otherwise the pipeline operates in **fetch** mode: existing
 *   {@link RestaurantProviderRef} rows are looked up, and menus are
 *   fetched from the registered connector for each one.
 */
export async function runSync(options: RunSyncOptions = {}): Promise<SyncResult | PushSyncResult> {
    const {providerKey, pushConnector} = options;
    const isPush = pushConnector?.syncStyle === 'push';
    const jobProviderKey = isPush ? pushConnector!.providerKey : (providerKey ?? null);

    const jobRepo = AppDataSource.getRepository(SyncJob);

    // ── Guard: concurrent runs ──────────────────────────────
    if (await isLocked()) {
        const blocked = jobRepo.create({
            providerKey: jobProviderKey,
            status: 'failed' as SyncJobStatus,
            errorMessage: 'Another sync is already in progress',
            startedAt: new Date(),
            finishedAt: new Date(),
        });
        const saved = await jobRepo.save(blocked);
        return isPush
            ? {...toResult(saved), restaurants: []}
            : toResult(saved);
    }

    // ── Create job record ───────────────────────────────────
    const job = jobRepo.create({
        providerKey: jobProviderKey,
        status: 'in_progress' as SyncJobStatus,
        startedAt: new Date(),
    });
    await jobRepo.save(job);

    try {
        let result: SyncResult | PushSyncResult;

        if (isPush) {
            result = await runPushPipeline(pushConnector!, job);
        } else {
            result = await runFetchPipeline(providerKey, job);
        }

        return result;
    } catch (err: unknown) {
        job.status = 'failed' as SyncJobStatus;
        job.errorMessage = err instanceof Error ? err.message : String(err);
        job.finishedAt = new Date();
        await jobRepo.save(job);
        const base = toResult(job);
        return isPush ? {...base, restaurants: []} : base;
    }
}

// ── Fetch-style pipeline ────────────────────────────────────

async function runFetchPipeline(providerKey: ProviderKey | undefined, job: SyncJob): Promise<SyncResult> {
    const jobRepo = AppDataSource.getRepository(SyncJob);
    const refs = await getProviderRefs(providerKey);
    let synced = 0;

    for (const ref of refs) {
        const connector = ConnectorRegistry.resolve(ref.providerKey as ProviderKey);
        if (!connector || !ref.externalId) continue;

        await syncMenuForRestaurant(connector, ref.externalId, ref.restaurantId);

        // Update lastSyncAt on the provider ref
        const refRepo = AppDataSource.getRepository(RestaurantProviderRef);
        ref.lastSyncAt = new Date();
        await refRepo.save(ref);

        synced++;
    }

    job.status = 'completed' as SyncJobStatus;
    job.restaurantsSynced = synced;
    job.finishedAt = new Date();
    await jobRepo.save(job);
    return toResult(job);
}

// ── Push-style pipeline ─────────────────────────────────────

async function runPushPipeline(connector: DeliveryProviderConnector, job: SyncJob): Promise<PushSyncResult> {
    const jobRepo = AppDataSource.getRepository(SyncJob);
    const providerRestaurants = await connector.listRestaurants('');

    const results: PushSyncRestaurantResult[] = [];
    let synced = 0;

    for (const incoming of providerRestaurants) {
        try {
            // Create or update restaurant
            const restaurantId = await upsertRestaurant(incoming);

            // Ensure provider ref for this connector
            await ensureProviderRef(
                restaurantId,
                connector.providerKey,
                incoming.externalId,
                incoming.url,
            );

            // Upsert any additional provider refs the connector supplies
            if (incoming.providerRefs) {
                for (const ref of incoming.providerRefs) {
                    await ensureProviderRef(
                        restaurantId,
                        ref.providerKey,
                        ref.externalId ?? null,
                        ref.url,
                    );
                }
            }

            // Sync menu through the shared pipeline
            await syncMenuForRestaurant(connector, incoming.externalId, restaurantId);

            results.push({name: incoming.name, success: true});
            synced++;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            results.push({name: incoming.name, success: false, error: message});
        }
    }

    job.status = 'completed' as SyncJobStatus;
    job.restaurantsSynced = synced;
    job.finishedAt = new Date();
    await jobRepo.save(job);

    return {...toResult(job), restaurants: results};
}

// ── Shared helpers ──────────────────────────────────────────

/**
 * Shared menu sync logic used by both fetch-style and push-style
 * pipelines.  Fetches the menu from the connector, upserts
 * categories / items, and recomputes diet inference.
 */
async function syncMenuForRestaurant(
    connector: DeliveryProviderConnector,
    externalId: string,
    restaurantId: string,
): Promise<void> {
    const menu = await connector.fetchMenu(externalId);

    const cats = await menuService.upsertCategories(
        restaurantId,
        menu.categories.map((c, idx) => ({name: c.name, sortOrder: idx})),
    );

    const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c]));
    for (const provCat of menu.categories) {
        const dbCat = catByName.get(provCat.name.toLowerCase());
        if (!dbCat) continue;

        await menuService.upsertItems(
            dbCat.id,
            provCat.items.map((i, idx) => ({
                name: i.name,
                description: i.description ?? null,
                price: i.price ?? null,
                currency: i.currency ?? null,
                sortOrder: idx,
            })),
        );
    }

    await dietInferenceService.recomputeAfterMenuChange(restaurantId);
}

/**
 * Create or update a restaurant from normalised provider data.
 * Returns the restaurant ID.
 */
async function upsertRestaurant(incoming: ProviderRestaurant): Promise<string> {
    const existingRestaurants = await restaurantService.listRestaurants({});
    const existing = existingRestaurants.find(
        (r) => r.name.toLowerCase() === incoming.name.toLowerCase(),
    );

    if (existing) {
        await restaurantService.updateRestaurant(existing.id, {
            addressLine1: incoming.address ?? '',
            addressLine2: incoming.addressLine2 ?? null,
            city: incoming.city ?? '',
            postalCode: incoming.postalCode ?? '',
            country: incoming.country ?? '',
            isActive: true,
        });
        return existing.id;
    }

    const created = await restaurantService.createRestaurant({
        name: incoming.name,
        addressLine1: incoming.address ?? '',
        addressLine2: incoming.addressLine2 ?? null,
        city: incoming.city ?? '',
        postalCode: incoming.postalCode ?? '',
        country: incoming.country ?? '',
    });
    return created.id;
}

/**
 * Ensure a provider ref exists for the given restaurant / provider key.
 * Skips creation when a ref with the same key already exists.
 */
async function ensureProviderRef(
    restaurantId: string,
    providerKey: string,
    externalId: string | null,
    url: string,
): Promise<void> {
    const existingRefs = await providerRefService.listByRestaurant(restaurantId);
    const already = existingRefs.some(
        (r) => r.providerKey.toLowerCase() === providerKey.toLowerCase(),
    );
    if (!already) {
        await providerRefService.addProviderRef({
            restaurantId,
            providerKey,
            externalId,
            url,
        });
    }
}

async function getProviderRefs(providerKey?: ProviderKey): Promise<RestaurantProviderRef[]> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    if (providerKey) {
        return repo.find({where: {providerKey, status: 'active'}});
    }
    return repo.find({where: {status: 'active'}});
}

function toResult(job: SyncJob): SyncResult {
    return {
        jobId: job.id,
        status: job.status,
        restaurantsSynced: job.restaurantsSynced,
        errorMessage: job.errorMessage,
    };
}
