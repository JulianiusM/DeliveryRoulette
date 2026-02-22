import {AppDataSource} from '../database/dataSource';
import {SyncJob, SyncJobStatus} from '../database/entities/sync/SyncJob';
import {RestaurantProviderRef} from '../database/entities/restaurant/RestaurantProviderRef';
import * as menuService from '../database/services/MenuService';
import * as dietInferenceService from '../database/services/DietInferenceService';
import * as ConnectorRegistry from '../../providers/ConnectorRegistry';
import {ProviderKey} from '../../providers/ProviderKey';

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

            const menu = await connector.fetchMenu(ref.externalId);

            // Upsert categories
            const cats = await menuService.upsertCategories(
                ref.restaurantId,
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
            await dietInferenceService.recomputeAfterMenuChange(ref.restaurantId);

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

// ── Helpers ─────────────────────────────────────────────────

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
