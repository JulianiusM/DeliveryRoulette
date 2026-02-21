import {AppDataSource} from '../dataSource';
import {Restaurant} from '../entities/restaurant/Restaurant';
import * as dietOverrideService from './DietOverrideService';
import {EffectiveSuitability} from './DietOverrideService';

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
        .where('r.is_active = :active', {active: 1});

    if (filters.cuisineIncludes && filters.cuisineIncludes.length > 0) {
        const conditions = filters.cuisineIncludes.map((_kw, i) => `r.name LIKE :ci${i}`);
        const params: Record<string, string> = {};
        filters.cuisineIncludes.forEach((kw, i) => {
            params[`ci${i}`] = `%${kw}%`;
        });
        qb.andWhere(`(${conditions.join(' OR ')})`, params);
    }

    if (filters.cuisineExcludes && filters.cuisineExcludes.length > 0) {
        filters.cuisineExcludes.forEach((kw, i) => {
            qb.andWhere(`r.name NOT LIKE :ce${i}`, {[`ce${i}`]: `%${kw}%`});
        });
    }

    qb.orderBy('r.name', 'ASC');
    return await qb.getMany();
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
            totalCandidates: pool.length,
        },
    };
}
