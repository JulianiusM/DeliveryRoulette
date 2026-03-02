import {DataSource} from 'typeorm';
import {AppDataSource} from '../dataSource';
import {DietTag} from '../entities/diet/DietTag';
import {DietTagKeyword} from '../entities/diet/DietTagKeyword';
import {DietTagDish} from '../entities/diet/DietTagDish';
import {DietTagAllergenExclusion} from '../entities/diet/DietTagAllergenExclusion';
import {DietTagNegativeKeyword} from '../entities/diet/DietTagNegativeKeyword';
import {DietTagStrongSignal} from '../entities/diet/DietTagStrongSignal';
import {DietTagContradictionPattern} from '../entities/diet/DietTagContradictionPattern';
import {DietTagQualifiedNegException} from '../entities/diet/DietTagQualifiedNegException';
import {DEFAULT_DIET_TAGS} from '../data/defaultDietTags';

export interface DietHeuristicConfig {
    id: string;
    key: string;
    label: string;
    parentTagKey: string | null;
    keywordWhitelist: string[];
    dishWhitelist: string[];
    allergenExclusions: string[];
    negativeKeywords: string[];
    strongSignals: string[];
    contradictionPatterns: string[];
    qualifiedNegExceptions: string[];
}

const ALL_RELATIONS = [
    'keywords', 'dishes', 'allergenExclusions',
    'negativeKeywords', 'strongSignals', 'contradictionPatterns', 'qualifiedNegExceptions',
];

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
    const nkRepo = dataSource.getRepository(DietTagNegativeKeyword);
    const ssRepo = dataSource.getRepository(DietTagStrongSignal);
    const cpRepo = dataSource.getRepository(DietTagContradictionPattern);
    const qneRepo = dataSource.getRepository(DietTagQualifiedNegException);

    const existing = await repo.find({relations: ALL_RELATIONS});
    const existingByKey = new Map(existing.map((tag) => [tag.key, tag]));

    let missingCount = 0;

    for (const def of DEFAULT_DIET_TAGS) {
        let tag = existingByKey.get(def.key);
        if (!tag) {
            missingCount++;
            tag = repo.create({key: def.key, label: def.label, parentTagKey: def.parentTagKey ?? null});
            tag = await repo.save(tag);
        } else {
            let changed = false;
            if (tag.label !== def.label) {
                tag.label = def.label;
                changed = true;
            }
            if (tag.parentTagKey !== (def.parentTagKey ?? null)) {
                tag.parentTagKey = def.parentTagKey ?? null;
                changed = true;
            }
            if (changed) {
                tag.updatedAt = new Date();
                await repo.save(tag);
            }
        }

        await syncChildValues(kwRepo, tag.id, def.keywordWhitelist, tag.keywords ?? []);
        await syncChildValues(dishRepo, tag.id, def.dishWhitelist, tag.dishes ?? []);
        await syncChildValues(aeRepo, tag.id, def.allergenExclusions, tag.allergenExclusions ?? []);
        await syncChildValues(nkRepo, tag.id, def.negativeKeywords, tag.negativeKeywords ?? []);
        await syncChildValues(ssRepo, tag.id, def.strongSignals, tag.strongSignals ?? []);
        await syncChildValues(cpRepo, tag.id, def.contradictionPatterns, tag.contradictionPatterns ?? []);
        await syncChildValues(qneRepo, tag.id, def.qualifiedNegExceptions, tag.qualifiedNegExceptions ?? []);
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
    const repo = dataSource.getRepository(DietTag);
    const tags = await repo.find({relations: ALL_RELATIONS, order: {key: 'ASC'}});
    return tags.map((tag) => ({
        id: tag.id,
        key: tag.key,
        label: tag.label,
        parentTagKey: tag.parentTagKey ?? null,
        keywordWhitelist: (tag.keywords ?? []).map((kw) => kw.value),
        dishWhitelist: (tag.dishes ?? []).map((d) => d.value),
        allergenExclusions: (tag.allergenExclusions ?? []).map((ae) => ae.value),
        negativeKeywords: (tag.negativeKeywords ?? []).map((nk) => nk.value),
        strongSignals: (tag.strongSignals ?? []).map((ss) => ss.value),
        contradictionPatterns: (tag.contradictionPatterns ?? []).map((cp) => cp.value),
        qualifiedNegExceptions: (tag.qualifiedNegExceptions ?? []).map((qne) => qne.value),
    }));
}

export async function updateDietTagConfig(
    tagId: string,
    config: {
        keywordWhitelist?: string[];
        dishWhitelist?: string[];
        allergenExclusions?: string[];
        negativeKeywords?: string[];
        strongSignals?: string[];
        contradictionPatterns?: string[];
        qualifiedNegExceptions?: string[];
        parentTagKey?: string | null;
    },
    dataSource: DataSource = AppDataSource,
): Promise<DietTag | null> {
    const repo = dataSource.getRepository(DietTag);
    const kwRepo = dataSource.getRepository(DietTagKeyword);
    const dishRepo = dataSource.getRepository(DietTagDish);
    const aeRepo = dataSource.getRepository(DietTagAllergenExclusion);
    const nkRepo = dataSource.getRepository(DietTagNegativeKeyword);
    const ssRepo = dataSource.getRepository(DietTagStrongSignal);
    const cpRepo = dataSource.getRepository(DietTagContradictionPattern);
    const qneRepo = dataSource.getRepository(DietTagQualifiedNegException);

    const tag = await repo.findOne({where: {id: tagId}, relations: ALL_RELATIONS});
    if (!tag) return null;

    if (config.parentTagKey !== undefined) {
        tag.parentTagKey = config.parentTagKey;
    }
    if (config.keywordWhitelist !== undefined) {
        await syncChildValues(kwRepo, tagId, config.keywordWhitelist, tag.keywords ?? []);
    }
    if (config.dishWhitelist !== undefined) {
        await syncChildValues(dishRepo, tagId, config.dishWhitelist, tag.dishes ?? []);
    }
    if (config.allergenExclusions !== undefined) {
        await syncChildValues(aeRepo, tagId, config.allergenExclusions, tag.allergenExclusions ?? []);
    }
    if (config.negativeKeywords !== undefined) {
        await syncChildValues(nkRepo, tagId, config.negativeKeywords, tag.negativeKeywords ?? []);
    }
    if (config.strongSignals !== undefined) {
        await syncChildValues(ssRepo, tagId, config.strongSignals, tag.strongSignals ?? []);
    }
    if (config.contradictionPatterns !== undefined) {
        await syncChildValues(cpRepo, tagId, config.contradictionPatterns, tag.contradictionPatterns ?? []);
    }
    if (config.qualifiedNegExceptions !== undefined) {
        await syncChildValues(qneRepo, tagId, config.qualifiedNegExceptions, tag.qualifiedNegExceptions ?? []);
    }
    tag.updatedAt = new Date();

    return await repo.save(tag);
}
