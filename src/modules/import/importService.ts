import {
    ImportPayload,
    ImportRestaurant,
    validateImportPayload,
    ImportValidationResult,
} from './importSchema';
import * as restaurantService from '../database/services/RestaurantService';
import * as menuService from '../database/services/MenuService';
import * as providerRefService from '../database/services/RestaurantProviderRefService';
import {Restaurant} from '../database/entities/restaurant/Restaurant';

// ── Diff types ──────────────────────────────────────────────

export type ChangeAction = 'new' | 'updated' | 'unchanged';

export interface FieldChange {
    field: string;
    oldValue: string | null | undefined;
    newValue: string | null | undefined;
}

export interface CategoryDiff {
    name: string;
    action: ChangeAction;
    itemCount: number;
}

export interface ProviderRefDiff {
    providerKey: string;
    url: string;
    action: ChangeAction;
}

export interface RestaurantDiff {
    name: string;
    action: ChangeAction;
    fieldChanges: FieldChange[];
    categories: CategoryDiff[];
    providerRefs: ProviderRefDiff[];
    dietTags: string[];
}

export interface ImportDiff {
    restaurants: RestaurantDiff[];
    totalNew: number;
    totalUpdated: number;
    totalUnchanged: number;
}

// ── Apply result types ──────────────────────────────────────

export interface RestaurantApplyResult {
    name: string;
    action: ChangeAction;
    success: boolean;
    error?: string;
}

export interface ImportApplyResult {
    restaurants: RestaurantApplyResult[];
    successCount: number;
    errorCount: number;
    jobId?: string;
}

// ── Parse ───────────────────────────────────────────────────

/**
 * Parse and validate raw JSON input using the import schema.
 */
export function parseAndValidate(input: unknown): ImportValidationResult {
    return validateImportPayload(input);
}

// ── Diff ────────────────────────────────────────────────────

/**
 * Compare an import restaurant against an existing DB restaurant.
 * Returns field-level changes for the core restaurant fields.
 */
function diffRestaurantFields(incoming: ImportRestaurant, existing: Restaurant): FieldChange[] {
    const changes: FieldChange[] = [];

    const fields: Array<{field: string; importVal: string | null | undefined; dbVal: string | null | undefined}> = [
        {field: 'addressLine1', importVal: incoming.addressLine1, dbVal: existing.addressLine1},
        {field: 'addressLine2', importVal: incoming.addressLine2 ?? null, dbVal: existing.addressLine2 ?? null},
        {field: 'city', importVal: incoming.city, dbVal: existing.city},
        {field: 'postalCode', importVal: incoming.postalCode, dbVal: existing.postalCode},
        {field: 'country', importVal: incoming.country ?? '', dbVal: existing.country ?? ''},
    ];

    for (const f of fields) {
        if ((f.importVal ?? '') !== (f.dbVal ?? '')) {
            changes.push({field: f.field, oldValue: f.dbVal, newValue: f.importVal});
        }
    }

    return changes;
}

/**
 * Compute a diff between the import payload and the existing database state.
 */
export async function computeDiff(payload: ImportPayload): Promise<ImportDiff> {
    const existingRestaurants = await restaurantService.listRestaurants({});
    const existingByName = new Map(
        existingRestaurants.map((r) => [r.name.toLowerCase(), r]),
    );

    const restaurants: RestaurantDiff[] = [];
    let totalNew = 0;
    let totalUpdated = 0;
    let totalUnchanged = 0;

    for (const incoming of payload.restaurants) {
        const key = incoming.name.toLowerCase();
        const existing = existingByName.get(key);

        // Provider refs diff
        const providerRefs: ProviderRefDiff[] = (incoming.providerRefs ?? []).map((ref) => ({
            providerKey: ref.providerKey,
            url: ref.url,
            action: 'new' as ChangeAction,
        }));

        // Category diff
        const categories: CategoryDiff[] = (incoming.menuCategories ?? []).map((cat) => ({
            name: cat.name,
            action: 'new' as ChangeAction,
            itemCount: cat.items?.length ?? 0,
        }));

        if (!existing) {
            restaurants.push({
                name: incoming.name,
                action: 'new',
                fieldChanges: [],
                categories,
                providerRefs,
                dietTags: incoming.dietTags ?? [],
            });
            totalNew++;
        } else {
            const fieldChanges = diffRestaurantFields(incoming, existing);

            // Re-diff categories against existing
            const existingCategories = await menuService.listCategoriesByRestaurant(existing.id, true);
            const existingCatByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c]));
            const catDiffs: CategoryDiff[] = (incoming.menuCategories ?? []).map((cat) => {
                const existingCat = existingCatByName.get(cat.name.toLowerCase());
                return {
                    name: cat.name,
                    action: existingCat ? 'updated' as ChangeAction : 'new' as ChangeAction,
                    itemCount: cat.items?.length ?? 0,
                };
            });

            // Re-diff provider refs against existing
            const existingRefs = await providerRefService.listByRestaurant(existing.id);
            const existingRefByKey = new Map(existingRefs.map((r) => [r.providerKey.toLowerCase(), r]));
            const refDiffs: ProviderRefDiff[] = (incoming.providerRefs ?? []).map((ref) => {
                const existingRef = existingRefByKey.get(ref.providerKey.toLowerCase());
                return {
                    providerKey: ref.providerKey,
                    url: ref.url,
                    action: existingRef ? 'updated' as ChangeAction : 'new' as ChangeAction,
                };
            });

            const hasChanges = fieldChanges.length > 0 || catDiffs.some((c) => c.action === 'new') || refDiffs.some((r) => r.action === 'new');
            const action: ChangeAction = hasChanges ? 'updated' : 'unchanged';

            restaurants.push({
                name: incoming.name,
                action,
                fieldChanges,
                categories: catDiffs,
                providerRefs: refDiffs,
                dietTags: incoming.dietTags ?? [],
            });

            if (action === 'updated') totalUpdated++;
            else totalUnchanged++;
        }
    }

    return {restaurants, totalNew, totalUpdated, totalUnchanged};
}

// ── Apply ───────────────────────────────────────────────────

/**
 * Apply the entire import payload via the unified sync pipeline.
 *
 * Creates a fresh {@link ImportConnector} instance for this request
 * (no shared state — concurrent imports are fully isolated) and passes
 * it to the generic push-style sync pipeline.
 */
export async function applyImport(payload: ImportPayload): Promise<ImportApplyResult> {
    // Dynamic imports to avoid circular dependency
    const {ImportConnector} = await import('../../providers/ImportConnector');
    const {runSync} = await import('../sync/ProviderSyncService');
    type PushSyncResultType = import('../sync/ProviderSyncService').PushSyncResult;

    const connector = new ImportConnector(payload);
    const syncResult = await runSync({pushConnector: connector}) as PushSyncResultType;

    const restaurants: RestaurantApplyResult[] = syncResult.restaurants.map((r) => ({
        name: r.name,
        action: 'new' as ChangeAction,
        success: r.success,
        error: r.error,
    }));

    return {
        restaurants,
        successCount: restaurants.filter((r) => r.success).length,
        errorCount: restaurants.filter((r) => !r.success).length,
        jobId: syncResult.jobId,
    };
}
