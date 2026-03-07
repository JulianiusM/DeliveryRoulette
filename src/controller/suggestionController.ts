import * as suggestionService from "../modules/database/services/SuggestionService";
import * as suggestionHistoryService from "../modules/database/services/SuggestionHistoryService";
import * as userDietPrefService from "../modules/database/services/UserDietPreferenceService";
import * as userPrefService from "../modules/database/services/UserPreferenceService";
import * as userRestaurantPrefService from "../modules/database/services/UserRestaurantPreferenceService";
import {APIError} from "../modules/lib/errors";
import {
    SuggestionFavoriteMode,
    SuggestionFilters,
    SuggestionResult,
} from "../modules/database/services/SuggestionService";
import settings from "../modules/settings";
import {getOpeningHoursPresentation} from "../modules/lib/openingHours";

export interface SuggestionFormData {
    dietTags: Array<{id: string; key: string; label: string}>;
    selectedDietTagIds: string[];
    cuisineIncludes: string;
    cuisineExcludes: string;
    excludeAllergens: string;
    openOnly: boolean;
    excludeRecentlySuggested: boolean;
    respectDoNotSuggest: boolean;
    minDietScore: number;
    favoriteMode: SuggestionFavoriteMode;
    recentSuggestionCount: number;
    deliveryArea: string;
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
        openingStatus: {
            state: 'open' | 'closed' | 'unknown';
            summaryLabel: string;
            detailLabel: string;
            relativeLabel?: string;
        };
    };
    reason: {
        matchedDiets: Array<{
            dietTagKey: string;
            dietTagLabel: string;
            supported: boolean | null;
            source: 'override' | 'inference' | 'none';
            score?: number | null;
            confidence?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
            meetsScoreThreshold?: boolean;
        }>;
        matchedCuisines: Array<{
            key: string;
            label: string;
            score: number;
            confidence: 'LOW' | 'MEDIUM' | 'HIGH';
            source: 'provider' | 'heuristic';
        }>;
        totalCandidates: number;
        filters: {
            minDietScore: number;
            favoriteMode: SuggestionFavoriteMode;
            openOnly: boolean;
            excludeRecentlySuggested: boolean;
            respectDoNotSuggest: boolean;
        };
    };
}

function parseCsvList(value?: string | null): string[] {
    if (!value || !value.trim()) return [];
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function parseBooleanLike(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (/^(1|true|yes|on)$/i.test(value)) return true;
        if (/^(0|false|no|off)$/i.test(value)) return false;
    }
    return fallback;
}

function normalizeFavoriteMode(value: unknown): SuggestionFavoriteMode {
    if (value === 'only' || value === 'ignore' || value === 'prefer') {
        return value;
    }

    const fallback = settings.value.suggestionDefaultFavoriteMode;
    if (fallback === 'only' || fallback === 'ignore' || fallback === 'prefer') {
        return fallback;
    }

    return 'prefer';
}

function normalizeMinDietScore(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) {
        return settings.value.suggestionDefaultMinDietScore;
    }

    return Math.max(0, Math.min(100, Math.round(numeric)));
}

export async function getSuggestionFormData(userId?: number): Promise<SuggestionFormData> {
    const allTags = await userDietPrefService.getAllDietTags();
    let selectedDietTagIds: string[] = [];
    let cuisineIncludes = '';
    let cuisineExcludes = '';
    let deliveryArea = '';

    if (userId) {
        selectedDietTagIds = await userDietPrefService.getEffectiveDietFilterIds(userId);
        const pref = await userPrefService.getByUserId(userId);
        if (pref) {
            cuisineIncludes = pref.cuisineIncludes || '';
            cuisineExcludes = pref.cuisineExcludes || '';
            deliveryArea = pref.deliveryArea || '';
        }
    }

    return {
        dietTags: allTags.map((tag) => ({id: tag.id, key: tag.key, label: tag.label})),
        selectedDietTagIds,
        cuisineIncludes,
        cuisineExcludes,
        excludeAllergens: '',
        openOnly: settings.value.suggestionDefaultOpenOnly,
        excludeRecentlySuggested: settings.value.suggestionDefaultExcludeRecent,
        respectDoNotSuggest: settings.value.suggestionDefaultRespectDoNotSuggest,
        minDietScore: settings.value.suggestionDefaultMinDietScore,
        favoriteMode: normalizeFavoriteMode(undefined),
        recentSuggestionCount: settings.value.suggestionExcludeRecentCount,
        deliveryArea,
    };
}

