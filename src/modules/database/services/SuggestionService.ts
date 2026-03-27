import {AppDataSource} from '../dataSource';
import {Restaurant} from '../entities/restaurant/Restaurant';
import * as dietOverrideService from './DietOverrideService';
import * as restaurantAvailabilityService from './RestaurantAvailabilityService';
import {
    getRestaurantCuisineTokens,
    matchesCuisineFilter,
    parseCuisineInference,
} from './CuisineInferenceService';
import {normalizeText, getActiveMenuItems} from './DietInferenceService';
import {computeIsOpenNowFromOpeningHours} from '../../lib/openingHours';
import {ProviderServiceType} from '../../../providers/ProviderTypes';

export type SuggestionFavoriteMode = 'prefer' | 'only' | 'ignore';

// ── Types ───────────────────────────────────────────────────

export interface SuggestionFilters {
    /** Explicit restaurant IDs already resolved for the active location. */
    candidateRestaurantIds?: string[];
    /** Saved user location ID used to scope provider availability snapshots */
    locationId?: string;
    /** Delivery vs pickup availability filter. Defaults to delivery. */
    serviceType?: ProviderServiceType;
    /** Diet tag IDs the restaurant must support */
    dietTagIds?: string[];
    /** Allergen tokens to exclude — restaurants with items containing these allergens are deprioritized */
    excludeAllergens?: string[];
    /** Cuisine keywords to match against restaurant name (include) */
    cuisineIncludes?: string[];
    /** Cuisine keywords to match against restaurant name (exclude) */
    cuisineExcludes?: string[];
    /** Restaurant IDs to exclude (e.g. recently suggested) */
    excludeRestaurantIds?: string[];
    /** Restaurant IDs marked do-not-suggest by the user (hard exclude, no fallback) */
    doNotSuggestIds?: string[];
    /** Restaurant IDs marked as favorites (boosted in random selection) */
    favoriteIds?: string[];
    /** How favorites should influence the candidate pool */
    favoriteMode?: SuggestionFavoriteMode;
    /** When true, only suggest restaurants that are currently open */
    openOnly?: boolean;
    /** Minimum heuristic score required for inferred diet matches */
    minDietScore?: number;
}

export interface DietMatchDetail {
    dietTagId: string;
    dietTagKey: string;
    dietTagLabel: string;
    supported: boolean | null;
    source: 'override' | 'inference' | 'none';
    score?: number | null;
    confidence?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
    meetsScoreThreshold?: boolean;
}

export interface SuggestionReason {
    matchedDiets: DietMatchDetail[];
    matchedCuisines: Array<{
        key: string;
        label: string;
        score: number;
        confidence: 'LOW' | 'MEDIUM' | 'HIGH';
        source: 'provider' | 'heuristic';
    }>;
    totalCandidates: number;
}

export interface SuggestionResult {
    restaurant: Restaurant;
    reason: SuggestionReason;
}

export interface SuggestionNoMatchDiagnostics {
    blockingStage: 'empty' | 'location' | 'open' | 'cuisine' | 'allergen' | 'blocked' | 'favorites' | 'diet' | 'unknown';
    summary: string;
    hints: string[];
    counts: {
        activeRestaurants: number;
        locationRestaurants: number;
        alternateServiceRestaurants: number;
        locationProviderContexts: number;
        locationCoverageRestaurants: number;
        locationLatestSnapshots: number;
        locationFreshSnapshots: number;
        locationExpiredSnapshots: number;
        unavailableLocationRestaurants: number;
        openRestaurants: number;
        cuisineRestaurants: number;
        allergenRestaurants: number;
        allowedRestaurants: number;
        favoriteRestaurants: number;
        dietRestaurants: number;
    };
}

// ── Core logic ──────────────────────────────────────────────

/**
 * Find active restaurants matching optional cuisine name filters.
 */
