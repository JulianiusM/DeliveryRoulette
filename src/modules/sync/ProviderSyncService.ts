import {AppDataSource} from '../database/dataSource';
import {SyncJob, SyncJobStatus} from '../database/entities/sync/SyncJob';
import {RestaurantProviderRef} from '../database/entities/restaurant/RestaurantProviderRef';
import {DietManualOverride} from '../database/entities/diet/DietManualOverride';
import * as restaurantService from '../database/services/RestaurantService';
import * as menuService from '../database/services/MenuService';
import * as providerRefService from '../database/services/RestaurantProviderRefService';
import * as dietInferenceService from '../database/services/DietInferenceService';
import * as cuisineInferenceService from '../database/services/CuisineInferenceService';
import * as syncAlertService from '../database/services/SyncAlertService';
import * as providerFetchCache from '../providers/ProviderFetchCacheService';
import * as ConnectorRegistry from '../../providers/ConnectorRegistry';
import {ProviderKey} from '../../providers';
import {DeliveryProviderConnector} from '../../providers';
import settings from '../settings';

/**
 * Unified provider sync pipeline.
 *
 * Every connector follows the same flow:
 *   1. listRestaurants() - discover available restaurants
 *   2. Upsert each restaurant and its provider refs
 *   3. fetchMenu() - fetch menu data per restaurant
 *   4. Upsert categories / items and recompute diet inference
 *
 * In addition to direct/synchronous runs, this module supports a
 * queued mode (pending -> in_progress -> completed/failed) so HTTP
 * endpoints can return immediately while work continues in background.
 */

// Keep import referenced for future cache wiring in sync pipeline.
void providerFetchCache;
void settings;

let queueWorkerRunning = false;

// -- Lock helpers -----------------------------------------------------

/**
 * Return true when another sync job is already running.
 */
export async function isLocked(): Promise<boolean> {
    const repo = AppDataSource.getRepository(SyncJob);
    const running = await repo.findOne({where: {status: 'in_progress' as SyncJobStatus}});
    return running !== null;
}

/**
 * Atomically acquire the sync lock by inserting a new in_progress job.
 * Returns the created job or null if another job is already in progress.
 */
async function acquireSyncLock(
    providerKey: string | null,
    syncQuery: string | null,
): Promise<SyncJob | null> {
    return AppDataSource.transaction(async (manager) => {
        const txRepo = manager.getRepository(SyncJob);
        const running = await txRepo.findOne({where: {status: 'in_progress' as SyncJobStatus}});
        if (running) return null;

        const job = txRepo.create({
            providerKey,
            syncQuery,
            status: 'in_progress' as SyncJobStatus,
            startedAt: new Date(),
        });
        return await txRepo.save(job);
    });
}

async function claimPendingJob(): Promise<SyncJob | null> {
    return AppDataSource.transaction(async (manager) => {
        const txRepo = manager.getRepository(SyncJob);
        const running = await txRepo.findOne({where: {status: 'in_progress' as SyncJobStatus}});
        if (running) return null;

        const pending = await txRepo.findOne({
            where: {status: 'pending' as SyncJobStatus},
            order: {createdAt: 'ASC'},
        });
        if (!pending) return null;

        pending.status = 'in_progress';
        pending.startedAt = new Date();
        pending.finishedAt = null;
        pending.errorMessage = null;
        pending.restaurantsSynced = 0;
        return await txRepo.save(pending);
    });
}

// -- Result types -----------------------------------------------------

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

export interface QueuedSyncJob {
    jobId: string;
    status: SyncJobStatus;
    providerKey?: string | null;
    syncQuery?: string | null;
    createdAt: Date;
}

export interface SyncJobListOptions {
    status?: SyncJobStatus | 'all';
    providerKey?: string;
    limit?: number;
}

/** Options for runSync(). */
export interface RunSyncOptions {
    /**
     * Restrict to a single provider key.
     * Resolves the connector from the registry.
     * Omit to sync all registered connectors.
     */
    providerKey?: ProviderKey;

