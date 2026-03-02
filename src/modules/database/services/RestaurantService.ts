import {AppDataSource} from '../dataSource';
import {Restaurant} from '../entities/restaurant/Restaurant';
import {RestaurantCuisine} from '../entities/restaurant/RestaurantCuisine';
import {ProviderRestaurant} from '../../../providers/ProviderTypes';

export interface ListRestaurantsOptions {
    search?: string;
    isActive?: boolean;
}

export async function createRestaurant(data: {
    name: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    postalCode: string;
    country?: string;
    openingHours?: string | null;
    openingDays?: string | null;
    cuisineInferenceJson?: string | null;
}): Promise<Restaurant> {
    const repo = AppDataSource.getRepository(Restaurant);
    const restaurant = repo.create({
        ...data,
        isActive: true,
    });
    return await repo.save(restaurant);
}

export async function updateRestaurant(id: string, data: {
    name?: string;
    addressLine1?: string;
    addressLine2?: string | null;
    city?: string;
    postalCode?: string;
    country?: string;
    openingHours?: string | null;
    openingDays?: string | null;
    cuisineInferenceJson?: string | null;
    isActive?: boolean;
}): Promise<Restaurant | null> {
    const repo = AppDataSource.getRepository(Restaurant);
    const restaurant = await repo.findOne({where: {id}});
    if (!restaurant) return null;

    Object.assign(restaurant, data);
    restaurant.updatedAt = new Date();
    return await repo.save(restaurant);
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
    const repo = AppDataSource.getRepository(Restaurant);
    return await repo.findOne({where: {id}, relations: ['providerCuisines']});
}

export async function listRestaurants(options: ListRestaurantsOptions = {}): Promise<Restaurant[]> {
    const repo = AppDataSource.getRepository(Restaurant);
    const qb = repo.createQueryBuilder('r');

    if (options.search) {
        const like = `%${options.search}%`;
        qb.where('r.name LIKE :like', {like})
            .orWhere('r.city LIKE :like', {like});
    }

    if (options.isActive !== undefined) {
        if (options.search) {
            qb.andWhere('r.is_active = :isActive', {isActive: options.isActive ? 1 : 0});
        } else {
            qb.where('r.is_active = :isActive', {isActive: options.isActive ? 1 : 0});
        }
    }

    qb.orderBy('r.name', 'ASC');

    return await qb.getMany();
}

/**
 * Create or update a restaurant from normalised provider data.
 * Returns the restaurant ID.
 * Wrapped in a transaction to prevent partial writes.
 */
export async function upsertFromProvider(incoming: ProviderRestaurant): Promise<string> {
    return AppDataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Restaurant);
        const cuisineRepo = manager.getRepository(RestaurantCuisine);
        const all = await repo.find();
        const existing = all.find(
            (r) => r.name.toLowerCase() === incoming.name.toLowerCase(),
        );
        const providerCuisines = normalizeCuisineList(incoming.cuisines);

        if (existing) {
            Object.assign(existing, {
                addressLine1: incoming.address ?? '',
                addressLine2: incoming.addressLine2 ?? null,
                city: incoming.city ?? '',
                postalCode: incoming.postalCode ?? '',
                country: incoming.country ?? '',
                openingHours: incoming.openingHours ?? existing.openingHours ?? null,
                openingDays: incoming.openingDays ?? existing.openingDays ?? null,
                isActive: true,
            });
            existing.updatedAt = new Date();
            await repo.save(existing);

            if (providerCuisines.length > 0) {
                await syncProviderCuisines(cuisineRepo, existing.id, providerCuisines);
            }

            return existing.id;
        }

        const created = repo.create({
            name: incoming.name,
            addressLine1: incoming.address ?? '',
            addressLine2: incoming.addressLine2 ?? null,
            city: incoming.city ?? '',
            postalCode: incoming.postalCode ?? '',
            country: incoming.country ?? '',
            openingHours: incoming.openingHours ?? null,
            openingDays: incoming.openingDays ?? null,
            isActive: true,
        });
        const saved = await repo.save(created);

        if (providerCuisines.length > 0) {
            await syncProviderCuisines(cuisineRepo, saved.id, providerCuisines);
        }

        return saved.id;
    });
}

/**
 * Get the provider-supplied cuisine list for a restaurant.
 */
export async function getProviderCuisines(restaurantId: string): Promise<string[]> {
    const repo = AppDataSource.getRepository(RestaurantCuisine);
    const rows = await repo.find({where: {restaurantId, source: 'provider'}});
    return rows.map((r) => r.value);
}

async function syncProviderCuisines(
    repo: import('typeorm').Repository<RestaurantCuisine>,
    restaurantId: string,
    cuisines: string[],
): Promise<void> {
    const existing = await repo.find({where: {restaurantId, source: 'provider'}});
    const existingValues = new Set(existing.map((r) => r.value.toLowerCase()));
    const desired = new Set(cuisines.map((c) => c.toLowerCase()));

    for (const row of existing) {
        if (!desired.has(row.value.toLowerCase())) {
            await repo.remove(row);
        }
    }

    for (const cuisine of cuisines) {
        if (!existingValues.has(cuisine.toLowerCase())) {
            const row = repo.create({restaurantId, value: cuisine, source: 'provider'});
            await repo.save(row);
        }
    }
}

function normalizeCuisineList(cuisines?: string[] | null): string[] {
    if (!cuisines || cuisines.length === 0) return [];
    const normalized = cuisines
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    return [...new Set(normalized)];
}
