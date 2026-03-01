import {AppDataSource} from '../dataSource';
import {Restaurant} from '../entities/restaurant/Restaurant';
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
    providerCuisinesJson?: string | null;
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
    providerCuisinesJson?: string | null;
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
    return await repo.findOne({where: {id}});
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
        const all = await repo.find();
        const existing = all.find(
            (r) => r.name.toLowerCase() === incoming.name.toLowerCase(),
        );
        const providerCuisinesJson = normalizeCuisineJson(incoming.cuisines);

        if (existing) {
            Object.assign(existing, {
                addressLine1: incoming.address ?? '',
                addressLine2: incoming.addressLine2 ?? null,
                city: incoming.city ?? '',
                postalCode: incoming.postalCode ?? '',
                country: incoming.country ?? '',
                openingHours: incoming.openingHours ?? existing.openingHours ?? null,
                openingDays: incoming.openingDays ?? existing.openingDays ?? null,
                providerCuisinesJson: providerCuisinesJson ?? existing.providerCuisinesJson ?? null,
                isActive: true,
            });
            existing.updatedAt = new Date();
            await repo.save(existing);
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
            providerCuisinesJson,
            isActive: true,
        });
        const saved = await repo.save(created);
        return saved.id;
    });
}

function normalizeCuisineJson(cuisines?: string[] | null): string | null {
    if (!cuisines || cuisines.length === 0) return null;
    const normalized = cuisines
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    if (normalized.length === 0) return null;
    const deduped = [...new Set(normalized)];
    return JSON.stringify(deduped);
}