    /**
     * Provide a connector instance directly (e.g. for imports).
     * When set, only this connector is synced.
     */
    connector?: DeliveryProviderConnector;

    /**
     * Query string passed to listRestaurants().
     * For URL-based connectors, this is the listing/import URL.
     */
    query?: string;
}

export interface QueueSyncOptions {
    providerKey?: ProviderKey;
    query?: string;
}

interface MenuRefSyncQuery {
    restaurantId: string;
    providerRefId: string;
}

const MENU_REF_QUERY_PREFIX = 'menu-ref:';

interface ImportUrlSyncQuery {
    menuUrl: string;
}

const IMPORT_URL_QUERY_PREFIX = 'import-url:';

// -- Queue API --------------------------------------------------------

/**
 * Queue a sync job and return immediately.
 * The background worker will process queued jobs sequentially.
 */
export async function queueSync(options: QueueSyncOptions = {}): Promise<QueuedSyncJob> {
    const repo = AppDataSource.getRepository(SyncJob);
    const job = repo.create({
        providerKey: options.providerKey ?? null,
        syncQuery: options.query?.trim() || null,
        status: 'pending',
    });
    const saved = await repo.save(job);

    startSyncQueueWorker();
    return toQueuedJob(saved);
}

/**
 * Queue a targeted menu sync for one existing restaurant/provider reference.
 * The worker runs this as a menu-only sync (no listing discovery).
 */
export async function queueMenuSyncByProviderRef(
    restaurantId: string,
    providerRefId: string,
): Promise<QueuedSyncJob> {
    const ref = await providerRefService.getByIdForRestaurant(providerRefId, restaurantId);
    if (!ref) {
        throw new Error('Provider reference not found');
    }

    const providerKey = parseProviderKey(ref.providerKey);
    if (!providerKey) {
        throw new Error(`Unknown provider key for provider reference: ${ref.providerKey}`);
    }

    const repo = AppDataSource.getRepository(SyncJob);
    const job = repo.create({
        providerKey,
        syncQuery: encodeMenuRefSyncQuery({
            restaurantId,
            providerRefId,
        }),
        status: 'pending',
    });
    const saved = await repo.save(job);

    startSyncQueueWorker();
    return toQueuedJob(saved);
}

/**
 * Queue import of a single restaurant menu URL.
 * This bypasses listing discovery and imports one restaurant directly.
 */
export async function queueImportFromUrl(
    providerKey: ProviderKey,
    menuUrl: string,
): Promise<QueuedSyncJob> {
    const repo = AppDataSource.getRepository(SyncJob);
    const job = repo.create({
        providerKey,
        syncQuery: encodeImportUrlSyncQuery({
            menuUrl: menuUrl.trim(),
        }),
        status: 'pending',
    });
    const saved = await repo.save(job);

    startSyncQueueWorker();
    return toQueuedJob(saved);
}

/**
 * Start the queue worker (idempotent).
 * Safe to call from bootstrap and when enqueuing new jobs.
 */
export function startSyncQueueWorker(): void {
    if (queueWorkerRunning) return;
    queueWorkerRunning = true;
    void processQueue().finally(async () => {
        queueWorkerRunning = false;
        // If jobs were queued during shutdown window, continue processing.
        if (await hasPendingJobs()) {
            setTimeout(() => startSyncQueueWorker(), 1_000);
        }
    });
}

export async function listSyncJobs(options: SyncJobListOptions = {}): Promise<SyncJob[]> {
    const repo = AppDataSource.getRepository(SyncJob);
    const qb = repo.createQueryBuilder('job')
        .orderBy('job.created_at', 'DESC')
        .take(options.limit ?? 50);

    if (options.status && options.status !== 'all') {
        qb.andWhere('job.status = :status', {status: options.status});
    }

    if (options.providerKey) {
        qb.andWhere('job.provider_key = :providerKey', {providerKey: options.providerKey});
    }

    return await qb.getMany();
}

