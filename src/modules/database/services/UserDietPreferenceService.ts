import {AppDataSource} from '../dataSource';
import {UserDietPreference} from '../entities/user/UserDietPreference';
import {DietTag} from '../entities/diet/DietTag';
import {In} from 'typeorm';

/**
 * Get all diet tag preferences for a user.
 * Returns the diet tag IDs that the user has selected.
 */
export async function getByUserId(userId: number): Promise<UserDietPreference[]> {
    const repo = AppDataSource.getRepository(UserDietPreference);
    return await repo.find({
        where: {userId},
        relations: ['dietTag'],
        order: {createdAt: 'ASC'},
    });
}

/**
 * Get all available diet tags.
 */
export async function getAllDietTags(): Promise<DietTag[]> {
    const repo = AppDataSource.getRepository(DietTag);
    return await repo.find({order: {key: 'ASC'}});
}

/**
 * Replace a user's diet preferences with the given set of diet tag IDs.
 * Deletes existing preferences and inserts the new set atomically.
 */
export async function replaceForUser(userId: number, dietTagIds: string[]): Promise<UserDietPreference[]> {
    const repo = AppDataSource.getRepository(UserDietPreference);

    // Remove existing preferences
    await repo.delete({userId});

    if (dietTagIds.length === 0) {
        return [];
    }

    // Validate that all tag IDs exist
    const tagRepo = AppDataSource.getRepository(DietTag);
    const validTags = await tagRepo.find({where: {id: In(dietTagIds)}});
    const validIds = new Set(validTags.map(t => t.id));

    const newPrefs = dietTagIds
        .filter(id => validIds.has(id))
        .map(id => repo.create({userId, dietTagId: id}));

    if (newPrefs.length === 0) {
        return [];
    }

    return await repo.save(newPrefs);
}

/**
 * Resolve the effective diet filter tag IDs for a user.
 * Returns the list of DietTag IDs the user has selected as preferences.
 * Used by suggestion engine and filters as default diet filters.
 */
export async function getEffectiveDietFilterIds(userId: number): Promise<string[]> {
    const prefs = await getByUserId(userId);
    return prefs.map(p => p.dietTagId);
}

/**
 * Resolve the effective diet filter tags for a user.
 * Returns full DietTag objects for the user's preferences.
 */
export async function getEffectiveDietFilters(userId: number): Promise<DietTag[]> {
    const prefs = await getByUserId(userId);
    return prefs
        .filter(p => p.dietTag)
        .map(p => p.dietTag);
}
