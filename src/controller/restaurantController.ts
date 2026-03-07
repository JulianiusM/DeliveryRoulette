import * as restaurantService from "../modules/database/services/RestaurantService";
import * as menuService from "../modules/database/services/MenuService";
import * as providerRefService from "../modules/database/services/RestaurantProviderRefService";
import * as dietOverrideService from "../modules/database/services/DietOverrideService";
import * as userRestaurantPrefService from "../modules/database/services/UserRestaurantPreferenceService";
import {ValidationError, ExpectedError} from "../modules/lib/errors";
import {Restaurant} from "../modules/database/entities/restaurant/Restaurant";
import {RestaurantProviderRef} from "../modules/database/entities/restaurant/RestaurantProviderRef";
import {UserRestaurantPreference} from "../modules/database/entities/user/UserRestaurantPreference";
import {MenuCategory} from "../modules/database/entities/menu/MenuCategory";
import {DietManualOverride} from "../modules/database/entities/diet/DietManualOverride";
import {EffectiveSuitability} from "../modules/database/services/DietOverrideService";
import {
    getOpeningHoursPresentation,
    OpeningHoursPresentation,
    OpeningHoursStatus,
    resolveRestaurantTimeZone,
} from "../modules/lib/openingHours";
import {queueMenuSyncByProviderRef, QueuedSyncJob} from "../modules/sync/ProviderSyncService";
import * as menuItemDietOverrideService from "../modules/database/services/MenuItemDietOverrideService";
import * as dietInferenceService from "../modules/database/services/DietInferenceService";
import * as cuisineInferenceService from "../modules/database/services/CuisineInferenceService";
import {buildRestaurantInsightSummary, RestaurantInsightSummary} from "../modules/lib/restaurantInsights";

const LIST_TEMPLATE = 'restaurants/index';
const FORM_TEMPLATE = 'restaurants/form';
const DETAIL_TEMPLATE = 'restaurants/detail';

type TriStateFilter = 'all' | 'positive' | 'negative';
type OpenStateFilter = 'all' | 'open' | 'closed' | 'unknown';

export interface RestaurantListCard {
    restaurant: Restaurant;
    providerCuisines: string[];
    cuisineProfile: ReturnType<typeof cuisineInferenceService.parseCuisineInference>;
    insightSummary: RestaurantInsightSummary;
    isFavorite: boolean;
    doNotSuggest: boolean;
    isOpenNow: boolean | null;
    availabilityStatus: OpeningHoursStatus;
}

interface RestaurantPreferenceState {
    isFavorite: boolean;
    doNotSuggest: boolean;
}

// ── Helpers ─────────────────────────────────────────────────

async function requireRestaurant(id: string): Promise<Restaurant> {
    const restaurant = await restaurantService.getRestaurantById(id);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    return restaurant;
}

function normalizeTriStateFilter(value?: string): TriStateFilter {
    if (value === 'positive' || value === 'negative') {
        return value;
    }
    return 'all';
}

function normalizeOpenFilter(value?: string): OpenStateFilter {
    if (value === 'open' || value === 'closed' || value === 'unknown') {
        return value;
    }
    return 'all';
}

function getRestaurantPreferenceState(
    preferenceMap: Map<string, RestaurantPreferenceState>,
    restaurantId: string,
): RestaurantPreferenceState {
    return preferenceMap.get(restaurantId) ?? {isFavorite: false, doNotSuggest: false};
}

function matchesTriStateFilter(value: boolean, filter: TriStateFilter): boolean {
    if (filter === 'positive') {
        return value;
    }
    if (filter === 'negative') {
        return !value;
    }
    return true;
}

function matchesOpenFilter(value: boolean | null, filter: OpenStateFilter): boolean {
    if (filter === 'open') {
        return value === true;
    }
    if (filter === 'closed') {
        return value === false;
    }
    if (filter === 'unknown') {
        return value === null;
    }
    return true;
}

function buildUnknownOpeningStatus(): OpeningHoursStatus {
    return {
        state: 'unknown',
        isOpenNow: null,
        summaryLabel: 'Hours unknown',
        detailLabel: 'No opening hours stored for this restaurant.',
    };
}

// ── List / Detail / Edit data ───────────────────────────────

