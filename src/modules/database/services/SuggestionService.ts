import {AppDataSource} from '../dataSource';
import {Restaurant} from '../entities/restaurant/Restaurant';
import * as dietOverrideService from './DietOverrideService';
import {EffectiveSuitability} from './DietOverrideService';
import {
    getRestaurantCuisineTokens,
    matchesCuisineFilter,
    parseCuisineInference,
} from './CuisineInferenceService';
import {normalizeText} from './DietInferenceService';
import {computeIsOpenNowFromOpeningHours} from '../../lib/openingHours';

// ── Types ───────────────────────────────────────────────────

export interface SuggestionFilters {
    /** Diet tag IDs the restaurant must support */
    dietTagIds?: string[];
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
    /** When true, only suggest restaurants that are currently open */
    openOnly?: boolean;
}

export interface DietMatchDetail {
    dietTagId: string;
    dietTagKey: string;
    dietTagLabel: string;
    supported: boolean | null;
    source: 'override' | 'inference' | 'none';
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

// ── Core logic ──────────────────────────────────────────────

/**
 * Find active restaurants matching optional cuisine name filters.
 */
export async function findActiveRestaurants(filters: SuggestionFilters): Promise<Restaurant[]> {
    const repo = AppDataSource.getRepository(Restaurant);
    const qb = repo.createQueryBuilder('r')
        .leftJoinAndSelect('r.providerCuisines', 'rc')
        .where('r.is_active = :active', {active: 1});

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
            return isOpen === true;
        });
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
): Promise<{compatible: boolean; matchedDiets: DietMatchDetail[]}> {
    if (requiredDietTagIds.length === 0) {
        return {compatible: true, matchedDiets: []};
    }

    const suitability = await dietOverrideService.computeEffectiveSuitability(restaurantId);
    const requiredSet = new Set(requiredDietTagIds);

    const matchedDiets: DietMatchDetail[] = [];
    let allSupported = true;

    for (const s of suitability) {
        if (!requiredSet.has(s.dietTagId)) continue;

        matchedDiets.push({
            dietTagId: s.dietTagId,
            dietTagKey: s.dietTagKey,
            dietTagLabel: s.dietTagLabel,
            supported: s.supported,
            source: s.source,
        });

        if (!s.supported) {
            allSupported = false;
        }
    }

    // If a required tag was not found in suitability results at all, it's unsupported
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
    const doNotSuggestIds = new Set(filters.doNotSuggestIds ?? []);
    const candidates = doNotSuggestIds.size > 0
        ? activeRestaurants.filter(r => !doNotSuggestIds.has(r.id))
        : activeRestaurants;

    if (candidates.length === 0) return null;

    const dietTagIds = filters.dietTagIds ?? [];
    const excludeIds = new Set(filters.excludeRestaurantIds ?? []);
    const favoriteIds = new Set(filters.favoriteIds ?? []);

    // If no diet filters, pick randomly from active+cuisine-filtered restaurants
    if (dietTagIds.length === 0) {
        const filtered = excludeIds.size > 0
            ? candidates.filter(r => !excludeIds.has(r.id))
            : candidates;
        // Fallback: if everything excluded, use full list
        const pool = filtered.length > 0 ? filtered : candidates;
        const picked = pickRandom(pool, favoriteIds, r => r.id);
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
    const compatible: Array<{restaurant: Restaurant; matchedDiets: DietMatchDetail[]}> = [];
    for (const restaurant of candidates) {
        const check = await checkDietCompatibility(restaurant.id, dietTagIds);
        if (check.compatible) {
            compatible.push({restaurant, matchedDiets: check.matchedDiets});
        }
    }

    if (compatible.length === 0) return null;

    const filtered = excludeIds.size > 0
        ? compatible.filter(c => !excludeIds.has(c.restaurant.id))
        : compatible;
    // Fallback: if everything excluded, use full compatible list
    const pool = filtered.length > 0 ? filtered : compatible;
    const picked = pickRandom(pool, favoriteIds, c => c.restaurant.id);
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