export async function processSuggestion(body: {
    dietTagIds?: string | string[];
    excludeAllergens?: string;
    cuisineIncludes?: string;
    cuisineExcludes?: string;
    openOnly?: boolean | string;
    excludeRecentlySuggested?: boolean | string;
    respectDoNotSuggest?: boolean | string;
    favoriteMode?: string;
    minDietScore?: number | string;
}, userId?: number | null): Promise<SuggestionResultData> {
    let dietTagIds: string[] = [];
    if (body.dietTagIds) {
        dietTagIds = Array.isArray(body.dietTagIds) ? body.dietTagIds : [body.dietTagIds];
    }
    dietTagIds = dietTagIds.filter(Boolean);

    const openOnly = parseBooleanLike(body.openOnly, settings.value.suggestionDefaultOpenOnly);
    const excludeRecentlySuggested = parseBooleanLike(
        body.excludeRecentlySuggested,
        settings.value.suggestionDefaultExcludeRecent,
    );
    const respectDoNotSuggest = parseBooleanLike(
        body.respectDoNotSuggest,
        settings.value.suggestionDefaultRespectDoNotSuggest,
    );
    const favoriteMode = normalizeFavoriteMode(body.favoriteMode);
    const minDietScore = normalizeMinDietScore(body.minDietScore);

    const excludeRestaurantIds = excludeRecentlySuggested
        ? await suggestionHistoryService.getRecentRestaurantIds(userId)
        : [];

    const doNotSuggestIds = userId && respectDoNotSuggest
        ? await userRestaurantPrefService.getDoNotSuggestRestaurantIds(userId)
        : [];

    const favoriteIds = userId
        ? await userRestaurantPrefService.getFavoriteRestaurantIds(userId)
        : [];

    const filters: SuggestionFilters = {
        dietTagIds,
        excludeAllergens: parseCsvList(body.excludeAllergens),
        cuisineIncludes: parseCsvList(body.cuisineIncludes),
        cuisineExcludes: parseCsvList(body.cuisineExcludes),
        excludeRestaurantIds,
        doNotSuggestIds,
        favoriteIds,
        favoriteMode,
        openOnly,
        minDietScore,
    };

    const result = await suggestionService.suggest(filters);

    if (!result) {
        throw new APIError(
            'No restaurants match your filters. Try adjusting your preferences.',
            {},
            404,
        );
    }

    await suggestionHistoryService.recordSuggestion(result.restaurant.id, userId);

    return formatResult(result, {
        minDietScore,
        favoriteMode,
        openOnly,
        excludeRecentlySuggested,
        respectDoNotSuggest,
    });
}

function formatResult(
    result: SuggestionResult,
    filters: SuggestionResultData['reason']['filters'],
): SuggestionResultData {
    const r = result.restaurant;
    const matchedCuisines = result.reason.matchedCuisines ?? [];
    const openingStatus = getOpeningHoursPresentation(r.openingHours).status;

    return {
        restaurant: {
            id: r.id,
            name: r.name,
            addressLine1: r.addressLine1,
            addressLine2: r.addressLine2,
            city: r.city,
            postalCode: r.postalCode,
            country: r.country,
            openingStatus: {
                state: openingStatus.state,
                summaryLabel: openingStatus.summaryLabel,
                detailLabel: openingStatus.detailLabel,
                relativeLabel: openingStatus.relativeLabel,
            },
        },
        reason: {
            matchedDiets: result.reason.matchedDiets.map((diet) => ({
                dietTagKey: diet.dietTagKey,
                dietTagLabel: diet.dietTagLabel,
                supported: diet.supported,
                source: diet.source,
                score: diet.score ?? null,
                confidence: diet.confidence ?? null,
                meetsScoreThreshold: diet.meetsScoreThreshold,
            })),
            matchedCuisines: matchedCuisines.map((entry) => ({
                key: entry.key,
                label: entry.label,
                score: entry.score,
                confidence: entry.confidence,
                source: entry.source,
            })),
            totalCandidates: result.reason.totalCandidates,
            filters,
        },
    };
}