export async function findActiveRestaurants(filters: SuggestionFilters): Promise<Restaurant[]> {
    const repo = AppDataSource.getRepository(Restaurant);
    const qb = repo.createQueryBuilder('r')
        .leftJoinAndSelect('r.providerCuisines', 'rc')
        .where('r.is_active = :active', {active: 1});

    if (filters.candidateRestaurantIds !== undefined) {
        const candidateRestaurantIds = [...new Set((filters.candidateRestaurantIds ?? []).filter(Boolean))];
        if (candidateRestaurantIds.length === 0) {
            return [];
        }
        qb.andWhere('r.id IN (:...candidateRestaurantIds)', {candidateRestaurantIds});
    } else if (filters.locationId) {
        const availableRestaurantIds = await restaurantAvailabilityService.listAvailableRestaurantIdsForLocation(
            filters.locationId,
            filters.serviceType ?? 'delivery',
        );
        if (availableRestaurantIds.length === 0) {
            return [];
        }
        qb.andWhere('r.id IN (:...availableRestaurantIds)', {availableRestaurantIds});
    }

    qb.orderBy('r.name', 'ASC');
    const active = await qb.getMany();

    const cuisineIncludes = filters.cuisineIncludes ?? [];
    const cuisineExcludes = filters.cuisineExcludes ?? [];
    let filtered = active;

    if (cuisineIncludes.length > 0) {
        filtered = filtered.filter((restaurant) =>
            cuisineIncludes.some((query) => restaurantMatchesCuisineQuery(restaurant, query)),
        );
    }

    if (cuisineExcludes.length > 0) {
        filtered = filtered.filter((restaurant) =>
            cuisineExcludes.every((query) => !restaurantMatchesCuisineQuery(restaurant, query)),
        );
    }

    if (filters.openOnly) {
        filtered = filtered.filter((restaurant) => {
            const isOpen = computeIsOpenNowFromOpeningHours(restaurant.openingHours);
            // Include restaurants that are open (true) or have unknown hours (null).
            // Only exclude restaurants that are explicitly closed (false).
            return isOpen !== false;
        });
    }

    // Allergen exclusion filter: exclude restaurants where ALL menu items contain excluded allergens
    const excludeAllergens = filters.excludeAllergens ?? [];
    if (excludeAllergens.length > 0) {
        const allergenTokens = new Set(excludeAllergens.map((a) => a.toLowerCase().trim()).filter(Boolean));
        const results: Restaurant[] = [];
        for (const restaurant of filtered) {
            const items = await getActiveMenuItems(restaurant.id);
            if (items.length === 0) {
                // No menu data — include by default (can't determine)
                results.push(restaurant);
                continue;
            }
            const hasSafeItem = items.some((item) => {
                if (!item.allergens) return true; // No allergen data — assume safe
                const itemAllergens = item.allergens.toLowerCase().split(/[,|;]+/).flatMap((p) => p.trim().split(/\s+/));
                return !itemAllergens.some((token) => allergenTokens.has(token));
            });
            if (hasSafeItem) {
                results.push(restaurant);
            }
        }
        filtered = results;
    }

    return filtered;
}

/**
 * Check if a restaurant supports all required diet tags.
 * Returns the matching diet details for the reason summary.
 */
export async function checkDietCompatibility(
    restaurantId: string,
    requiredDietTagIds: string[],
    minDietScore: number = 0,
): Promise<{compatible: boolean; matchedDiets: DietMatchDetail[]}> {
    if (requiredDietTagIds.length === 0) {
        return {compatible: true, matchedDiets: []};
    }

    const suitability = await dietOverrideService.computeEffectiveSuitability(restaurantId);
    const requiredSet = new Set(requiredDietTagIds);
    const suitabilityById = new Map(suitability.map((entry) => [entry.dietTagId, entry]));
    const threshold = Math.max(0, Math.min(100, minDietScore));

    const matchedDiets: DietMatchDetail[] = [];
    let allSupported = true;

    for (const dietTagId of requiredDietTagIds) {
        const s = suitabilityById.get(dietTagId);
        if (!s || !requiredSet.has(dietTagId)) {
            allSupported = false;
            continue;
        }

        const inferredScore = s.inference?.score ?? null;
        const inferredConfidence = (s.inference?.confidence as 'LOW' | 'MEDIUM' | 'HIGH' | undefined) ?? null;
        const meetsScoreThreshold = s.source === 'override'
            ? s.supported === true
            : s.supported === true && (inferredScore ?? 0) >= threshold;

        matchedDiets.push({
            dietTagId: s.dietTagId,
            dietTagKey: s.dietTagKey,
            dietTagLabel: s.dietTagLabel,
            supported: s.supported,
            source: s.source,
            score: inferredScore,
            confidence: inferredConfidence,
            meetsScoreThreshold,
        });

        if (!s.supported || !meetsScoreThreshold) {
            allSupported = false;
        }
    }

    if (matchedDiets.length < requiredDietTagIds.length) {
        allSupported = false;
    }

    return {compatible: allSupported, matchedDiets};
}