export async function listRestaurants(options: {
    search?: string;
    activeFilter?: string;
    favoriteFilter?: string;
    suggestionFilter?: string;
    openFilter?: string;
    userId?: number;
}): Promise<{
    restaurants: RestaurantListCard[];
    search?: string;
    active?: string;
    favoriteFilter: TriStateFilter;
    suggestionFilter: TriStateFilter;
    openFilter: OpenStateFilter;
}> {
    let isActive: boolean | undefined;
    if (options.activeFilter === 'true') isActive = true;
    else if (options.activeFilter === 'false') isActive = false;

    const restaurants = await restaurantService.listRestaurants({search: options.search, isActive});

    const favoriteFilter = normalizeTriStateFilter(options.favoriteFilter);
    const suggestionFilter = normalizeTriStateFilter(options.suggestionFilter);
    const openFilter = normalizeOpenFilter(options.openFilter);

    const preferences = options.userId
        ? await userRestaurantPrefService.getAllByUserId(options.userId)
        : [];
    const preferenceMap = new Map<string, RestaurantPreferenceState>(
        preferences.map((preference) => [preference.restaurantId, {
            isFavorite: !!preference.isFavorite,
            doNotSuggest: !!preference.doNotSuggest,
        }]),
    );
    const openingStatusMap = new Map<string, OpeningHoursStatus>(
        restaurants.map((restaurant) => [
            restaurant.id,
            getOpeningHoursPresentation(restaurant.openingHours, {
                timeZone: resolveRestaurantTimeZone(restaurant.country),
                preferredService: 'delivery',
            }).status,
        ]),
    );

    const filteredRestaurants = restaurants.filter((restaurant) => {
        const preferenceState = getRestaurantPreferenceState(preferenceMap, restaurant.id);
        const isOpenNow = openingStatusMap.get(restaurant.id)?.isOpenNow ?? null;

        return matchesTriStateFilter(preferenceState.isFavorite, favoriteFilter)
            && matchesTriStateFilter(preferenceState.doNotSuggest, suggestionFilter)
            && matchesOpenFilter(isOpenNow, openFilter);
    });

    const cards = await Promise.all(filteredRestaurants.map(async (restaurant) => {
        const [categories, dietSuitability] = await Promise.all([
            menuService.listCategoriesByRestaurant(restaurant.id),
            dietOverrideService.computeEffectiveSuitability(restaurant.id),
        ]);
        const preferenceState = getRestaurantPreferenceState(preferenceMap, restaurant.id);
        const availabilityStatus = openingStatusMap.get(restaurant.id) ?? buildUnknownOpeningStatus();

        return {
            restaurant,
            providerCuisines: (restaurant.providerCuisines ?? []).map((cuisine) => cuisine.value),
            cuisineProfile: cuisineInferenceService.parseCuisineInference(restaurant.cuisineInferenceJson),
            insightSummary: buildRestaurantInsightSummary(categories, dietSuitability),
            isFavorite: preferenceState.isFavorite,
            doNotSuggest: preferenceState.doNotSuggest,
            isOpenNow: availabilityStatus.isOpenNow,
            availabilityStatus,
        };
    }));

    return {
        restaurants: cards,
        search: options.search,
        active: options.activeFilter,
        favoriteFilter,
        suggestionFilter,
        openFilter,
    };
}