export async function getSyncJobById(id: string): Promise<SyncJob | null> {
    const repo = AppDataSource.getRepository(SyncJob);
    return await repo.findOne({where: {id}});
}

// -- Synchronous API --------------------------------------------------

/**
 * Run the unified sync pipeline immediately.
 *
 * Resolves one or more connectors, then for each:
 *   listRestaurants() -> upsert restaurant & refs -> fetchMenu() -> upsert menu
 */
export async function runSync(options: RunSyncOptions = {}): Promise<SyncResult> {
    const {providerKey, connector: directConnector, query: syncQuery} = options;
    const jobProviderKey = directConnector?.providerKey ?? providerKey ?? null;
    const normalizedQuery = syncQuery?.trim() || null;

    const jobRepo = AppDataSource.getRepository(SyncJob);
    const job = await acquireSyncLock(jobProviderKey, normalizedQuery);
    if (!job) {
        const blocked = jobRepo.create({
            providerKey: jobProviderKey,
            syncQuery: normalizedQuery,
            status: 'failed' as SyncJobStatus,
            errorMessage: 'Another sync is already in progress',
            startedAt: new Date(),
            finishedAt: new Date(),
        });
        const saved = await jobRepo.save(blocked);
        return {...toResult(saved), restaurants: []};
    }

    return await executeSyncJob(job, {providerKey, connector: directConnector, query: normalizedQuery ?? undefined});
}

// -- Queue worker internals ------------------------------------------

async function processQueue(): Promise<void> {
    for (;;) {
        const job = await claimPendingJob();
        if (!job) {
            return;
        }

        const parsedProviderKey = parseProviderKey(job.providerKey ?? null);
        if (job.providerKey && !parsedProviderKey) {
            const repo = AppDataSource.getRepository(SyncJob);
            job.status = 'failed';
            job.errorMessage = `Unknown provider key in queued job: ${job.providerKey}`;
            job.finishedAt = new Date();
            await repo.save(job);
            continue;
        }

        await executeSyncJob(job, {
            providerKey: parsedProviderKey ?? undefined,
            query: job.syncQuery ?? undefined,
        });
    }
}

async function hasPendingJobs(): Promise<boolean> {
    const repo = AppDataSource.getRepository(SyncJob);
    const pending = await repo.count({where: {status: 'pending'}});
    return pending > 0;
}

function parseProviderKey(value: string | null): ProviderKey | null {
    if (!value) return null;
    if (!Object.values(ProviderKey).includes(value as ProviderKey)) return null;
    return value as ProviderKey;
}

function encodeMenuRefSyncQuery(query: MenuRefSyncQuery): string {
    return `${MENU_REF_QUERY_PREFIX}${query.restaurantId}:${query.providerRefId}`;
}

function decodeMenuRefSyncQuery(query: string | null): MenuRefSyncQuery | null {
    if (!query || !query.startsWith(MENU_REF_QUERY_PREFIX)) {
        return null;
    }

    const raw = query.slice(MENU_REF_QUERY_PREFIX.length);
    const [restaurantId, providerRefId] = raw.split(':');
    if (!restaurantId || !providerRefId) {
        return null;
    }

    return {restaurantId, providerRefId};
}

function encodeImportUrlSyncQuery(query: ImportUrlSyncQuery): string {
    return `${IMPORT_URL_QUERY_PREFIX}${encodeURIComponent(query.menuUrl)}`;
}

function decodeImportUrlSyncQuery(query: string | null): ImportUrlSyncQuery | null {
    if (!query || !query.startsWith(IMPORT_URL_QUERY_PREFIX)) {
        return null;
    }

    const encoded = query.slice(IMPORT_URL_QUERY_PREFIX.length);
    if (!encoded) {
        return null;
    }

    try {
        return {menuUrl: decodeURIComponent(encoded)};
    } catch {
        return null;
    }
}