/**
 * Pick a random element from an array using Fisher-Yates-inspired selection.
 * When favoriteIds is provided, favorites appear twice in the pool to boost
 * their selection probability.
 */
export function pickRandom<T>(items: T[], favoriteIds?: Set<string>, getId?: (item: T) => string): T | null {
    if (items.length === 0) return null;
    if (favoriteIds && favoriteIds.size > 0 && getId) {
        // Build boosted pool: favorites appear twice
        const boosted: T[] = [];
        for (const item of items) {
            boosted.push(item);
            if (favoriteIds.has(getId(item))) {
                boosted.push(item);
            }
        }
        const index = Math.floor(Math.random() * boosted.length);
        return boosted[index];
    }
    const index = Math.floor(Math.random() * items.length);
    return items[index];
}

/**
 * Main suggestion function: find a random restaurant matching all filters.
 * Excludes recently-suggested restaurants when possible (fallback: if all
 * candidates are recent, ignore the exclusion list).
 */
export async function suggest(filters: SuggestionFilters): Promise<SuggestionResult | null> {
    const activeRestaurants = await findActiveRestaurants(filters);

    if (activeRestaurants.length === 0) return null;

    // Hard-exclude do-not-suggest restaurants (no fallback)
    let candidates = applyDoNotSuggestFilter(activeRestaurants, filters.doNotSuggestIds ?? []);

    if (candidates.length === 0) return null;

    const dietTagIds = filters.dietTagIds ?? [];
    const excludeIds = new Set(filters.excludeRestaurantIds ?? []);
    const favoriteIds = new Set(filters.favoriteIds ?? []);
    const favoriteMode = filters.favoriteMode ?? 'prefer';
    const minDietScore = Math.max(0, Math.min(100, filters.minDietScore ?? 0));

    if (favoriteMode === 'only') {
        candidates = applyFavoriteOnlyFilter(candidates, filters.favoriteIds ?? []);
        if (candidates.length === 0) {
            return null;
        }
    }

    // If no diet filters, pick randomly from active+cuisine-filtered restaurants
    if (dietTagIds.length === 0) {
        const filtered = excludeIds.size > 0
            ? candidates.filter(r => !excludeIds.has(r.id))
            : candidates;
        // Fallback: if everything excluded, use full list
        const pool = filtered.length > 0 ? filtered : candidates;
        const picked = pickRandom(
            pool,
            favoriteMode === 'prefer' ? favoriteIds : undefined,
            r => r.id,
        );
        if (!picked) return null;
        return {
            restaurant: picked,
            reason: {
                matchedDiets: [],
                matchedCuisines: extractMatchedCuisines(picked),
                totalCandidates: pool.length,
            },
        };
    }

    // Filter by diet compatibility
    const compatible = await filterCompatibleRestaurants(candidates, dietTagIds, minDietScore);

    if (compatible.length === 0) return null;

    const filtered = excludeIds.size > 0
        ? compatible.filter(c => !excludeIds.has(c.restaurant.id))
        : compatible;
    // Fallback: if everything excluded, use full compatible list
    const pool = filtered.length > 0 ? filtered : compatible;
    const picked = pickRandom(
        pool,
        favoriteMode === 'prefer' ? favoriteIds : undefined,
        c => c.restaurant.id,
    );
    if (!picked) return null;

    return {
        restaurant: picked.restaurant,
        reason: {
            matchedDiets: picked.matchedDiets,
            matchedCuisines: extractMatchedCuisines(picked.restaurant),
            totalCandidates: pool.length,
        },
    };
}

