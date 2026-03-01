import {In} from 'typeorm';
import {AppDataSource} from '../dataSource';
import {MenuItemDietOverride} from '../entities/diet/MenuItemDietOverride';
import {DietTag} from '../entities/diet/DietTag';

export interface ItemDietOverrideInput {
    dietTagId: string;
    supported: boolean;
}

export async function listByItem(menuItemId: string): Promise<MenuItemDietOverride[]> {
    const repo = AppDataSource.getRepository(MenuItemDietOverride);
    return await repo.find({
        where: {menuItemId},
        relations: ['dietTag'],
        order: {createdAt: 'ASC'},
    });
}

export async function listByItemIds(menuItemIds: string[]): Promise<MenuItemDietOverride[]> {
    if (menuItemIds.length === 0) return [];
    const repo = AppDataSource.getRepository(MenuItemDietOverride);
    return await repo.find({
        where: {menuItemId: In(menuItemIds)},
        relations: ['dietTag'],
    });
}

/**
 * Replace all item-level diet overrides for a single menu item.
 * Idempotent and safe for repeated calls.
 */
export async function replaceForItem(
    menuItemId: string,
    incoming: ItemDietOverrideInput[],
): Promise<MenuItemDietOverride[]> {
    const repo = AppDataSource.getRepository(MenuItemDietOverride);
    await repo.delete({menuItemId});

    if (incoming.length === 0) {
        return [];
    }

    const normalized = dedupeOverrides(incoming);
    const dietTagIds = normalized.map((entry) => entry.dietTagId);
    const tagRepo = AppDataSource.getRepository(DietTag);
    const validTags = await tagRepo.find({where: {id: In(dietTagIds)}});
    const validTagIds = new Set(validTags.map((tag) => tag.id));

    const entities = normalized
        .filter((entry) => validTagIds.has(entry.dietTagId))
        .map((entry) => repo.create({
            menuItemId,
            dietTagId: entry.dietTagId,
            supported: entry.supported,
        }));

    if (entities.length === 0) {
        return [];
    }

    return await repo.save(entities);
}

function dedupeOverrides(incoming: ItemDietOverrideInput[]): ItemDietOverrideInput[] {
    const byTag = new Map<string, boolean>();
    for (const entry of incoming) {
        const dietTagId = entry.dietTagId?.trim();
        if (!dietTagId) continue;
        byTag.set(dietTagId, entry.supported);
    }

    return [...byTag.entries()].map(([dietTagId, supported]) => ({dietTagId, supported}));
}