function toQueuedJob(job: SyncJob): QueuedSyncJob {
    return {
        jobId: job.id,
        status: job.status,
        providerKey: job.providerKey ?? null,
        syncQuery: job.syncQuery ?? null,
        createdAt: job.createdAt,
    };
}

// -- Core sync execution ---------------------------------------------

async function executeSyncJob(
    job: SyncJob,
    options: RunSyncOptions,
): Promise<SyncResult> {
    const {providerKey, connector: directConnector, query: syncQuery} = options;
    const jobRepo = AppDataSource.getRepository(SyncJob);

    try {
        const menuRefQuery = decodeMenuRefSyncQuery(syncQuery ?? null);
        if (menuRefQuery) {
            return await executeMenuRefSyncJob(job, menuRefQuery);
        }

        const importUrlQuery = decodeImportUrlSyncQuery(syncQuery ?? null);
        if (importUrlQuery) {
            return await executeImportUrlSyncJob(job, options, importUrlQuery);
        }

        const connectors = resolveConnectors(directConnector, providerKey);
        if (providerKey && connectors.length === 0) {
            throw new Error(`No connector registered for provider: ${providerKey}`);
        }

        const allResults: RestaurantSyncResult[] = [];
        let synced = 0;

        for (const conn of connectors) {
            const providerRestaurants = await conn.listRestaurants(syncQuery ?? '');
            const seenRestaurantIds = new Set<string>();

            for (const incoming of providerRestaurants) {
                try {
                    const restaurantId = await restaurantService.upsertFromProvider(incoming);
                    seenRestaurantIds.add(restaurantId);

                    await providerRefService.ensureProviderRef(
                        restaurantId,
                        conn.providerKey,
                        incoming.externalId,
                        incoming.url,
                    );

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

                    const preSyncInference = await dietInferenceService.getResultsByRestaurant(
                        restaurantId,
                        dietInferenceService.ENGINE_VERSION,
                    );
                    const preScores = new Map(preSyncInference.map((r) => [r.dietTagId, r.score]));

                    await syncMenuForRestaurant(conn, incoming.externalId, restaurantId, {
                        requireMenuItems: conn.providerKey !== ProviderKey.IMPORT,
                    });
                    await checkDietOverrideAlerts(restaurantId, conn.providerKey, preScores);
                    await updateLastSyncAt(restaurantId, conn.providerKey);

                    allResults.push({name: incoming.name, success: true});
                    synced++;
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Unknown error';
                    allResults.push({name: incoming.name, success: false, error: message});
                }
            }

            await detectStaleRestaurants(conn.providerKey, seenRestaurantIds);
        }

        job.status = 'completed';
        job.restaurantsSynced = synced;
        job.errorMessage = null;
        job.finishedAt = new Date();
        await jobRepo.save(job);
        return {...toResult(job), restaurants: allResults};
    } catch (err: unknown) {
        job.status = 'failed';
        job.errorMessage = err instanceof Error ? err.message : String(err);
        job.finishedAt = new Date();
        await jobRepo.save(job);
        return {...toResult(job), restaurants: []};
    }
}

// -- Helpers ----------------------------------------------------------

