import * as suggestionService from "../modules/database/services/SuggestionService";
import * as userDietPrefService from "../modules/database/services/UserDietPreferenceService";
import * as userPrefService from "../modules/database/services/UserPreferenceService";
import {ExpectedError} from "../modules/lib/errors";
import {SuggestionFilters, SuggestionResult} from "../modules/database/services/SuggestionService";

// ── Types ───────────────────────────────────────────────────

export interface SuggestionFormData {
    dietTags: Array<{id: string; key: string; label: string}>;
    selectedDietTagIds: string[];
    cuisineIncludes: string;
    cuisineExcludes: string;
}

export interface SuggestionResultData {
    restaurant: {
        id: string;
        name: string;
        addressLine1: string;
        addressLine2?: string | null;
        city: string;
        postalCode: string;
        country: string;
    };
    reason: {
        matchedDiets: Array<{
            dietTagKey: string;
            dietTagLabel: string;
            supported: boolean | null;
            source: 'override' | 'inference' | 'none';
        }>;
        totalCandidates: number;
    };
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Parse comma-separated string into trimmed non-empty array.
 */
function parseCsvList(value?: string | null): string[] {
    if (!value || !value.trim()) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean);
}

// ── Form data ───────────────────────────────────────────────

/**
 * Get form data for the suggestion page.
 * Pre-populates with user's diet preferences and cuisine filters.
 */
export async function getSuggestionFormData(userId?: number): Promise<SuggestionFormData> {
    const allTags = await userDietPrefService.getAllDietTags();
    let selectedDietTagIds: string[] = [];
    let cuisineIncludes = '';
    let cuisineExcludes = '';

    if (userId) {
        selectedDietTagIds = await userDietPrefService.getEffectiveDietFilterIds(userId);
        const pref = await userPrefService.getByUserId(userId);
        if (pref) {
            cuisineIncludes = pref.cuisineIncludes || '';
            cuisineExcludes = pref.cuisineExcludes || '';
        }
    }

    return {
        dietTags: allTags.map(t => ({id: t.id, key: t.key, label: t.label})),
        selectedDietTagIds,
        cuisineIncludes,
        cuisineExcludes,
    };
}

// ── Suggest ─────────────────────────────────────────────────

/**
 * Process a suggestion request from form data.
 * Returns the suggestion result or throws if no match found.
 */
export async function processSuggestion(body: {
    dietTagIds?: string | string[];
    cuisineIncludes?: string;
    cuisineExcludes?: string;
}): Promise<SuggestionResultData> {
    // Normalize dietTagIds to array
    let dietTagIds: string[] = [];
    if (body.dietTagIds) {
        dietTagIds = Array.isArray(body.dietTagIds) ? body.dietTagIds : [body.dietTagIds];
    }
    dietTagIds = dietTagIds.filter(Boolean);

    const filters: SuggestionFilters = {
        dietTagIds,
        cuisineIncludes: parseCsvList(body.cuisineIncludes),
        cuisineExcludes: parseCsvList(body.cuisineExcludes),
    };

    const result = await suggestionService.suggest(filters);

    if (!result) {
        throw new ExpectedError(
            'No restaurants match your filters. Try adjusting your preferences.',
            'info',
            404,
        );
    }

    return formatResult(result);
}

/**
 * Format a SuggestionResult into the view-friendly result data.
 */
function formatResult(result: SuggestionResult): SuggestionResultData {
    const r = result.restaurant;
    return {
        restaurant: {
            id: r.id,
            name: r.name,
            addressLine1: r.addressLine1,
            addressLine2: r.addressLine2,
            city: r.city,
            postalCode: r.postalCode,
            country: r.country,
        },
        reason: {
            matchedDiets: result.reason.matchedDiets.map(d => ({
                dietTagKey: d.dietTagKey,
                dietTagLabel: d.dietTagLabel,
                supported: d.supported,
                source: d.source,
            })),
            totalCandidates: result.reason.totalCandidates,
        },
    };
}
