import {AppDataSource} from '../dataSource';
import {Restaurant} from '../entities/restaurant/Restaurant';

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