async function executeMenuRefSyncJob(
    job: SyncJob,
    query: MenuRefSyncQuery,
): Promise<SyncResult> {
    const jobRepo = AppDataSource.getRepository(SyncJob);

    const ref = await providerRefService.getByIdForRestaurant(query.providerRefId, query.restaurantId);
    if (!ref) {
        throw new Error('Provider reference not found for the selected restaurant');
    }

    const parsedProviderKey = parseProviderKey(ref.providerKey);
    if (!parsedProviderKey) {
        throw new Error(`Unknown provider key on provider reference: ${ref.providerKey}`);
    }

    const connector = ConnectorRegistry.resolve(parsedProviderKey);
    if (!connector) {
        throw new Error(`No connector registered for provider: ${parsedProviderKey}`);
    }

    const externalId = ref.externalId?.trim() || ref.url;
    if (!externalId) {
        throw new Error('Provider reference has neither external ID nor URL');
    }

    const preSyncInference = await dietInferenceService.getResultsByRestaurant(
        query.restaurantId,
        dietInferenceService.ENGINE_VERSION,
    );
    const preScores = new Map(preSyncInference.map((result) => [result.dietTagId, result.score]));

    await syncMenuForRestaurant(connector, externalId, query.restaurantId);
    await checkDietOverrideAlerts(query.restaurantId, parsedProviderKey, preScores);
    await updateLastSyncAt(query.restaurantId, parsedProviderKey);

    const restaurant = await restaurantService.getRestaurantById(query.restaurantId);

    job.status = 'completed';
    job.restaurantsSynced = 1;
    job.errorMessage = null;
    job.finishedAt = new Date();
    await jobRepo.save(job);

    return {
        ...toResult(job),
        restaurants: [{
            name: restaurant?.name ?? query.restaurantId,
            success: true,
        }],
    };
}

async function executeImportUrlSyncJob(
    job: SyncJob,
    options: RunSyncOptions,
    query: ImportUrlSyncQuery,
): Promise<SyncResult> {
    const jobRepo = AppDataSource.getRepository(SyncJob);
    const providerKey = options.providerKey;
    const directConnector = options.connector;

    const connectors = resolveConnectors(directConnector, providerKey);
    if (connectors.length === 0) {
        throw new Error('No connector registered for import-url job');
    }

    if (connectors.length > 1) {
        throw new Error('Import-url job requires exactly one connector');
    }

    const connector = connectors[0];
    const menuUrl = query.menuUrl.trim();
    if (!menuUrl) {
        throw new Error('Import URL is empty');
    }

    if (connector.validateImportUrl) {
        connector.validateImportUrl(menuUrl);
    }

    const menu = await connector.fetchMenu(menuUrl);
    const normalizedPreviewCategories = normalizeProviderMenuCategories(menu.categories);
    const previewItemCount = normalizedPreviewCategories.reduce((sum, category) => sum + category.items.length, 0);
    if (normalizedPreviewCategories.length === 0 || previewItemCount === 0) {
        throw new Error('Menu fetch returned no categories/items');
    }

    const inferredName = normalizeRestaurantName(menu.restaurantName, menuUrl);
    const externalId = deriveExternalId(menuUrl);

    const restaurantId = await restaurantService.upsertFromProvider({
        externalId,
        name: inferredName,
        url: menuUrl,
        address: menu.restaurantDetails?.address ?? null,
        addressLine2: menu.restaurantDetails?.addressLine2 ?? null,
        city: menu.restaurantDetails?.city ?? null,
        postalCode: menu.restaurantDetails?.postalCode ?? null,
        country: menu.restaurantDetails?.country ?? null,
        openingHours: menu.restaurantDetails?.openingHours ?? null,
        openingDays: menu.restaurantDetails?.openingDays ?? null,
    });

    await providerRefService.ensureProviderRef(
        restaurantId,
        connector.providerKey,
        externalId,
        menuUrl,
    );

    const preSyncInference = await dietInferenceService.getResultsByRestaurant(
        restaurantId,
        dietInferenceService.ENGINE_VERSION,
    );
    const preScores = new Map(preSyncInference.map((result) => [result.dietTagId, result.score]));

    await syncMenuForRestaurant(connector, menuUrl, restaurantId, {menu});
    await checkDietOverrideAlerts(restaurantId, connector.providerKey, preScores);
    await updateLastSyncAt(restaurantId, connector.providerKey);

    job.status = 'completed';
    job.restaurantsSynced = 1;
    job.errorMessage = null;
    job.finishedAt = new Date();
    await jobRepo.save(job);

    return {
        ...toResult(job),
        restaurants: [{
            name: inferredName,
            success: true,
        }],
    };
}