export async function diagnoseNoMatch(filters: SuggestionFilters): Promise<SuggestionNoMatchDiagnostics> {
    const currentService = filters.serviceType ?? 'delivery';
    const alternateService: ProviderServiceType = currentService === 'delivery' ? 'collection' : 'delivery';
    const candidateRestaurantIds = filters.candidateRestaurantIds;
    const counts: SuggestionNoMatchDiagnostics['counts'] = {
        activeRestaurants: 0,
        locationRestaurants: 0,
        alternateServiceRestaurants: 0,
        locationProviderContexts: 0,
        locationCoverageRestaurants: 0,
        locationLatestSnapshots: 0,
        locationFreshSnapshots: 0,
        locationExpiredSnapshots: 0,
        unavailableLocationRestaurants: 0,
        openRestaurants: 0,
        cuisineRestaurants: 0,
        allergenRestaurants: 0,
        allowedRestaurants: 0,
        favoriteRestaurants: 0,
        dietRestaurants: 0,
    };

    const activeRestaurants = await findActiveRestaurants({});
    counts.activeRestaurants = activeRestaurants.length;
    if (activeRestaurants.length === 0) {
        return {
            blockingStage: 'empty',
            summary: 'No active restaurants are available yet.',
            hints: [
                'Import restaurants from a file or run a provider sync to populate the pool.',
                'Check the Restaurants page and reactivate any places you still want to consider.',
                'If restaurants were synced before, run a fresh import or provider sync to refresh the data.',
            ],
            counts,
        };
    }

    const locationRestaurants = await findActiveRestaurants({
        candidateRestaurantIds,
        locationId: filters.locationId,
        serviceType: currentService,
    });
    counts.locationRestaurants = locationRestaurants.length;

    if (filters.locationId) {
        counts.alternateServiceRestaurants = (
            await findActiveRestaurants({
                locationId: filters.locationId,
                serviceType: alternateService,
            })
        ).length;
    }

    if (locationRestaurants.length === 0) {
        const locationAvailabilityStats = filters.locationId
            ? await restaurantAvailabilityService.getLocationAvailabilityStats(filters.locationId, currentService)
            : null;

        counts.locationProviderContexts = locationAvailabilityStats?.providerLocationCount ?? 0;
        counts.locationCoverageRestaurants = locationAvailabilityStats?.coverageCount ?? 0;
        counts.locationLatestSnapshots = locationAvailabilityStats?.latestSnapshotCount ?? 0;
        counts.locationFreshSnapshots = locationAvailabilityStats?.freshSnapshotCount ?? 0;
        counts.locationExpiredSnapshots = locationAvailabilityStats?.expiredSnapshotCount ?? 0;
        counts.unavailableLocationRestaurants = locationAvailabilityStats?.unavailableRestaurantCount ?? 0;

        return buildLocationStageDiagnostics(
            counts,
            currentService,
            alternateService,
            locationAvailabilityStats,
        );
    }

    const openRestaurants = await findActiveRestaurants({
        candidateRestaurantIds,
        locationId: filters.locationId,
        serviceType: currentService,
        openOnly: filters.openOnly,
    });
    counts.openRestaurants = openRestaurants.length;
    if (filters.openOnly && openRestaurants.length === 0) {
        const hints = [
            'Turn off "Only restaurants that are open right now" for this draw.',
            'Check imported opening hours or re-sync provider data if they look stale.',
            'Try again later if this is outside normal delivery hours.',
        ];
        if (counts.alternateServiceRestaurants > 0) {
            hints.splice(1, 0, `Try ${labelForServiceType(alternateService)} if some places only offer that service right now.`);
        }

        return {
            blockingStage: 'open',
            summary: 'Restaurants exist for this location, but none are open right now.',
            hints,
            counts,
        };
    }

    const cuisineRestaurants = await findActiveRestaurants({
        candidateRestaurantIds,
        locationId: filters.locationId,
        serviceType: currentService,
        openOnly: filters.openOnly,
        cuisineIncludes: filters.cuisineIncludes,
        cuisineExcludes: filters.cuisineExcludes,
    });
    counts.cuisineRestaurants = cuisineRestaurants.length;
    if ((filters.cuisineIncludes?.length ?? 0) > 0 || (filters.cuisineExcludes?.length ?? 0) > 0) {
        if (cuisineRestaurants.length === 0) {
            return {
                blockingStage: 'cuisine',
                summary: 'Your cuisine filters removed all remaining restaurants.',
                hints: [
                    'Clear or relax the cuisine include/exclude filters.',
                    'Check whether the expected cuisine tags exist on the restaurant pages.',
                    'Reimport or re-sync provider data if cuisine metadata looks stale or incomplete.',
                ],
                counts,
            };
        }
    }

    const allergenRestaurants = await findActiveRestaurants({
        candidateRestaurantIds,
        locationId: filters.locationId,
        serviceType: currentService,
        openOnly: filters.openOnly,
        cuisineIncludes: filters.cuisineIncludes,
        cuisineExcludes: filters.cuisineExcludes,
        excludeAllergens: filters.excludeAllergens,
    });
    counts.allergenRestaurants = allergenRestaurants.length;
    if ((filters.excludeAllergens?.length ?? 0) > 0 && allergenRestaurants.length === 0) {
        return {
            blockingStage: 'allergen',
            summary: 'Allergen exclusion removed all remaining restaurants.',
            hints: [
                'Remove one or more excluded allergens for this draw if the list is too strict.',
                'Reimport or re-sync menus so allergen information is up to date.',
                'Review restaurant menus manually to confirm whether safe items exist.',
            ],
            counts,
        };
    }

    const allowedRestaurants = applyDoNotSuggestFilter(allergenRestaurants, filters.doNotSuggestIds ?? []);
    counts.allowedRestaurants = allowedRestaurants.length;
    if (allergenRestaurants.length > 0 && allowedRestaurants.length === 0) {
        return {
            blockingStage: 'blocked',
            summary: 'All remaining restaurants are blocked by your Do Not Suggest settings.',
            hints: [
                'Unblock one or more restaurants from their detail pages.',
                'Turn off "Respect restaurants you blocked from suggestions" for this draw.',
                'Add more restaurants or sync more providers if the pool is too small.',
            ],
            counts,
        };
    }

    const favoriteMode = filters.favoriteMode ?? 'prefer';
    const favoriteRestaurants = favoriteMode === 'only'
        ? applyFavoriteOnlyFilter(allowedRestaurants, filters.favoriteIds ?? [])
        : allowedRestaurants;
    counts.favoriteRestaurants = favoriteRestaurants.length;
    if (favoriteMode === 'only' && favoriteRestaurants.length === 0) {
        return {
            blockingStage: 'favorites',
            summary: 'Favorites-only mode left no eligible restaurants.',
            hints: [
                'Switch Favorites from "Only favorites" to "Prefer favorites".',
                'Mark more restaurants as favorites on their detail pages.',
                'Check whether your favorite restaurants are blocked, closed, or unavailable at this location.',
            ],
            counts,
        };
    }

    const dietTagIds = filters.dietTagIds ?? [];
    if (dietTagIds.length > 0) {
        counts.dietRestaurants = (await filterCompatibleRestaurants(
            favoriteRestaurants,
            dietTagIds,
            Math.max(0, Math.min(100, filters.minDietScore ?? 0)),
        )).length;

        if (counts.dietRestaurants === 0) {
            return {
                blockingStage: 'diet',
                summary: 'No restaurants satisfy the selected diet filters.',
                hints: [
                    'Reduce the selected diet tags or lower the minimum diet score.',
                    'Review manual diet overrides on restaurant pages if a place should qualify.',
                    'Reimport or re-sync menus so diet inference uses current menu data.',
                ],
                counts,
            };
        }
    } else {
        counts.dietRestaurants = favoriteRestaurants.length;
    }

    return {
        blockingStage: 'unknown',
        summary: 'No restaurants matched after all filters were applied.',
        hints: [
            'Relax one or more filters and try again.',
            'Re-sync providers or reimport restaurants if the data may be stale.',
        ],
        counts,
    };
}

