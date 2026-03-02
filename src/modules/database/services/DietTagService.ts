import {DataSource} from 'typeorm';
import {AppDataSource} from '../dataSource';
import {DietTag} from '../entities/diet/DietTag';
import {DietTagKeyword} from '../entities/diet/DietTagKeyword';
import {DietTagDish} from '../entities/diet/DietTagDish';
import {DietTagAllergenExclusion} from '../entities/diet/DietTagAllergenExclusion';
import {DEFAULT_DIET_TAGS} from '../data/defaultDietTags';
export type {DefaultDietTag} from '../data/defaultDietTags';
export {DEFAULT_DIET_TAGS} from '../data/defaultDietTags';

export interface DietHeuristicConfig {
    id: string;
    key: string;
    label: string;
    keywordWhitelist: string[];
    dishWhitelist: string[];
    allergenExclusions: string[];
}

export async function listDietTags(dataSource: DataSource = AppDataSource): Promise<DietTag[]> {
    const repo = dataSource.getRepository(DietTag);
    return await repo.find({order: {key: 'ASC'}});
}

/**
 * Ensure all default diet tags exist.
 * Idempotent and safe to call repeatedly.
 *
 * @returns number of missing tags detected before upsert
 */
export async function ensureDefaultDietTags(dataSource: DataSource = AppDataSource): Promise<number> {
    const repo = dataSource.getRepository(DietTag);
    const kwRepo = dataSource.getRepository(DietTagKeyword);
    const dishRepo = dataSource.getRepository(DietTagDish);
    const aeRepo = dataSource.getRepository(DietTagAllergenExclusion);

    const existing = await repo.find({relations: ['keywords', 'dishes', 'allergenExclusions']});
    const existingByKey = new Map(existing.map((tag) => [tag.key, tag]));

    let missingCount = 0;

    for (const def of DEFAULT_DIET_TAGS) {
        let tag = existingByKey.get(def.key);
        if (!tag) {
            missingCount++;
            tag = repo.create({key: def.key, label: def.label});
            tag = await repo.save(tag);
        } else {
            if (tag.label !== def.label) {
                tag.label = def.label;
                tag.updatedAt = new Date();
                await repo.save(tag);
            }
        }

        await syncChildValues(kwRepo, tag.id, def.keywordWhitelist, tag.keywords ?? []);
        await syncChildValues(dishRepo, tag.id, def.dishWhitelist, tag.dishes ?? []);
        await syncChildValues(aeRepo, tag.id, def.allergenExclusions, tag.allergenExclusions ?? []);
    }

    return missingCount;
}

/**
 * Synchronize a set of child rows (keywords, dishes, or allergen exclusions)
 * so that the DB matches the given values set exactly.
 */
async function syncChildValues<T extends {id: string; value: string; dietTagId: string}>(
    repo: import('typeorm').Repository<T>,
    tagId: string,
    desiredValues: string[],
    existingRows: T[],
): Promise<void> {
    const normalizedDesired = new Set(desiredValues.map((v) => v.trim().toLowerCase()).filter(Boolean));
    const existingByValue = new Map(existingRows.map((row) => [row.value.toLowerCase(), row]));

    // Remove rows not in desired set
    for (const row of existingRows) {
        if (!normalizedDesired.has(row.value.toLowerCase())) {
            await repo.remove(row);
        }
    }

    // Add rows that are missing
    for (const value of normalizedDesired) {
        if (!existingByValue.has(value)) {
            const row = repo.create({dietTagId: tagId, value} as any);
            await repo.save(row);
        }
    }
}

export async function listDietTagConfigs(dataSource: DataSource = AppDataSource): Promise<DietHeuristicConfig[]> {
    const tags = await listDietTags(dataSource);
    return tags.map((tag) => ({
        id: tag.id,
        key: tag.key,
        label: tag.label,
        keywordWhitelist: (tag.keywords ?? []).map((kw) => kw.value),
        dishWhitelist: (tag.dishes ?? []).map((d) => d.value),
        allergenExclusions: (tag.allergenExclusions ?? []).map((ae) => ae.value),
    }));
}

export async function updateDietTagConfig(
    tagId: string,
    config: {
        keywordWhitelist?: string[];
        dishWhitelist?: string[];
        allergenExclusions?: string[];
    },
    dataSource: DataSource = AppDataSource,
): Promise<DietTag | null> {
    const repo = dataSource.getRepository(DietTag);
    const kwRepo = dataSource.getRepository(DietTagKeyword);
    const dishRepo = dataSource.getRepository(DietTagDish);
    const aeRepo = dataSource.getRepository(DietTagAllergenExclusion);

    const tag = await repo.findOne({where: {id: tagId}, relations: ['keywords', 'dishes', 'allergenExclusions']});
    if (!tag) return null;

    if (config.keywordWhitelist !== undefined) {
        await syncChildValues(kwRepo, tagId, config.keywordWhitelist, tag.keywords ?? []);
    }
    if (config.dishWhitelist !== undefined) {
        await syncChildValues(dishRepo, tagId, config.dishWhitelist, tag.dishes ?? []);
    }
    if (config.allergenExclusions !== undefined) {
        await syncChildValues(aeRepo, tagId, config.allergenExclusions, tag.allergenExclusions ?? []);
    }
    tag.updatedAt = new Date();

    return await repo.save(tag);
}
