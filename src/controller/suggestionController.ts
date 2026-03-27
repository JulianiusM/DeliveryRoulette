import * as suggestionService from "../modules/database/services/SuggestionService";
import * as suggestionHistoryService from "../modules/database/services/SuggestionHistoryService";
import * as userDietPrefService from "../modules/database/services/UserDietPreferenceService";
import * as userPrefService from "../modules/database/services/UserPreferenceService";
import * as userLocationService from "../modules/database/services/UserLocationService";
import * as userRestaurantPrefService from "../modules/database/services/UserRestaurantPreferenceService";
import * as userLocationImportService from "../modules/sync/UserLocationImportService";
import {APIError} from "../modules/lib/errors";
import {
    SuggestionFavoriteMode,
    SuggestionFilters,
    SuggestionNoMatchDiagnostics,
    SuggestionResult,
} from "../modules/database/services/SuggestionService";
import settings from "../modules/settings";
import {getOpeningHoursPresentation} from "../modules/lib/openingHours";
import {ProviderServiceType} from "../providers/ProviderTypes";

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
    serviceType: ProviderServiceType;
    locationRequired: boolean;
    savedLocations: Array<{
        id: string;
        label: string;
        addressLine1?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: string | null;
        isDefault: boolean;
        hasCoordinates: boolean;
    }>;
    activeLocation?: {
        id: string;
        label: string;
        addressLine1?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: string | null;
        isDefault?: boolean;
        hasCoordinates?: boolean;
    } | null;
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
    let activeLocation: SuggestionFormData['activeLocation'] = null;
    let savedLocations: SuggestionFormData['savedLocations'] = [];

    if (userId) {
        selectedDietTagIds = await userDietPrefService.getEffectiveDietFilterIds(userId);
        const pref = await userPrefService.getByUserId(userId);
        if (pref) {
            cuisineIncludes = pref.cuisineIncludes || '';
            cuisineExcludes = pref.cuisineExcludes || '';
            deliveryArea = pref.deliveryArea || '';
        }
        const location = await userLocationService.getOrBackfillDefaultFromDeliveryArea(
            userId,
            pref?.deliveryArea ?? null,
        );
        if (location) {
            activeLocation = {
                id: location.id,
                label: location.label,
                addressLine1: location.addressLine1 ?? null,
                city: location.city ?? null,
                postalCode: location.postalCode ?? null,
                country: location.country ?? null,
                isDefault: Boolean(location.isDefault),
                hasCoordinates: Number.isFinite(location.latitude) && Number.isFinite(location.longitude),
            };
        }
        savedLocations = (await userLocationService.listByUserId(userId)).map((location) => ({
            id: location.id,
            label: location.label,
            addressLine1: location.addressLine1 ?? null,
            city: location.city ?? null,
            postalCode: location.postalCode ?? null,
            country: location.country ?? null,
            isDefault: Boolean(location.isDefault),
            hasCoordinates: Number.isFinite(location.latitude) && Number.isFinite(location.longitude),
        }));
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
        serviceType: 'delivery',
        locationRequired: true,
        savedLocations,
        activeLocation,
    };
}

export async function processSuggestion(body: {
    dietTagIds?: string | string[];
    excludeAllergens?: string;
    cuisineIncludes?: string;
    cuisineExcludes?: string;
    locationId?: string;
    serviceType?: string;
    openOnly?: boolean | string;
    excludeRecentlySuggested?: boolean | string;
    respectDoNotSuggest?: boolean | string;
    favoriteMode?: string;
    minDietScore?: number | string;
}, userId?: number | null): Promise<SuggestionResultData> {
    if (!userId) {
        throw new APIError(
            'Location-aware suggestions require a saved user location. Sign in and configure a default location first.',
            {},
            400,
        );
    }

    let dietTagIds: string[] = [];
    if (body.dietTagIds) {
        dietTagIds = Array.isArray(body.dietTagIds) ? body.dietTagIds : [body.dietTagIds];
    }
    dietTagIds = dietTagIds.filter(Boolean);

    const preference = await userPrefService.getByUserId(userId);
    const requestedLocationId = typeof body.locationId === 'string' ? body.locationId.trim() : '';
    const activeLocation = requestedLocationId
        ? await userLocationService.getByIdForUser(userId, requestedLocationId)
        : await userLocationService.getOrBackfillDefaultFromDeliveryArea(
            userId,
            preference?.deliveryArea ?? null,
        );
    if (requestedLocationId && !activeLocation) {
        throw new APIError(
            'The selected saved location was not found.',
            {},
            404,
        );
    }
    if (!activeLocation) {
        throw new APIError(
            'No saved delivery location is configured. Save a default location before requesting suggestions.',
            {},
            400,
        );
    }

    const serviceType: ProviderServiceType = body.serviceType === 'collection'
        ? 'collection'
        : 'delivery';

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
        locationId: activeLocation.id,
        serviceType,
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
        let diagnostics = await suggestionService.diagnoseNoMatch(filters);
        const liveFallbackResult = diagnostics.blockingStage === 'location'
            ? await resolveLiveLocationFallback(userId, activeLocation.id, activeLocation.label, filters)
            : null;

        if (liveFallbackResult?.result) {
            await suggestionHistoryService.recordSuggestion(liveFallbackResult.result.restaurant.id, userId);
            await userLocationService.touchLocation(activeLocation.id);

            return formatResult(liveFallbackResult.result, {
                minDietScore,
                favoriteMode,
                openOnly,
                excludeRecentlySuggested,
                respectDoNotSuggest,
            });
        }

        if (liveFallbackResult?.diagnostics) {
            diagnostics = liveFallbackResult.diagnostics;
        }

        await enhanceLocationNoMatchDiagnostics(userId, activeLocation.id, activeLocation.label, diagnostics);
        throw new APIError(
            diagnostics.summary,
            {suggestionDiagnostics: diagnostics},
            404,
        );
    }

    await suggestionHistoryService.recordSuggestion(result.restaurant.id, userId);
    await userLocationService.touchLocation(activeLocation.id);

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

