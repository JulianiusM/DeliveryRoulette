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

/**
 * Unified provider sync pipeline.
 *
 * Every connector follows the **same** flow:
 *   1. `listRestaurants()` — discover available restaurants
 *   2. Upsert each restaurant and its provider ref via service layer
 *   3. `fetchMenu()` — fetch menu data per restaurant
 *   4. Upsert categories / items and recompute diet inference
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

// ── Result types ────────────────────────────────────────────

export interface RestaurantSyncResult {
    name: string;
    success: boolean;
    error?: string;
}

export interface SyncResult {
    jobId: string;
    status: SyncJobStatus;
    restaurantsSynced: number;
    errorMessage?: string | null;
    restaurants: RestaurantSyncResult[];
}

/** Options for {@link runSync}. */
export interface RunSyncOptions {
    /**
     * Restrict to a single provider key.
     * Resolves the connector from the registry.
     * Omit to sync ALL registered connectors.
     */
    providerKey?: ProviderKey;

    /**
     * Provide a connector instance directly (e.g. a per-request
     * connector that is not in the registry).  When set, only this
     * connector is synced and the registry is not consulted.
     */
    connector?: DeliveryProviderConnector;
}

/**
 * Run the unified sync pipeline.
 *
 * Resolves one or more connectors, then for each:
 *   `listRestaurants()` → upsert restaurant & refs → `fetchMenu()` → upsert menu
 */
export async function runSync(options: RunSyncOptions = {}): Promise<SyncResult> {
    const {providerKey, connector: directConnector} = options;
    const jobProviderKey = directConnector?.providerKey ?? providerKey ?? null;

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
        return {...toResult(saved), restaurants: []};
    }

    // ── Create job record ───────────────────────────────────
    const job = jobRepo.create({
        providerKey: jobProviderKey,
        status: 'in_progress' as SyncJobStatus,
        startedAt: new Date(),
    });
    await jobRepo.save(job);

    try {
        // ── Resolve connector(s) ────────────────────────────
        const connectors = resolveConnectors(directConnector, providerKey);

        const allResults: RestaurantSyncResult[] = [];
        let synced = 0;

        // ── Single unified pipeline per connector ───────────
        for (const conn of connectors) {
            const providerRestaurants = await conn.listRestaurants('');

            for (const incoming of providerRestaurants) {
                try {
                    // Upsert restaurant via service layer
                    const restaurantId = await restaurantService.upsertFromProvider(incoming);

                    // Ensure provider ref for this connector
                    await providerRefService.ensureProviderRef(
                        restaurantId,
                        conn.providerKey,
                        incoming.externalId,
                        incoming.url,
                    );

                    // Upsert any additional provider refs the connector supplies
                    if (incoming.providerRefs) {
                        for (const ref of incoming.providerRefs) {
                            await providerRefService.ensureProviderRef(
                                restaurantId,
                                ref.providerKey,
                                ref.externalId ?? null,
                                ref.url,
                            );
                        }
                    }

                    // Sync menu
                    await syncMenuForRestaurant(conn, incoming.externalId, restaurantId);

                    // Update lastSyncAt on the provider ref
                    await updateLastSyncAt(restaurantId, conn.providerKey);

                    allResults.push({name: incoming.name, success: true});
                    synced++;
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Unknown error';
                    allResults.push({name: incoming.name, success: false, error: message});
                }
            }
        }

        job.status = 'completed' as SyncJobStatus;
        job.restaurantsSynced = synced;
        job.finishedAt = new Date();
        await jobRepo.save(job);
        return {...toResult(job), restaurants: allResults};
    } catch (err: unknown) {
        job.status = 'failed' as SyncJobStatus;
        job.errorMessage = err instanceof Error ? err.message : String(err);
        job.finishedAt = new Date();
        await jobRepo.save(job);
        return {...toResult(job), restaurants: []};
    }
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Resolve the connectors to sync based on the options provided.
 */
function resolveConnectors(
    directConnector?: DeliveryProviderConnector,
    providerKey?: ProviderKey,
): DeliveryProviderConnector[] {
    if (directConnector) return [directConnector];

    if (providerKey) {
        const c = ConnectorRegistry.resolve(providerKey);
        return c ? [c] : [];
    }

    // All registered connectors
    return ConnectorRegistry.registeredKeys()
        .map((k) => ConnectorRegistry.resolve(k))
        .filter((c): c is DeliveryProviderConnector => c !== undefined);
}

/**
 * Shared menu sync logic.
 * Fetches the menu from the connector, upserts categories / items,
 * and recomputes diet inference.
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
 * Update `lastSyncAt` on the provider ref for a given restaurant + key.
 */
async function updateLastSyncAt(restaurantId: string, providerKey: string): Promise<void> {
    const refRepo = AppDataSource.getRepository(RestaurantProviderRef);
    const ref = await refRepo.findOne({
        where: {restaurantId, providerKey, status: 'active'},
    });
    if (ref) {
        ref.lastSyncAt = new Date();
        await refRepo.save(ref);
    }
}

function toResult(job: SyncJob): Omit<SyncResult, 'restaurants'> {
    return {
        jobId: job.id,
        status: job.status,
        restaurantsSynced: job.restaurantsSynced,
        errorMessage: job.errorMessage,
    };
}
