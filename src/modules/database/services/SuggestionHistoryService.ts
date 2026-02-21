import {AppDataSource} from '../dataSource';
import {SuggestionHistory} from '../entities/suggestion/SuggestionHistory';
import settings from '../../settings';

/**
 * Record a suggestion event in history.
 */
export async function recordSuggestion(restaurantId: string, userId?: number | null): Promise<SuggestionHistory> {
    const repo = AppDataSource.getRepository(SuggestionHistory);
    const entry = repo.create({
        restaurantId,
        userId: userId ?? null,
    });
    return await repo.save(entry);
}

/**
 * Get restaurant IDs from the most recent N suggestions.
 * Returns unique restaurant IDs that were recently suggested.
 * When userId is provided, scopes history to that user;
 * when null/undefined, returns global (anonymous) history.
 */
export async function getRecentRestaurantIds(userId?: number | null): Promise<string[]> {
    const limit = settings.value.suggestionExcludeRecentCount;
    if (limit <= 0) return [];

    const repo = AppDataSource.getRepository(SuggestionHistory);
    const qb = repo.createQueryBuilder('sh')
        .select('sh.restaurant_id', 'restaurantId')
        .orderBy('sh.suggested_at', 'DESC')
        .limit(limit);

    if (userId !== null && userId !== undefined) {
        qb.where('sh.user_id = :userId', {userId});
    } else {
        qb.where('sh.user_id IS NULL');
    }

    const rows = await qb.getRawMany();
    return rows.map((r: {restaurantId: string}) => r.restaurantId);
}
