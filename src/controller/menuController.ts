import * as menuService from "../modules/database/services/MenuService";
import * as restaurantService from "../modules/database/services/RestaurantService";
import * as dietTagService from "../modules/database/services/DietTagService";
import * as menuItemDietOverrideService from "../modules/database/services/MenuItemDietOverrideService";
import * as dietInferenceService from "../modules/database/services/DietInferenceService";
import * as cuisineInferenceService from "../modules/database/services/CuisineInferenceService";
import {ValidationError, ExpectedError} from "../modules/lib/errors";
import {MenuCategory} from "../modules/database/entities/menu/MenuCategory";
import {MenuItem} from "../modules/database/entities/menu/MenuItem";
import {Restaurant} from "../modules/database/entities/restaurant/Restaurant";
import {DietTag} from "../modules/database/entities/diet/DietTag";

const CATEGORY_FORM_TEMPLATE = 'restaurants/menu/categoryForm';
const ITEM_FORM_TEMPLATE = 'restaurants/menu/itemForm';

// ── Helpers ─────────────────────────────────────────────────

async function requireRestaurant(id: string): Promise<Restaurant> {
    const restaurant = await restaurantService.getRestaurantById(id);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    return restaurant;
}

async function requireCategory(id: string): Promise<MenuCategory> {
    const category = await menuService.getCategoryById(id);
    if (!category) {
        throw new ExpectedError('Category not found', 'error', 404);
    }
    return category;
}

async function requireItem(id: string): Promise<MenuItem> {
    const item = await menuService.getItemById(id);
    if (!item) {
        throw new ExpectedError('Item not found', 'error', 404);
    }
    return item;
}

interface ItemDietTagOption {
    id: string;
    key: string;
    label: string;
    selected: 'auto' | 'true' | 'false';
}

function parseAllergensInput(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const parts = raw
        .split(/[\n,]/g)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    if (parts.length === 0) return null;
    return [...new Set(parts)].join(', ');
}

function parseItemDietOverrideInputs(
    body: any,
    dietTags: DietTag[],
): Array<{dietTagId: string; supported: boolean}> {
    const raw = body?.dietOverride;
    if (!raw || typeof raw !== 'object') {
        return [];
    }

    const byTagId = raw as Record<string, unknown>;
    return dietTags.flatMap((tag) => {
        const value = byTagId[tag.id];
        if (value !== 'true' && value !== 'false') {
            return [];
        }
        return [{
            dietTagId: tag.id,
            supported: value === 'true',
        }];
    });
}

function buildItemDietTagOptions(
    dietTags: DietTag[],
    selectedByTagId: Map<string, boolean> = new Map(),
): ItemDietTagOption[] {
    return dietTags.map((tag) => {
        const selected = selectedByTagId.has(tag.id)
            ? (selectedByTagId.get(tag.id) ? 'true' : 'false')
            : 'auto';

        return {
            id: tag.id,
            key: tag.key,
            label: tag.label,
            selected,
        };
    });
}

// ── Category form data ──────────────────────────────────────

export async function getCategoryFormData(restaurantId: string): Promise<object> {
    const restaurant = await requireRestaurant(restaurantId);
    return {editing: false, restaurantId: restaurant.id};
}

export async function getCategoryEditData(restaurantId: string, categoryId: string): Promise<object> {
    const restaurant = await requireRestaurant(restaurantId);
    const category = await requireCategory(categoryId);
    return {
        editing: true,
        restaurantId: restaurant.id,
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
    };
}

// ── Category validation & delegation ────────────────────────

export async function createCategory(restaurantId: string, body: any): Promise<MenuCategory> {
    const restaurant = await requireRestaurant(restaurantId);
    const {name, sortOrder} = body;
    const returnInfo = {restaurantId: restaurant.id, name, sortOrder};

    if (!name || !name.trim()) {
        throw new ValidationError(CATEGORY_FORM_TEMPLATE, 'Category name is required.', returnInfo);
    }

    return await menuService.createCategory({
        name: name.trim(),
        sortOrder: sortOrder ? parseInt(sortOrder, 10) || 0 : 0,
        restaurantId: restaurant.id,
    });
}

export async function updateCategory(restaurantId: string, categoryId: string, body: any): Promise<MenuCategory> {
    const restaurant = await requireRestaurant(restaurantId);
    const {name, sortOrder, isActive} = body;
    const returnInfo = {id: categoryId, name, sortOrder, isActive};

    if (!name || !name.trim()) {
        throw new ValidationError(CATEGORY_FORM_TEMPLATE, 'Category name is required.', returnInfo);
    }

    const category = await menuService.updateCategory(categoryId, {
        name: name.trim(),
        sortOrder: sortOrder ? parseInt(sortOrder, 10) || 0 : 0,
        isActive: isActive === 'on' || isActive === true || isActive === 'true',
    });
    if (!category) {
        throw new ExpectedError('Category not found', 'error', 404);
    }
    return category;
}

// ── Item form data ──────────────────────────────────────────