export async function getRestaurantDetail(id: string, userId?: number): Promise<{restaurant: Restaurant; categories: MenuCategory[]; providerRefs: RestaurantProviderRef[]; dietSuitability: EffectiveSuitability[]; insightSummary: RestaurantInsightSummary; itemDietChips: Record<string, Array<{dietTagId: string; label: string; source: 'heuristic' | 'manual'}>>; cuisineProfile: ReturnType<typeof cuisineInferenceService.parseCuisineInference>; providerCuisines: string[]; isFavorite: boolean; doNotSuggest: boolean; isOpenNow: boolean | null; openingHoursPresentation: OpeningHoursPresentation}> {
    const restaurant = await requireRestaurant(id);
    const categories = await menuService.listCategoriesByRestaurant(restaurant.id);
    const providerRefs = await providerRefService.listByRestaurant(restaurant.id);
    const dietSuitability = await dietOverrideService.computeEffectiveSuitability(restaurant.id);
    const insightSummary = buildRestaurantInsightSummary(categories, dietSuitability);
    const itemDietChips = await buildItemDietChips(categories, dietSuitability);
    const cuisineProfile = cuisineInferenceService.parseCuisineInference(restaurant.cuisineInferenceJson);
    const providerCuisines = (restaurant.providerCuisines ?? []).map((c) => c.value);

    let isFavorite = false;
    let doNotSuggest = false;
    if (userId) {
        const pref = await userRestaurantPrefService.getByUserAndRestaurant(userId, restaurant.id);
        if (pref) {
            isFavorite = !!pref.isFavorite;
            doNotSuggest = !!pref.doNotSuggest;
        }
    }

    const openingHoursPresentation = getOpeningHoursPresentation(restaurant.openingHours, {
        timeZone: resolveRestaurantTimeZone(restaurant.country),
        preferredService: 'delivery',
    });
    const isOpenNow = openingHoursPresentation.status.isOpenNow;

    return {restaurant, categories, providerRefs, dietSuitability, insightSummary, itemDietChips, cuisineProfile, providerCuisines, isFavorite, doNotSuggest, isOpenNow, openingHoursPresentation};
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

export async function queueProviderRefMenuSync(
    restaurantId: string,
    refId: string,
): Promise<QueuedSyncJob> {
    await requireRestaurant(restaurantId);
    const ref = await providerRefService.getByIdForRestaurant(refId, restaurantId);
    if (!ref) {
        throw new ExpectedError('Provider reference not found.', 'error', 404);
    }

    return await queueMenuSyncByProviderRef(restaurantId, refId);
}

export async function runDietInference(restaurantId: string): Promise<number> {
    await requireRestaurant(restaurantId);
    const results = await dietInferenceService.computeForRestaurant(restaurantId);
    await cuisineInferenceService.recomputeForRestaurant(restaurantId);
    return results.length;
}

async function buildItemDietChips(
    categories: MenuCategory[],
    dietSuitability: EffectiveSuitability[],
): Promise<Record<string, Array<{dietTagId: string; label: string; source: 'heuristic' | 'manual'}>>> {
    const itemIds = categories.flatMap((category) => (category.items ?? []).map((item) => item.id));
    if (itemIds.length === 0) {
        return {};
    }

    const overrides = await menuItemDietOverrideService.listByItemIds(itemIds);
    const explicitTrue = new Set<string>();
    const explicitFalse = new Set<string>();
    const chipMap = new Map<string, Map<string, {dietTagId: string; label: string; source: 'heuristic' | 'manual'}>>();

    for (const override of overrides) {
        const key = `${override.menuItemId}|${override.dietTagId}`;
        if (override.supported) {
            explicitTrue.add(key);
        } else {
            explicitFalse.add(key);
        }
    }

    for (const suitability of dietSuitability) {
        const reasons = suitability.inference?.reasons;
        const matchedItems = reasons?.matchedItems ?? [];
        for (const matchedItem of matchedItems) {
            const key = `${matchedItem.itemId}|${suitability.dietTagId}`;
            if (explicitFalse.has(key)) {
                continue;
            }

            const byTag = chipMap.get(matchedItem.itemId) ?? new Map<string, {dietTagId: string; label: string; source: 'heuristic' | 'manual'}>();
            byTag.set(suitability.dietTagId, {
                dietTagId: suitability.dietTagId,
                label: suitability.dietTagLabel,
                source: 'heuristic',
            });
            chipMap.set(matchedItem.itemId, byTag);
        }
    }

    for (const override of overrides) {
        if (!override.supported) {
            continue;
        }
        const tag = dietSuitability.find((suitability) => suitability.dietTagId === override.dietTagId);
        if (!tag) {
            continue;
        }

        const byTag = chipMap.get(override.menuItemId) ?? new Map<string, {dietTagId: string; label: string; source: 'heuristic' | 'manual'}>();
        byTag.set(tag.dietTagId, {
            dietTagId: tag.dietTagId,
            label: tag.dietTagLabel,
            source: 'manual',
        });
        chipMap.set(override.menuItemId, byTag);
    }

    const output: Record<string, Array<{dietTagId: string; label: string; source: 'heuristic' | 'manual'}>> = {};
    for (const [itemId, byTag] of chipMap.entries()) {
        output[itemId] = [...byTag.values()].sort((a, b) => a.label.localeCompare(b.label));
    }
    return output;
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

export async function toggleFavorite(restaurantId: string, userId: number): Promise<UserRestaurantPreference> {
    await requireRestaurant(restaurantId);
    return await userRestaurantPrefService.toggleFavorite(userId, restaurantId);
}

export async function toggleDoNotSuggest(restaurantId: string, userId: number): Promise<UserRestaurantPreference> {
    await requireRestaurant(restaurantId);
    return await userRestaurantPrefService.toggleDoNotSuggest(userId, restaurantId);
}
