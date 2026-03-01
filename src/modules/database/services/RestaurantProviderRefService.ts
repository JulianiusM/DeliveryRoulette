import {AppDataSource} from '../dataSource';
import {RestaurantProviderRef} from '../entities/restaurant/RestaurantProviderRef';

export async function listByRestaurant(restaurantId: string): Promise<RestaurantProviderRef[]> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    return await repo.find({
        where: {restaurantId},
        order: {providerKey: 'ASC', createdAt: 'ASC'},
    });
}

export async function getById(id: string): Promise<RestaurantProviderRef | null> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    return await repo.findOne({where: {id}});
}

export async function getByIdForRestaurant(
    id: string,
    restaurantId: string,
): Promise<RestaurantProviderRef | null> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    return await repo.findOne({where: {id, restaurantId}});
}

export async function addProviderRef(data: {
    restaurantId: string;
    providerKey: string;
    externalId?: string | null;
    url: string;
}): Promise<RestaurantProviderRef> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    const ref = repo.create({
        restaurantId: data.restaurantId,
        providerKey: data.providerKey,
        externalId: data.externalId || null,
        url: data.url,
        status: 'active',
    });
    return await repo.save(ref);
}

export async function removeProviderRef(id: string, restaurantId: string): Promise<boolean> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    const ref = await repo.findOne({where: {id, restaurantId}});
    if (!ref) return false;
    await repo.remove(ref);
    return true;
}

/**
 * Ensure a provider ref exists for the given restaurant / provider key.
 * Skips creation when a ref with the same key already exists.
 */
export async function ensureProviderRef(
    restaurantId: string,
    providerKey: string,
    externalId: string | null,
    url: string,
): Promise<void> {
    const existingRefs = await listByRestaurant(restaurantId);
    const already = existingRefs.some(
        (r) => r.providerKey.toLowerCase() === providerKey.toLowerCase(),
    );
    if (!already) {
        await addProviderRef({restaurantId, providerKey, externalId, url});
    }
}