async function enhanceLocationNoMatchDiagnostics(
    userId: number,
    locationId: string,
    locationLabel: string,
    diagnostics: SuggestionNoMatchDiagnostics,
): Promise<void> {
    if (diagnostics.blockingStage !== 'location') {
        return;
    }

    const shouldQueueRefresh = diagnostics.counts.locationFreshSnapshots === 0
        || diagnostics.counts.locationLatestSnapshots === 0
        || diagnostics.counts.locationCoverageRestaurants === 0;
    if (!shouldQueueRefresh) {
        return;
    }

    const refreshResult = await userLocationImportService.queueSavedLocationRefreshes(userId, locationId);
    const refreshHints = buildQueuedLocationRefreshHints(refreshResult, locationLabel);
    if (refreshHints.length === 0) {
        return;
    }

    diagnostics.hints = [...refreshHints, ...diagnostics.hints];
}

async function resolveLiveLocationFallback(
    userId: number,
    locationId: string,
    locationLabel: string,
    filters: SuggestionFilters,
): Promise<{
    result?: SuggestionResult;
    diagnostics?: SuggestionNoMatchDiagnostics;
} | null> {
    let liveCandidateResult: userLocationImportService.LiveLocationCandidateResult;
    try {
        liveCandidateResult = await userLocationImportService.resolveLiveRestaurantCandidates(
            userId,
            locationId,
            filters.serviceType ?? 'delivery',
        );
    } catch (err) {
        const diagnostics = await suggestionService.diagnoseNoMatch(filters);
        diagnostics.hints = [
            `Live provider lookup failed while checking ${locationLabel}: ${err instanceof Error ? err.message : 'Unknown error'}`,
            ...diagnostics.hints,
        ];
        return {diagnostics};
    }

    if (liveCandidateResult.restaurantIds.length > 0) {
        const liveFilters: SuggestionFilters = {
            ...filters,
            candidateRestaurantIds: liveCandidateResult.restaurantIds,
        };
        const liveSuggestion = await suggestionService.suggest(liveFilters);
        if (liveSuggestion) {
            return {result: liveSuggestion};
        }

        const diagnostics = await suggestionService.diagnoseNoMatch(liveFilters);
        diagnostics.hints = [
            ...buildLiveLocationLookupHints(liveCandidateResult, locationLabel),
            ...diagnostics.hints,
        ];
        return {diagnostics};
    }

    const diagnostics = await suggestionService.diagnoseNoMatch(filters);
    diagnostics.hints = [
        ...buildLiveLocationLookupHints(liveCandidateResult, locationLabel),
        ...diagnostics.hints,
    ];
    return {diagnostics};
}

function buildQueuedLocationRefreshHints(
    refreshResult: userLocationImportService.QueuedLocationImportResult,
    locationLabel: string,
): string[] {
    const hints: string[] = [];

    if (refreshResult.queuedJobs.length > 0) {
        hints.push(
            `A background location import was queued for ${locationLabel}. Try again after the import finishes.`,
        );
    }

    if (refreshResult.issues.length > 0) {
        hints.push(
            `Automatic refresh could not be queued for all providers: ${refreshResult.issues.map((issue) => `${issue.providerKey} (${issue.reason})`).join('; ')}`,
        );
    }

    if (refreshResult.queuedJobs.length === 0 && refreshResult.issues.length === 0) {
        hints.push(
            'No location import source is configured for your account yet. Open Location Imports and run a listing import for this saved location.',
        );
    }

    return hints;
}

function buildLiveLocationLookupHints(
    liveCandidateResult: userLocationImportService.LiveLocationCandidateResult,
    locationLabel: string,
): string[] {
    const hints: string[] = [];

    if (liveCandidateResult.sourceConfigCount === 0) {
        hints.push(
            'No enabled Location Imports source is configured yet. Add at least one provider listing URL so DeliveryRoulette can check your saved location live.',
        );
        return hints;
    }

    if (liveCandidateResult.matchedRestaurantCount > 0) {
        hints.push(
            `Live provider lookup matched ${liveCandidateResult.matchedRestaurantCount} existing restaurant${liveCandidateResult.matchedRestaurantCount === 1 ? '' : 's'} for ${locationLabel}. Any remaining failure is caused by later filters, not by missing location snapshots alone.`,
        );
    }

    if (liveCandidateResult.queuedImportJobs.length > 0) {
        hints.push(
            `Queued ${liveCandidateResult.queuedImportJobs.length} restaurant import job${liveCandidateResult.queuedImportJobs.length === 1 ? '' : 's'} for places the provider returned live at ${locationLabel} but that are not in the database yet.`,
        );
    }

    if (
        liveCandidateResult.liveRestaurantCount === 0
        && liveCandidateResult.queuedImportJobs.length === 0
        && liveCandidateResult.issues.length === 0
    ) {
        hints.push(
            `Configured Location Imports sources did not return any restaurants for ${locationLabel} during live lookup.`,
        );
    }

    if (liveCandidateResult.issues.length > 0) {
        hints.push(
            `Live provider lookup could not be completed for all sources: ${liveCandidateResult.issues.map((issue) => `${issue.providerKey} (${issue.reason})`).join('; ')}`,
        );
    }

    return hints;
}
