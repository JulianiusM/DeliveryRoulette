import * as menuService from "../modules/database/services/MenuService";
import {ValidationError} from "../modules/lib/errors";
import {MenuCategory} from "../modules/database/entities/menu/MenuCategory";
import {MenuItem} from "../modules/database/entities/menu/MenuItem";

const CATEGORY_FORM_TEMPLATE = 'restaurants/menu/categoryForm';
const ITEM_FORM_TEMPLATE = 'restaurants/menu/itemForm';

// ── Category validation & delegation ────────────────────────

export async function createCategory(restaurantId: string, body: any): Promise<MenuCategory> {
    const {name, sortOrder} = body;
    const returnInfo = {restaurantId, name, sortOrder};

    if (!name || !name.trim()) {
        throw new ValidationError(CATEGORY_FORM_TEMPLATE, 'Category name is required.', returnInfo);
    }

    return await menuService.createCategory({
        name: name.trim(),
        sortOrder: sortOrder ? parseInt(sortOrder, 10) || 0 : 0,
        restaurantId,
    });
}

export async function updateCategory(id: string, body: any): Promise<MenuCategory | null> {
    const {name, sortOrder, isActive} = body;
    const returnInfo = {id, name, sortOrder, isActive};

    if (!name || !name.trim()) {
        throw new ValidationError(CATEGORY_FORM_TEMPLATE, 'Category name is required.', returnInfo);
    }

    return await menuService.updateCategory(id, {
        name: name.trim(),
        sortOrder: sortOrder ? parseInt(sortOrder, 10) || 0 : 0,
        isActive: isActive === 'on' || isActive === true || isActive === 'true',
    });
}

// ── Item validation & delegation ────────────────────────────

export async function createItem(categoryId: string, body: any): Promise<MenuItem> {
    const {name, description, price, currency} = body;
    const returnInfo = {categoryId, name, description, price, currency};

    if (!name || !name.trim()) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Item name is required.', returnInfo);
    }

    const parsedPrice = price ? parseFloat(price) : null;
    if (parsedPrice !== null && isNaN(parsedPrice)) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Price must be a valid number.', returnInfo);
    }

    if (parsedPrice !== null && currency && currency.trim().length > 3) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Currency code must be at most 3 characters.', returnInfo);
    }

    return await menuService.createItem({
        name: name.trim(),
        description: description?.trim() || null,
        price: parsedPrice,
        currency: currency?.trim() || null,
        categoryId,
    });
}

export async function updateItem(id: string, body: any): Promise<MenuItem | null> {
    const {name, description, price, currency, sortOrder, isActive} = body;
    const returnInfo = {id, name, description, price, currency, sortOrder, isActive};

    if (!name || !name.trim()) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Item name is required.', returnInfo);
    }

    const parsedPrice = price ? parseFloat(price) : null;
    if (parsedPrice !== null && isNaN(parsedPrice)) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Price must be a valid number.', returnInfo);
    }

    if (parsedPrice !== null && currency && currency.trim().length > 3) {
        throw new ValidationError(ITEM_FORM_TEMPLATE, 'Currency code must be at most 3 characters.', returnInfo);
    }

    return await menuService.updateItem(id, {
        name: name.trim(),
        description: description?.trim() || null,
        price: parsedPrice,
        currency: currency?.trim() || null,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) || 0 : 0,
        isActive: isActive === 'on' || isActive === true || isActive === 'true',
    });
}