function buildLocationStageDiagnostics(
    counts: SuggestionNoMatchDiagnostics['counts'],
    currentService: ProviderServiceType,
    alternateService: ProviderServiceType,
    locationAvailabilityStats: restaurantAvailabilityService.LocationAvailabilityStats | null,
): SuggestionNoMatchDiagnostics {
    const hints = [
        'Choose another saved location if you order to multiple addresses.',
        'Check the saved location in Settings and verify that its address and coordinates are correct.',
    ];
    if (counts.alternateServiceRestaurants > 0) {
        hints.unshift(`Try switching from ${labelForServiceType(currentService)} to ${labelForServiceType(alternateService)}.`);
    }

    if (!locationAvailabilityStats || locationAvailabilityStats.providerLocationCount === 0 || locationAvailabilityStats.coverageCount === 0) {
        return {
            blockingStage: 'location',
            summary: `No location-specific availability has been imported for ${labelForServiceType(currentService)} at the selected saved location yet.`,
            hints: [
                'Open Location Imports and run a listing import for this saved location.',
                'If you just created or edited this saved location, wait for the queued location import to finish and try again.',
                ...hints,
            ],
            counts,
        };
    }

    if (locationAvailabilityStats.latestSnapshotCount === 0) {
        return {
            blockingStage: 'location',
            summary: `Restaurants were linked to this location, but no ${labelForServiceType(currentService)} availability snapshots were stored yet.`,
            hints: [
                'Run a fresh location import so provider availability snapshots are created for this saved location.',
                'If this provider only supports another service type, switch the draw to that service and try again.',
                ...hints,
            ],
            counts,
        };
    }

    if (locationAvailabilityStats.freshSnapshotCount === 0 && locationAvailabilityStats.expiredSnapshotCount > 0) {
        return {
            blockingStage: 'location',
            summary: `Availability data exists for this saved location, but the stored ${labelForServiceType(currentService)} snapshots expired.`,
            hints: [
                'Run a location import again to refresh location-aware availability.',
                'If you just edited this saved location, wait for the queued refresh to finish and try again.',
                ...hints,
            ],
            counts,
        };
    }

    if (locationAvailabilityStats.unavailableRestaurantCount > 0) {
        return {
            blockingStage: 'location',
            summary: `Restaurants were imported for this saved location, but none currently offer ${labelForServiceType(currentService)}.`,
            hints: [
                'Try again later if this is outside normal service hours.',
                'Run a location import again if provider availability may have changed.',
                ...hints,
            ],
            counts,
        };
    }

    return {
        blockingStage: 'location',
        summary: `No restaurants are currently available for ${labelForServiceType(currentService)} at the selected saved location.`,
        hints: [
            'If you just created or edited this saved location, wait for the queued location import to finish and try again.',
            'Run a provider sync for this saved location so location-specific availability is refreshed.',
            ...hints,
        ],
        counts,
    };
}

