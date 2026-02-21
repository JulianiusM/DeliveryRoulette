import * as restaurantService from "../modules/database/services/RestaurantService";
import * as menuService from "../modules/database/services/MenuService";
import {ValidationError, ExpectedError} from "../modules/lib/errors";
import {Restaurant} from "../modules/database/entities/restaurant/Restaurant";
import {MenuCategory} from "../modules/database/entities/menu/MenuCategory";

const LIST_TEMPLATE = 'restaurants/index';
const FORM_TEMPLATE = 'restaurants/form';
const DETAIL_TEMPLATE = 'restaurants/detail';

// ── Helpers ─────────────────────────────────────────────────

async function requireRestaurant(id: string): Promise<Restaurant> {
    const restaurant = await restaurantService.getRestaurantById(id);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    return restaurant;
}

// ── List / Detail / Edit data ───────────────────────────────

export async function listRestaurants(options: {
    search?: string;
    activeFilter?: string;
}): Promise<{restaurants: Restaurant[]; search?: string; active?: string}> {
    let isActive: boolean | undefined;
    if (options.activeFilter === 'true') isActive = true;
    else if (options.activeFilter === 'false') isActive = false;

    const restaurants = await restaurantService.listRestaurants({search: options.search, isActive});
    return {restaurants, search: options.search, active: options.activeFilter};
}

export async function getRestaurantDetail(id: string): Promise<{restaurant: Restaurant; categories: MenuCategory[]}> {
    const restaurant = await requireRestaurant(id);
    const categories = await menuService.listCategoriesByRestaurant(restaurant.id);
    return {restaurant, categories};
}

export async function getRestaurantEditData(id: string): Promise<object> {
    const restaurant = await requireRestaurant(id);
    return {
        editing: true,
        id: restaurant.id,
        name: restaurant.name,
        addressLine1: restaurant.addressLine1,
        addressLine2: restaurant.addressLine2,
        city: restaurant.city,
        postalCode: restaurant.postalCode,
        country: restaurant.country,
        isActive: restaurant.isActive,
    };
}

// ── Create / Update ─────────────────────────────────────────

export async function createRestaurant(body: any): Promise<Restaurant> {
    const {name, addressLine1, addressLine2, city, postalCode, country} = body;
    const returnInfo = {name, addressLine1, addressLine2, city, postalCode, country};

    if (!name || !name.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'Name is required.', returnInfo);
    }
    if (!addressLine1 || !addressLine1.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'Address line 1 is required.', returnInfo);
    }
    if (!city || !city.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'City is required.', returnInfo);
    }
    if (!postalCode || !postalCode.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'Postal code is required.', returnInfo);
    }

    return await restaurantService.createRestaurant({
        name: name.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2?.trim() || null,
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country?.trim() || '',
    });
}

export async function updateRestaurant(id: string, body: any): Promise<Restaurant> {
    const {name, addressLine1, addressLine2, city, postalCode, country, isActive} = body;
    const returnInfo = {id, name, addressLine1, addressLine2, city, postalCode, country, isActive};

    if (!name || !name.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'Name is required.', returnInfo);
    }
    if (!addressLine1 || !addressLine1.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'Address line 1 is required.', returnInfo);
    }
    if (!city || !city.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'City is required.', returnInfo);
    }
    if (!postalCode || !postalCode.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'Postal code is required.', returnInfo);
    }

    const restaurant = await restaurantService.updateRestaurant(id, {
        name: name.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2?.trim() || null,
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country?.trim() || '',
        isActive: isActive === 'on' || isActive === true || isActive === 'true',
    });
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    return restaurant;
}
