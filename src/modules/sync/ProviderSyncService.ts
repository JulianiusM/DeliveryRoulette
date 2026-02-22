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
import {ImportConnector} from '../../providers/ImportConnector';
import {ImportPayload} from '../import/importSchema';

/**
 * Provider sync pipeline.
 *
 * For each {@link RestaurantProviderRef} matched by the requested provider key:
 *   1. Fetch menu from the connector (`fetchMenu`)
 *   2. Upsert menu categories and items via {@link menuService}
 *   3. Recompute diet inference for the restaurant
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

/**
 * Run the sync pipeline for the given provider key, or for ALL
 * registered connectors when `providerKey` is omitted.
 */
export async function runSync(providerKey?: ProviderKey): Promise<SyncResult> {
    const jobRepo = AppDataSource.getRepository(SyncJob);

    // ── Guard: concurrent runs ──────────────────────────────
    if (await isLocked()) {
        const blocked = jobRepo.create({
            providerKey: providerKey ?? null,
            status: 'failed' as SyncJobStatus,
            errorMessage: 'Another sync is already in progress',
            startedAt: new Date(),
            finishedAt: new Date(),
        });
        const saved = await jobRepo.save(blocked);
        return toResult(saved);
    }

    // ── Create job record ───────────────────────────────────
    const job = jobRepo.create({
        providerKey: providerKey ?? null,
        status: 'in_progress' as SyncJobStatus,
        startedAt: new Date(),
    });
    await jobRepo.save(job);

    try {
        const refs = await getProviderRefs(providerKey);
        let synced = 0;

        for (const ref of refs) {
            const connector = ConnectorRegistry.resolve(ref.providerKey as ProviderKey);
            if (!connector || !ref.externalId) continue;

            await syncMenuFromConnector(connector, ref.externalId, ref.restaurantId);

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
    } catch (err: unknown) {
        job.status = 'failed' as SyncJobStatus;
        job.errorMessage = err instanceof Error ? err.message : String(err);
        job.finishedAt = new Date();
        await jobRepo.save(job);
        return toResult(job);
    }
}

// ── Import sync pipeline ────────────────────────────────────

export interface ImportSyncRestaurantResult {
    name: string;
    success: boolean;
    error?: string;
}

export interface ImportSyncResult extends SyncResult {
    restaurants: ImportSyncRestaurantResult[];
}

/**
 * Run the import pipeline through the unified sync infrastructure.
 *
 * 1. Load the payload into the {@link ImportConnector}
 * 2. Create a SyncJob (providerKey = IMPORT)
 * 3. For each restaurant: create/update in DB, ensure IMPORT provider ref,
 *    then use `connector.fetchMenu()` → menu upsert pipeline
 * 4. Return per-restaurant results and SyncJob summary
 */
export async function runImportSync(payload: ImportPayload): Promise<ImportSyncResult> {
    const jobRepo = AppDataSource.getRepository(SyncJob);

    // Load payload into the ImportConnector
    ImportConnector.loadPayload(payload);

    // Create job record
    const job = jobRepo.create({
        providerKey: ProviderKey.IMPORT,
        status: 'in_progress' as SyncJobStatus,
        startedAt: new Date(),
    });
    await jobRepo.save(job);

    const results: ImportSyncRestaurantResult[] = [];
    let synced = 0;

    try {
        for (const incoming of payload.restaurants) {
            try {
                // Create or update restaurant
                const existingRestaurants = await restaurantService.listRestaurants({});
                const existing = existingRestaurants.find(
                    (r) => r.name.toLowerCase() === incoming.name.toLowerCase(),
                );

                let restaurantId: string;

                if (existing) {
                    await restaurantService.updateRestaurant(existing.id, {
                        addressLine1: incoming.addressLine1,
                        addressLine2: incoming.addressLine2 ?? null,
                        city: incoming.city,
                        postalCode: incoming.postalCode,
                        country: incoming.country ?? '',
                        isActive: true,
                    });
                    restaurantId = existing.id;
                } else {
                    const created = await restaurantService.createRestaurant({
                        name: incoming.name,
                        addressLine1: incoming.addressLine1,
                        addressLine2: incoming.addressLine2 ?? null,
                        city: incoming.city,
                        postalCode: incoming.postalCode,
                        country: incoming.country ?? '',
                    });
                    restaurantId = created.id;
                }

                // Upsert explicit provider refs from import data
                if (incoming.providerRefs && incoming.providerRefs.length > 0) {
                    const existingRefs = await providerRefService.listByRestaurant(restaurantId);
                    const existingRefByKey = new Map(
                        existingRefs.map((r) => [r.providerKey.toLowerCase(), r]),
                    );

                    for (const ref of incoming.providerRefs) {
                        if (!existingRefByKey.has(ref.providerKey.toLowerCase())) {
                            await providerRefService.addProviderRef({
                                restaurantId,
                                providerKey: ref.providerKey,
                                externalId: ref.externalId ?? null,
                                url: ref.url,
                            });
                        }
                    }
                }

                // Ensure IMPORT provider ref exists
                const allRefs = await providerRefService.listByRestaurant(restaurantId);
                const hasImportRef = allRefs.some(
                    (r) => r.providerKey === ProviderKey.IMPORT,
                );
                if (!hasImportRef) {
                    await providerRefService.addProviderRef({
                        restaurantId,
                        providerKey: ProviderKey.IMPORT,
                        externalId: incoming.name,
                        url: `import://${restaurantId}`,
                    });
                }

                // Sync menu via the connector's fetchMenu → unified upsert pipeline
                await syncMenuFromConnector(ImportConnector, incoming.name, restaurantId);

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
    } catch (err: unknown) {
        job.status = 'failed' as SyncJobStatus;
        job.errorMessage = err instanceof Error ? err.message : String(err);
        job.finishedAt = new Date();
        await jobRepo.save(job);
        return {...toResult(job), restaurants: results};
    } finally {
        ImportConnector.clearPayload();
    }
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Shared menu sync logic used by both `runSync` and `runImportSync`.
 * Fetches the menu from the connector, upserts categories/items,
 * and recomputes diet inference.
 */
async function syncMenuFromConnector(
    connector: DeliveryProviderConnector,
    externalId: string,
    restaurantId: string,
): Promise<void> {
    const menu = await connector.fetchMenu(externalId);

    // Upsert categories
    const cats = await menuService.upsertCategories(
        restaurantId,
        menu.categories.map((c, idx) => ({name: c.name, sortOrder: idx})),
    );

    // Upsert items per category
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

    // Recompute diet inference
    await dietInferenceService.recomputeAfterMenuChange(restaurantId);
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
