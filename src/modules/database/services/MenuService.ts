import {AppDataSource} from '../dataSource';
import {MenuCategory} from '../entities/menu/MenuCategory';
import {MenuItem} from '../entities/menu/MenuItem';
import {In} from 'typeorm';

// ── Category operations ─────────────────────────────────────

export async function createCategory(data: {
    name: string;
    sortOrder?: number;
    restaurantId: string;
}): Promise<MenuCategory> {
    const repo = AppDataSource.getRepository(MenuCategory);
    const category = repo.create({
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
        restaurantId: data.restaurantId,
        isActive: true,
    });
    return await repo.save(category);
}

export async function updateCategory(id: string, data: {
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
}): Promise<MenuCategory | null> {
    const repo = AppDataSource.getRepository(MenuCategory);
    const category = await repo.findOne({where: {id}});
    if (!category) return null;

    Object.assign(category, data);
    category.updatedAt = new Date();
    return await repo.save(category);
}

export async function getCategoryById(id: string): Promise<MenuCategory | null> {
    const repo = AppDataSource.getRepository(MenuCategory);
    return await repo.findOne({where: {id}, relations: ['items']});
}

export async function listCategoriesByRestaurant(restaurantId: string, includeInactive = false): Promise<MenuCategory[]> {
    const repo = AppDataSource.getRepository(MenuCategory);
    const qb = repo.createQueryBuilder('c')
        .leftJoinAndSelect('c.items', 'item')
        .where('c.restaurant_id = :restaurantId', {restaurantId})
        .orderBy('c.sort_order', 'ASC')
        .addOrderBy('c.name', 'ASC');

    if (!includeInactive) {
        qb.andWhere('c.is_active = :active', {active: 1});
        qb.andWhere('(item.is_active = :active OR item.id IS NULL)', {active: 1});
    }

    return await qb.getMany();
}

export async function deleteCategory(id: string): Promise<boolean> {
    const repo = AppDataSource.getRepository(MenuCategory);
    const result = await repo.delete(id);
    return (result.affected ?? 0) > 0;
}

// ── Item operations ─────────────────────────────────────────

export async function createItem(data: {
    name: string;
    description?: string | null;
    price?: number | null;
    currency?: string | null;
    sortOrder?: number;
    categoryId: string;
}): Promise<MenuItem> {
    const repo = AppDataSource.getRepository(MenuItem);
    const item = repo.create({
        name: data.name,
        description: data.description ?? null,
        price: data.price ?? null,
        currency: data.currency ?? null,
        sortOrder: data.sortOrder ?? 0,
        categoryId: data.categoryId,
        isActive: true,
    });
    return await repo.save(item);
}

export async function updateItem(id: string, data: {
    name?: string;
    description?: string | null;
    price?: number | null;
    currency?: string | null;
    sortOrder?: number;
    isActive?: boolean;
}): Promise<MenuItem | null> {
    const repo = AppDataSource.getRepository(MenuItem);
    const item = await repo.findOne({where: {id}});
    if (!item) return null;

    Object.assign(item, data);
    item.updatedAt = new Date();
    return await repo.save(item);
}

export async function getItemById(id: string): Promise<MenuItem | null> {
    const repo = AppDataSource.getRepository(MenuItem);
    return await repo.findOne({where: {id}});
}

export async function listItemsByCategory(categoryId: string, includeInactive = false): Promise<MenuItem[]> {
    const repo = AppDataSource.getRepository(MenuItem);
    const where: Record<string, unknown> = {categoryId};
    if (!includeInactive) {
        where.isActive = true;
    }
    return await repo.find({where, order: {sortOrder: 'ASC', name: 'ASC'}});
}

export async function deleteItem(id: string): Promise<boolean> {
    const repo = AppDataSource.getRepository(MenuItem);
    const result = await repo.delete(id);
    return (result.affected ?? 0) > 0;
}

// ── Upsert / deactivation for future sync ───────────────────

/**
 * Upsert categories for a restaurant. Creates new categories and updates
 * existing ones matched by name. Deactivates categories not present in the
 * incoming list.
 */
export async function upsertCategories(
    restaurantId: string,
    incoming: Array<{name: string; sortOrder?: number}>,
): Promise<MenuCategory[]> {
    const repo = AppDataSource.getRepository(MenuCategory);
    const existing = await repo.find({where: {restaurantId}});
    const existingByName = new Map(existing.map((c) => [c.name.toLowerCase(), c]));
    const seenIds = new Set<string>();
    const results: MenuCategory[] = [];

    for (const data of incoming) {
        const key = data.name.toLowerCase();
        const found = existingByName.get(key);
        if (found) {
            found.sortOrder = data.sortOrder ?? found.sortOrder;
            found.isActive = true;
            found.updatedAt = new Date();
            results.push(await repo.save(found));
            seenIds.add(found.id);
        } else {
            const created = await createCategory({name: data.name, sortOrder: data.sortOrder, restaurantId});
            results.push(created);
            seenIds.add(created.id);
        }
    }

    // Deactivate categories not in the incoming list
    for (const cat of existing) {
        if (!seenIds.has(cat.id) && cat.isActive) {
            cat.isActive = false;
            cat.updatedAt = new Date();
            await repo.save(cat);
        }
    }

    return results;
}

/**
 * Upsert items for a category. Creates new items and updates existing ones
 * matched by name. Deactivates items not present in the incoming list.
 */
export async function upsertItems(
    categoryId: string,
    incoming: Array<{name: string; description?: string | null; price?: number | null; currency?: string | null; sortOrder?: number}>,
): Promise<MenuItem[]> {
    const repo = AppDataSource.getRepository(MenuItem);
    const existing = await repo.find({where: {categoryId}});
    const existingByName = new Map(existing.map((i) => [i.name.toLowerCase(), i]));
    const seenIds = new Set<string>();
    const results: MenuItem[] = [];

    for (const data of incoming) {
        const key = data.name.toLowerCase();
        const found = existingByName.get(key);
        if (found) {
            found.description = data.description ?? found.description;
            found.price = data.price ?? found.price;
            found.currency = data.currency ?? found.currency;
            found.sortOrder = data.sortOrder ?? found.sortOrder;
            found.isActive = true;
            found.updatedAt = new Date();
            results.push(await repo.save(found));
            seenIds.add(found.id);
        } else {
            const created = await createItem({...data, categoryId});
            results.push(created);
            seenIds.add(created.id);
        }
    }

    // Deactivate items not in the incoming list
    for (const item of existing) {
        if (!seenIds.has(item.id) && item.isActive) {
            item.isActive = false;
            item.updatedAt = new Date();
            await repo.save(item);
        }
    }

    return results;
}