function resolveConnectors(
    directConnector?: DeliveryProviderConnector,
    providerKey?: ProviderKey,
): DeliveryProviderConnector[] {
    if (directConnector) return [directConnector];

    if (providerKey) {
        const c = ConnectorRegistry.resolve(providerKey);
        return c ? [c] : [];
    }

    return ConnectorRegistry.registeredKeys()
        .map((k) => ConnectorRegistry.resolve(k))
        .filter((c): c is DeliveryProviderConnector => c !== undefined);
}

function normalizeRestaurantName(
    restaurantName: string | null | undefined,
    menuUrl: string,
): string {
    const trimmed = restaurantName?.trim();
    if (trimmed) {
        return trimmed;
    }

    const externalId = deriveExternalId(menuUrl);
    return externalId
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase())
        .trim() || 'Imported Restaurant';
}

function deriveExternalId(menuUrl: string): string {
    const fromPath = menuUrl.match(/\/(?:menu|restaurant|chain)\/([^/?#]+)/i)?.[1];
    if (fromPath && fromPath.trim()) {
        return decodeURIComponent(fromPath.trim());
    }

    try {
        const parsed = new URL(menuUrl);
        const cleaned = `${parsed.hostname}${parsed.pathname}`.replace(/[^\w-]/g, '-');
        return cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 255) || 'imported-restaurant';
    } catch {
        const cleaned = menuUrl.replace(/[^\w-]/g, '-');
        return cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 255) || 'imported-restaurant';
    }
}

async function syncMenuForRestaurant(
    connector: DeliveryProviderConnector,
    externalId: string,
    restaurantId: string,
    options: {
        requireMenuItems?: boolean;
        menu?: {
            categories: Array<{
                name: string;
                items: Array<{
                    externalId: string;
                    name: string;
                    description?: string | null;
                    dietContext?: string | null;
                    allergens?: string[] | null;
                    price?: number | null;
                    currency?: string | null;
                }>;
            }>;
            restaurantDetails?: {
                address?: string | null;
                addressLine2?: string | null;
                city?: string | null;
                postalCode?: string | null;
                country?: string | null;
                openingHours?: string | null;
                openingDays?: string | null;
            };
        };
    } = {},
): Promise<{categoryCount: number; itemCount: number}> {
    const requireMenuItems = options.requireMenuItems !== false;
    const menu = options.menu ?? await connector.fetchMenu(externalId);
    const normalizedCategories = normalizeProviderMenuCategories(menu.categories);
    const itemCount = normalizedCategories.reduce((sum, category) => sum + category.items.length, 0);

    if (requireMenuItems && (normalizedCategories.length === 0 || itemCount === 0)) {
        throw new Error('Menu fetch returned no categories/items');
    }

    await applyRestaurantDetailsFromMenu(restaurantId, menu);

    const cats = await menuService.upsertCategories(
        restaurantId,
        normalizedCategories.map((c) => ({name: c.name, sortOrder: c.sortOrder})),
    );

    const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c]));
    for (const provCat of normalizedCategories) {
        const dbCat = catByName.get(provCat.name.toLowerCase());
        if (!dbCat) continue;

        await menuService.upsertItems(
            dbCat.id,
            provCat.items.map((i) => ({
                name: i.name,
                description: i.description ?? null,
                dietContext: i.dietContext ?? null,
                allergens: stringifyAllergens(i.allergens),
                price: i.price ?? null,
                currency: i.currency ?? null,
                sortOrder: i.sortOrder,
            })),
        );
    }

    await dietInferenceService.recomputeAfterMenuChange(restaurantId);
    await cuisineInferenceService.recomputeForRestaurant(restaurantId);
    return {
        categoryCount: normalizedCategories.length,
        itemCount,
    };
}