export async function getItemFormData(restaurantId: string, categoryId: string): Promise<object> {
    const restaurant = await requireRestaurant(restaurantId);
    const category = await requireCategory(categoryId);
    const dietTags = await dietTagService.listDietTags();
    return {
        editing: false,
        restaurantId: restaurant.id,
        categoryId: category.id,
        allergens: '',
        dietTags: buildItemDietTagOptions(dietTags),
    };
}

export async function getItemEditData(restaurantId: string, itemId: string): Promise<object> {
    const restaurant = await requireRestaurant(restaurantId);
    const item = await requireItem(itemId);
    const [dietTags, overrides] = await Promise.all([
        dietTagService.listDietTags(),
        menuItemDietOverrideService.listByItem(item.id),
    ]);
    const selectedByTagId = new Map(overrides.map((override) => [override.dietTagId, !!override.supported]));
    return {
        editing: true,
        restaurantId: restaurant.id,
        categoryId: item.categoryId,
        id: item.id,
        name: item.name,
        description: item.description,
        allergens: item.allergens,
        price: item.price,
        currency: item.currency,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
        dietTags: buildItemDietTagOptions(dietTags, selectedByTagId),
    };
}

// ── Item validation & delegation ────────────────────────────

export async function createItem(restaurantId: string, categoryId: string, body: any): Promise<MenuItem> {
    await requireRestaurant(restaurantId);
    const category = await requireCategory(categoryId);
    const {name, description, allergens, price, currency} = body;
    const dietTags = await dietTagService.listDietTags();
    const selectedOverrides = parseItemDietOverrideInputs(body, dietTags);
    const selectedByTagId = new Map(selectedOverrides.map((entry) => [entry.dietTagId, entry.supported]));
    const returnInfo = {
        categoryId: category.id,
        name,
        description,
        allergens,
        price,
        currency,
        dietTags: buildItemDietTagOptions(dietTags, selectedByTagId),
    };

    if (!name || !name.trim()) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Item name is required.', returnInfo);
    }

    const parsedPrice = price ? parseFloat(price) : null;
    if (parsedPrice !== null && isNaN(parsedPrice)) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Price must be a valid number.', returnInfo);
    }

    if (currency && currency.trim().length > 3) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Currency code must be at most 3 characters.', returnInfo);
    }

    if (allergens && String(allergens).length > 2000) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Allergens text must be at most 2000 characters.', returnInfo);
    }

    const item = await menuService.createItem({
        name: name.trim(),
        description: description?.trim() || null,
        allergens: parseAllergensInput(allergens),
        price: parsedPrice,
        currency: currency?.trim() || null,
        categoryId: category.id,
    });

    await menuItemDietOverrideService.replaceForItem(item.id, selectedOverrides);
    await dietInferenceService.recomputeAfterMenuChange(restaurantId);
    await cuisineInferenceService.recomputeForRestaurant(restaurantId);

    return item;
}

export async function updateItem(restaurantId: string, itemId: string, body: any): Promise<MenuItem> {
    await requireRestaurant(restaurantId);
    const {name, description, allergens, price, currency, sortOrder, isActive} = body;
    const [dietTags, existingOverrides] = await Promise.all([
        dietTagService.listDietTags(),
        menuItemDietOverrideService.listByItem(itemId),
    ]);
    const existingByTagId = new Map(existingOverrides.map((override) => [override.dietTagId, !!override.supported]));
    const submittedOverrides = parseItemDietOverrideInputs(body, dietTags);
    const submittedByTagId = new Map(submittedOverrides.map((entry) => [entry.dietTagId, entry.supported]));
    const hasSubmittedDietOverrideObject = Boolean(body?.dietOverride && typeof body.dietOverride === 'object');
    const returnInfo = {
        id: itemId,
        name,
        description,
        allergens,
        price,
        currency,
        sortOrder,
        isActive,
        dietTags: buildItemDietTagOptions(
            dietTags,
            hasSubmittedDietOverrideObject ? submittedByTagId : existingByTagId,
        ),
    };

    if (!name || !name.trim()) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Item name is required.', returnInfo);
    }

    const parsedPrice = price ? parseFloat(price) : null;
    if (parsedPrice !== null && isNaN(parsedPrice)) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Price must be a valid number.', returnInfo);
    }

    if (currency && currency.trim().length > 3) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Currency code must be at most 3 characters.', returnInfo);
    }

    if (allergens && String(allergens).length > 2000) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Allergens text must be at most 2000 characters.', returnInfo);
    }

    const item = await menuService.updateItem(itemId, {
        name: name.trim(),
        description: description?.trim() || null,
        allergens: parseAllergensInput(allergens),
        price: parsedPrice,
        currency: currency?.trim() || null,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) || 0 : 0,
        isActive: isActive === 'on' || isActive === true || isActive === 'true',
    });
    if (!item) {
        throw new ExpectedError('Item not found', 'error', 404);
    }

    await menuItemDietOverrideService.replaceForItem(item.id, submittedOverrides);
    await dietInferenceService.recomputeAfterMenuChange(restaurantId);
    await cuisineInferenceService.recomputeForRestaurant(restaurantId);

    return item;
}
