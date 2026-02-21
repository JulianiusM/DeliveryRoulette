import {AppDataSource} from '../dataSource';
import {UserRestaurantPreference} from '../entities/user/UserRestaurantPreference';

/**
 * Get a user's preference for a specific restaurant.
 */
export async function getByUserAndRestaurant(userId: number, restaurantId: string): Promise<UserRestaurantPreference | null> {
    const repo = AppDataSource.getRepository(UserRestaurantPreference);
    return await repo.findOne({where: {userId, restaurantId}});
}

/**
 * Toggle the favorite flag for a user/restaurant pair.
 * Creates the preference row if it doesn't exist yet.
 */
export async function toggleFavorite(userId: number, restaurantId: string): Promise<UserRestaurantPreference> {
    const repo = AppDataSource.getRepository(UserRestaurantPreference);
    let pref = await repo.findOne({where: {userId, restaurantId}});

    if (pref) {
        pref.isFavorite = !pref.isFavorite;
        pref.updatedAt = new Date();
        return await repo.save(pref);
    }

    const newPref = repo.create({
        userId,
        restaurantId,
        isFavorite: true,
        doNotSuggest: false,
    });
    return await repo.save(newPref);
}

/**
 * Toggle the do-not-suggest flag for a user/restaurant pair.
 * Creates the preference row if it doesn't exist yet.
 */
export async function toggleDoNotSuggest(userId: number, restaurantId: string): Promise<UserRestaurantPreference> {
    const repo = AppDataSource.getRepository(UserRestaurantPreference);
    let pref = await repo.findOne({where: {userId, restaurantId}});

    if (pref) {
        pref.doNotSuggest = !pref.doNotSuggest;
        pref.updatedAt = new Date();
        return await repo.save(pref);
    }

    const newPref = repo.create({
        userId,
        restaurantId,
        isFavorite: false,
        doNotSuggest: true,
    });
    return await repo.save(newPref);
}

/**
 * Get all restaurant IDs marked as do-not-suggest for a given user.
 * Used by the suggestion engine to exclude these restaurants.
 */
export async function getDoNotSuggestRestaurantIds(userId: number): Promise<string[]> {
    const repo = AppDataSource.getRepository(UserRestaurantPreference);
    const prefs = await repo.find({
        where: {userId, doNotSuggest: true},
        select: ['restaurantId'],
    });
    return prefs.map(p => p.restaurantId);
}

/**
 * Get all restaurant IDs marked as favorite for a given user.
 * Used by the suggestion engine to boost favorite restaurants.
 */
export async function getFavoriteRestaurantIds(userId: number): Promise<string[]> {
    const repo = AppDataSource.getRepository(UserRestaurantPreference);
    const prefs = await repo.find({
        where: {userId, isFavorite: true},
        select: ['restaurantId'],
    });
    return prefs.map(p => p.restaurantId);
}

/**
 * Get all preferences for a user (for restaurant list filtering).
 */
export async function getAllByUserId(userId: number): Promise<UserRestaurantPreference[]> {
    const repo = AppDataSource.getRepository(UserRestaurantPreference);
    return await repo.find({where: {userId}});
}