function normalizeProviderMenuCategories(
    categories: Array<{
        name: string;
        items: Array<{
            name: string;
            description?: string | null;
            dietContext?: string | null;
            allergens?: string[] | null;
            price?: number | null;
            currency?: string | null;
        }>;
    }>,
): Array<{
    name: string;
    sortOrder: number;
    items: Array<{
        name: string;
        description?: string | null;
        dietContext?: string | null;
        allergens?: string[] | null;
        price?: number | null;
        currency?: string | null;
        sortOrder: number;
    }>;
}> {
    const categoriesByKey = new Map<string, {
        name: string;
        sortOrder: number;
        itemsByKey: Map<string, {
            name: string;
            description?: string | null;
            dietContext?: string | null;
            allergens?: string[] | null;
            price?: number | null;
            currency?: string | null;
            sortOrder: number;
        }>;
    }>();

    categories.forEach((category, categoryIndex) => {
        const categoryName = category.name.trim();
        if (!categoryName) return;

        const categoryKey = categoryName.toLowerCase();
        let normalized = categoriesByKey.get(categoryKey);
        if (!normalized) {
            normalized = {
                name: categoryName,
                sortOrder: categoryIndex,
                itemsByKey: new Map(),
            };
            categoriesByKey.set(categoryKey, normalized);
        } else if (categoryIndex < normalized.sortOrder) {
            normalized.sortOrder = categoryIndex;
        }

        category.items.forEach((item, itemIndex) => {
            const itemName = item.name.trim();
            if (!itemName) return;

            const itemKey = itemName.toLowerCase();
            const existing = normalized.itemsByKey.get(itemKey);
            if (!existing) {
                normalized.itemsByKey.set(itemKey, {
                    name: itemName,
                    description: item.description ?? null,
                    dietContext: item.dietContext ?? null,
                    allergens: item.allergens ?? null,
                    price: item.price ?? null,
                    currency: item.currency ?? null,
                    sortOrder: itemIndex,
                });
                return;
            }

            existing.sortOrder = Math.min(existing.sortOrder, itemIndex);
            if (!existing.description && item.description) {
                existing.description = item.description;
            }
            if (!existing.dietContext && item.dietContext) {
                existing.dietContext = item.dietContext;
            }
            if ((!existing.allergens || existing.allergens.length === 0) && item.allergens && item.allergens.length > 0) {
                existing.allergens = item.allergens;
            }
            if (existing.price == null && item.price != null) {
                existing.price = item.price;
            }
            if (!existing.currency && item.currency) {
                existing.currency = item.currency;
            }
        });
    });

    return [...categoriesByKey.values()]
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .map((category) => ({
            name: category.name,
            sortOrder: category.sortOrder,
            items: [...category.itemsByKey.values()]
                .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
        }));
}

async function applyRestaurantDetailsFromMenu(
    restaurantId: string,
    menu: { restaurantDetails?: {
        address?: string | null;
        addressLine2?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: string | null;
        openingHours?: string | null;
        openingDays?: string | null;
    } },
): Promise<void> {
    const details = menu.restaurantDetails;
    if (!details) return;

    const patch: {
        addressLine1?: string;
        addressLine2?: string | null;
        city?: string;
        postalCode?: string;
        country?: string;
        openingHours?: string | null;
        openingDays?: string | null;
    } = {};

    if (details.address?.trim()) patch.addressLine1 = details.address.trim();
    if (details.addressLine2 !== undefined) patch.addressLine2 = details.addressLine2?.trim() || null;
    if (details.city?.trim()) patch.city = details.city.trim();
    if (details.postalCode?.trim()) patch.postalCode = details.postalCode.trim();
    if (details.country?.trim()) patch.country = details.country.trim();
    if (details.openingHours !== undefined) patch.openingHours = details.openingHours?.trim() || null;
    if (details.openingDays !== undefined) patch.openingDays = details.openingDays?.trim() || null;

    if (Object.keys(patch).length === 0) return;
    await restaurantService.updateRestaurant(restaurantId, patch);
}

function stringifyAllergens(allergens?: string[] | null): string | null {
    if (!allergens || allergens.length === 0) return null;
    const normalized = allergens
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    if (normalized.length === 0) return null;
    return [...new Set(normalized)].join(', ');
}

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
