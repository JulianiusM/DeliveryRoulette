import {AppDataSource} from '../database/dataSource';
import {SyncJob, SyncJobStatus} from '../database/entities/sync/SyncJob';
import {RestaurantProviderRef} from '../database/entities/restaurant/RestaurantProviderRef';
import {DietManualOverride} from '../database/entities/diet/DietManualOverride';
import * as restaurantService from '../database/services/RestaurantService';
import * as menuService from '../database/services/MenuService';
import * as providerRefService from '../database/services/RestaurantProviderRefService';
import * as dietInferenceService from '../database/services/DietInferenceService';
import * as syncAlertService from '../database/services/SyncAlertService';
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

    /**
     * Query string to pass to `listRestaurants()`.
     * For URL-based connectors, this is the listing URL.
     * Defaults to empty string.
     */
    query?: string;
}

/**
 * Run the unified sync pipeline.
 *
 * Resolves one or more connectors, then for each:
 *   `listRestaurants()` → upsert restaurant & refs → `fetchMenu()` → upsert menu
 */
export async function runSync(options: RunSyncOptions = {}): Promise<SyncResult> {
    const {providerKey, connector: directConnector, query: syncQuery} = options;
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
            // Discover restaurants from the connector
            const providerRestaurants = await conn.listRestaurants(syncQuery ?? '');

            // Track which restaurants the connector returned (for stale detection)
            const seenRestaurantIds = new Set<string>();

            for (const incoming of providerRestaurants) {
                try {
                    // Upsert restaurant via service layer
                    const restaurantId = await restaurantService.upsertFromProvider(incoming);
                    seenRestaurantIds.add(restaurantId);

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

                    // Capture pre-sync diet inference scores for override checks
                    const preSyncInference = await dietInferenceService.getResultsByRestaurant(
                        restaurantId, dietInferenceService.ENGINE_VERSION,
                    );
                    const preScores = new Map(preSyncInference.map((r) => [r.dietTagId, r.score]));

                    // Sync menu
                    await syncMenuForRestaurant(conn, incoming.externalId, restaurantId);

                    // Check if diet inference changed and there are manual overrides
                    await checkDietOverrideAlerts(restaurantId, conn.providerKey, preScores);

                    // Update lastSyncAt on the provider ref
                    await updateLastSyncAt(restaurantId, conn.providerKey);

                    allResults.push({name: incoming.name, success: true});
                    synced++;
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Unknown error';
                    allResults.push({name: incoming.name, success: false, error: message});
                }
            }

            // Detect restaurants that were previously synced but are now gone
            await detectStaleRestaurants(conn.providerKey, seenRestaurantIds);
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

/**
 * Detect restaurants that have active provider refs for a connector
 * but were NOT returned by that connector's `listRestaurants()`.
 * Marks the ref as `stale` and creates a `restaurant_gone` alert.
 */
async function detectStaleRestaurants(
    providerKey: string,
    seenRestaurantIds: Set<string>,
): Promise<void> {
    const refRepo = AppDataSource.getRepository(RestaurantProviderRef);
    const activeRefs = await refRepo.find({
        where: {providerKey, status: 'active'},
    });

    for (const ref of activeRefs) {
        if (!seenRestaurantIds.has(ref.restaurantId)) {
            ref.status = 'stale';
            ref.updatedAt = new Date();
            await refRepo.save(ref);

            const alreadyAlerted = await syncAlertService.hasActiveAlert(
                ref.restaurantId, providerKey, 'restaurant_gone',
            );
            if (!alreadyAlerted) {
                const restaurant = await restaurantService.getRestaurantById(ref.restaurantId);
                const name = restaurant?.name ?? ref.restaurantId;
                await syncAlertService.createAlert({
                    restaurantId: ref.restaurantId,
                    providerKey,
                    type: 'restaurant_gone',
                    message: `"${name}" was not returned by ${providerKey} and may have closed.`,
                });
            }
        }
    }
}

/**
 * After menu sync + diet recompute, check whether any diet inference
 * scores changed for a restaurant that has manual overrides.
 * If so, create a `diet_override_stale` alert so the user can review.
 */
async function checkDietOverrideAlerts(
    restaurantId: string,
    providerKey: string,
    preScores: Map<string, number>,
): Promise<void> {
    const overrideRepo = AppDataSource.getRepository(DietManualOverride);
    const overrides = await overrideRepo.find({where: {restaurantId}});
    if (overrides.length === 0) return;

    const postSyncInference = await dietInferenceService.getResultsByRestaurant(
        restaurantId, dietInferenceService.ENGINE_VERSION,
    );

    const changedTags: string[] = [];
    for (const result of postSyncInference) {
        const oldScore = preScores.get(result.dietTagId);
        if (oldScore !== undefined && oldScore !== result.score) {
            const hasOverride = overrides.some((o) => o.dietTagId === result.dietTagId);
            if (hasOverride) {
                changedTags.push(result.dietTagId);
            }
        }
    }

    if (changedTags.length > 0) {
        const alreadyAlerted = await syncAlertService.hasActiveAlert(
            restaurantId, providerKey, 'diet_override_stale',
        );
        if (!alreadyAlerted) {
            const restaurant = await restaurantService.getRestaurantById(restaurantId);
            const name = restaurant?.name ?? restaurantId;
            await syncAlertService.createAlert({
                restaurantId,
                providerKey,
                type: 'diet_override_stale',
                message: `Menu changes for "${name}" affected diet inference. ${changedTags.length} diet tag(s) with manual overrides may need review.`,
            });
        }
    }
}
