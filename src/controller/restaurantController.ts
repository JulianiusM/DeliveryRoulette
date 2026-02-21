import * as restaurantService from "../modules/database/services/RestaurantService";
import * as menuService from "../modules/database/services/MenuService";
import * as providerRefService from "../modules/database/services/RestaurantProviderRefService";
import * as dietOverrideService from "../modules/database/services/DietOverrideService";
import * as userRestaurantPrefService from "../modules/database/services/UserRestaurantPreferenceService";
import {ValidationError, ExpectedError} from "../modules/lib/errors";
import {Restaurant} from "../modules/database/entities/restaurant/Restaurant";
import {RestaurantProviderRef} from "../modules/database/entities/restaurant/RestaurantProviderRef";
import {MenuCategory} from "../modules/database/entities/menu/MenuCategory";
import {DietManualOverride} from "../modules/database/entities/diet/DietManualOverride";
import {EffectiveSuitability} from "../modules/database/services/DietOverrideService";

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

export async function getRestaurantDetail(id: string, userId?: number): Promise<{restaurant: Restaurant; categories: MenuCategory[]; providerRefs: RestaurantProviderRef[]; dietSuitability: EffectiveSuitability[]; isFavorite: boolean; doNotSuggest: boolean}> {
    const restaurant = await requireRestaurant(id);
    const categories = await menuService.listCategoriesByRestaurant(restaurant.id);
    const providerRefs = await providerRefService.listByRestaurant(restaurant.id);
    const dietSuitability = await dietOverrideService.computeEffectiveSuitability(restaurant.id);

    let isFavorite = false;
    let doNotSuggest = false;
    if (userId) {
        const pref = await userRestaurantPrefService.getByUserAndRestaurant(userId, restaurant.id);
        if (pref) {
            isFavorite = !!pref.isFavorite;
            doNotSuggest = !!pref.doNotSuggest;
        }
    }

    return {restaurant, categories, providerRefs, dietSuitability, isFavorite, doNotSuggest};
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

// ── Provider References ─────────────────────────────────────

export async function addProviderRef(restaurantId: string, body: any): Promise<RestaurantProviderRef> {
    await requireRestaurant(restaurantId);

    const {providerKey, externalId, url} = body;

    if (!providerKey || !providerKey.trim()) {
        throw new ExpectedError('Provider key is required.', 'error', 400);
    }
    if (!url || !url.trim()) {
        throw new ExpectedError('URL is required.', 'error', 400);
    }

    return await providerRefService.addProviderRef({
        restaurantId,
        providerKey: providerKey.trim(),
        externalId: externalId?.trim() || null,
        url: url.trim(),
    });
}

export async function removeProviderRef(restaurantId: string, refId: string): Promise<void> {
    await requireRestaurant(restaurantId);

    const removed = await providerRefService.removeProviderRef(refId, restaurantId);
    if (!removed) {
        throw new ExpectedError('Provider reference not found.', 'error', 404);
    }
}

// ── Diet Manual Overrides ───────────────────────────────────

export async function addDietOverride(restaurantId: string, body: any, userId: number): Promise<DietManualOverride> {
    await requireRestaurant(restaurantId);

    const {dietTagId, supported, notes} = body;

    if (!dietTagId || !dietTagId.trim()) {
        throw new ExpectedError('Diet tag is required.', 'error', 400);
    }
    if (supported === undefined || supported === null || supported === '') {
        throw new ExpectedError('Supported value is required.', 'error', 400);
    }

    return await dietOverrideService.addOverride({
        restaurantId,
        dietTagId: dietTagId.trim(),
        supported: supported === 'true' || supported === true || supported === '1',
        userId,
        notes: notes?.trim() || null,
    });
}

export async function removeDietOverride(restaurantId: string, overrideId: string): Promise<void> {
    await requireRestaurant(restaurantId);

    const removed = await dietOverrideService.removeOverride(overrideId, restaurantId);
    if (!removed) {
        throw new ExpectedError('Diet override not found.', 'error', 404);
    }
}

// ── User Restaurant Preferences ─────────────────────────────

export async function toggleFavorite(restaurantId: string, userId: number): Promise<void> {
    await requireRestaurant(restaurantId);
    await userRestaurantPrefService.toggleFavorite(userId, restaurantId);
}

export async function toggleDoNotSuggest(restaurantId: string, userId: number): Promise<void> {
    await requireRestaurant(restaurantId);
    await userRestaurantPrefService.toggleDoNotSuggest(userId, restaurantId);
}
