import {AppDataSource} from '../dataSource';
import {Restaurant} from '../entities/restaurant/Restaurant';
import {RestaurantCuisine} from '../entities/restaurant/RestaurantCuisine';
import {RestaurantProviderRef} from '../entities/restaurant/RestaurantProviderRef';
import {ProviderRestaurant} from '../../../providers/ProviderTypes';
import {filterRestaurantsBySearch} from '../../lib/restaurantSearch';

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
    latitude?: number | null;
    longitude?: number | null;
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
    latitude?: number | null;
    longitude?: number | null;
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
    const qb = repo.createQueryBuilder('r')
        .leftJoinAndSelect('r.providerCuisines', 'providerCuisine');

    if (options.isActive !== undefined) {
        qb.where('r.is_active = :isActive', {isActive: options.isActive ? 1 : 0});
    }

    qb.orderBy('r.name', 'ASC');

    const restaurants = await qb.getMany();
    return filterRestaurantsBySearch(restaurants, options.search);
}

/**
 * Create or update a restaurant from normalised provider data.
 * Returns the restaurant ID.
 * Wrapped in a transaction to prevent partial writes.
 */
export async function upsertFromProvider(
    providerKey: string,
    incoming: ProviderRestaurant,
): Promise<string> {
    return AppDataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Restaurant);
        const cuisineRepo = manager.getRepository(RestaurantCuisine);
        const providerRefRepo = manager.getRepository(RestaurantProviderRef);
        const existing = await findExistingRestaurant(repo, providerRefRepo, providerKey, incoming);
        const providerCuisines = normalizeCuisineList(incoming.cuisines);

        if (existing) {
            Object.assign(existing, {
                addressLine1: incoming.address ?? '',
                addressLine2: incoming.addressLine2 ?? null,
                city: incoming.city ?? '',
                postalCode: incoming.postalCode ?? '',
                country: incoming.country ?? '',
                latitude: incoming.latitude ?? existing.latitude ?? null,
                longitude: incoming.longitude ?? existing.longitude ?? null,
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
            latitude: incoming.latitude ?? null,
            longitude: incoming.longitude ?? null,
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

async function findExistingRestaurant(
    restaurantRepo: import('typeorm').Repository<Restaurant>,
    providerRefRepo: import('typeorm').Repository<RestaurantProviderRef>,
    providerKey: string,
    incoming: ProviderRestaurant,
): Promise<Restaurant | null> {
    const normalizedExternalId = normalizeIdentityValue(incoming.externalId);
    const normalizedProviderNativeId = normalizeIdentityValue(incoming.providerNativeId);

    if (normalizedExternalId || normalizedProviderNativeId) {
        const providerRefQb = providerRefRepo.createQueryBuilder('provider_ref')
            .where('LOWER(provider_ref.providerKey) = LOWER(:providerKey)', {providerKey});

        if (normalizedExternalId && normalizedProviderNativeId) {
            providerRefQb.andWhere(
                '(provider_ref.externalId = :externalId OR provider_ref.providerNativeId = :providerNativeId)',
                {
                    externalId: normalizedExternalId,
                    providerNativeId: normalizedProviderNativeId,
                },
            );
        } else if (normalizedExternalId) {
            providerRefQb.andWhere('provider_ref.externalId = :externalId', {externalId: normalizedExternalId});
        } else if (normalizedProviderNativeId) {
            providerRefQb.andWhere('provider_ref.providerNativeId = :providerNativeId', {
                providerNativeId: normalizedProviderNativeId,
            });
        }

        const providerRef = await providerRefQb.getOne();
        if (providerRef) {
            return await restaurantRepo.findOne({where: {id: providerRef.restaurantId}});
        }
    }

    const restaurants = await restaurantRepo.find();
    const incomingName = normalizeTextKey(incoming.name);
    const incomingExactAddress = buildExactAddressKey({
        addressLine1: incoming.address ?? null,
        addressLine2: incoming.addressLine2 ?? null,
        city: incoming.city ?? null,
        postalCode: incoming.postalCode ?? null,
        country: incoming.country ?? null,
    });
    const incomingPostalCity = buildPostalCityKey(incoming.city ?? null, incoming.postalCode ?? null);

    return restaurants.find((restaurant) => {
        if (normalizeTextKey(restaurant.name) !== incomingName) {
            return false;
        }

        const restaurantExactAddress = buildExactAddressKey(restaurant);
        if (incomingExactAddress && restaurantExactAddress && incomingExactAddress === restaurantExactAddress) {
            return true;
        }

        const restaurantPostalCity = buildPostalCityKey(restaurant.city, restaurant.postalCode);
        return Boolean(incomingPostalCity && restaurantPostalCity && incomingPostalCity === restaurantPostalCity);
    }) ?? null;
}

function normalizeIdentityValue(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function normalizeTextKey(value?: string | null): string {
    return (value ?? '').trim().toLowerCase();
}

function buildExactAddressKey(location: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
}): string | null {
    const parts = [
        location.addressLine1,
        location.addressLine2,
        location.city,
        location.postalCode,
        location.country,
    ]
        .map((value) => normalizeTextKey(value))
        .filter((value) => value.length > 0);

    return parts.length >= 3 ? parts.join('|') : null;
}

function buildPostalCityKey(city?: string | null, postalCode?: string | null): string | null {
    const normalizedCity = normalizeTextKey(city);
    const normalizedPostalCode = normalizeTextKey(postalCode);
    if (!normalizedCity || !normalizedPostalCode) {
        return null;
    }
    return `${normalizedPostalCode}|${normalizedCity}`;
}