function applyDoNotSuggestFilter(restaurants: Restaurant[], doNotSuggestIds: string[]): Restaurant[] {
    const doNotSuggestIdSet = new Set(doNotSuggestIds);
    return doNotSuggestIdSet.size > 0
        ? restaurants.filter((restaurant) => !doNotSuggestIdSet.has(restaurant.id))
        : restaurants;
}

function applyFavoriteOnlyFilter(restaurants: Restaurant[], favoriteIds: string[]): Restaurant[] {
    const favoriteIdSet = new Set(favoriteIds);
    return restaurants.filter((restaurant) => favoriteIdSet.has(restaurant.id));
}

async function filterCompatibleRestaurants(
    restaurants: Restaurant[],
    dietTagIds: string[],
    minDietScore: number,
): Promise<Array<{restaurant: Restaurant; matchedDiets: DietMatchDetail[]}>> {
    const compatible: Array<{restaurant: Restaurant; matchedDiets: DietMatchDetail[]}> = [];
    for (const restaurant of restaurants) {
        const check = await checkDietCompatibility(restaurant.id, dietTagIds, minDietScore);
        if (check.compatible) {
            compatible.push({restaurant, matchedDiets: check.matchedDiets});
        }
    }
    return compatible;
}

function labelForServiceType(serviceType: ProviderServiceType): string {
    return serviceType === 'collection' ? 'collection' : 'delivery';
}

function restaurantMatchesCuisineQuery(restaurant: Restaurant, query: string): boolean {
    const tokens = getRestaurantCuisineTokens(restaurant);
    if (tokens.size > 0) {
        return matchesCuisineFilter(tokens, query);
    }

    const normalizedName = normalizeText(restaurant.name);
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return false;
    return normalizedName.includes(normalizedQuery);
}

function extractMatchedCuisines(restaurant: Restaurant): Array<{
    key: string;
    label: string;
    score: number;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    source: 'provider' | 'heuristic';
}> {
    const profile = parseCuisineInference(restaurant.cuisineInferenceJson);
    if (profile && profile.cuisines.length > 0) {
        return profile.cuisines.slice(0, 8).map((entry) => ({
            key: entry.key,
            label: entry.label,
            score: entry.score,
            confidence: entry.confidence,
            source: entry.source,
        }));
    }

    const providerCuisines = (restaurant.providerCuisines ?? []).map((c) => c.value);
    return providerCuisines.slice(0, 8).map((label) => ({
        key: normalizeText(label).replace(/\s+/g, '_').toUpperCase(),
        label,
        score: 100,
        confidence: 'HIGH',
        source: 'provider',
    }));
}
