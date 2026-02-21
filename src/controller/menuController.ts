import * as menuService from "../modules/database/services/MenuService";
import * as restaurantService from "../modules/database/services/RestaurantService";
import {ValidationError, ExpectedError} from "../modules/lib/errors";
import {MenuCategory} from "../modules/database/entities/menu/MenuCategory";
import {MenuItem} from "../modules/database/entities/menu/MenuItem";
import {Restaurant} from "../modules/database/entities/restaurant/Restaurant";

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
    return {
        editing: false,
        restaurantId: restaurant.id,
        categoryId: category.id,
    };
}

export async function getItemEditData(restaurantId: string, itemId: string): Promise<object> {
    const restaurant = await requireRestaurant(restaurantId);
    const item = await requireItem(itemId);
    return {
        editing: true,
        restaurantId: restaurant.id,
        categoryId: item.categoryId,
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        currency: item.currency,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
    };
}

// ── Item validation & delegation ────────────────────────────

export async function createItem(restaurantId: string, categoryId: string, body: any): Promise<MenuItem> {
    await requireRestaurant(restaurantId);
    const category = await requireCategory(categoryId);
    const {name, description, price, currency} = body;
    const returnInfo = {categoryId: category.id, name, description, price, currency};

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

    return await menuService.createItem({
        name: name.trim(),
        description: description?.trim() || null,
        price: parsedPrice,
        currency: currency?.trim() || null,
        categoryId: category.id,
    });
}

export async function updateItem(restaurantId: string, itemId: string, body: any): Promise<MenuItem> {
    await requireRestaurant(restaurantId);
    const {name, description, price, currency, sortOrder, isActive} = body;
    const returnInfo = {id: itemId, name, description, price, currency, sortOrder, isActive};

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

    const item = await menuService.updateItem(itemId, {
        name: name.trim(),
        description: description?.trim() || null,
        price: parsedPrice,
        currency: currency?.trim() || null,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) || 0 : 0,
        isActive: isActive === 'on' || isActive === true || isActive === 'true',
    });
    if (!item) {
        throw new ExpectedError('Item not found', 'error', 404);
    }
    return item;
}
