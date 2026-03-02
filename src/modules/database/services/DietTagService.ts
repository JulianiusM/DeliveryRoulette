import {DataSource} from 'typeorm';
import {AppDataSource} from '../dataSource';
import {DietTag} from '../entities/diet/DietTag';

export interface DefaultDietTag {
    key: string;
    label: string;
    keywordWhitelist?: string[];
    dishWhitelist?: string[];
    /**
     * Allergen tokens that disqualify a menu item from this diet.
     * Each token is matched case-insensitively against the item's allergen list.
     * E.g., "egg" in a VEGAN tag means items with egg allergens are not vegan.
     */
    allergenExclusions?: string[];
}

/**
 * Canonical default diet tags that must exist in every environment.
 */
export const DEFAULT_DIET_TAGS: DefaultDietTag[] = [
    {
        key: 'VEGAN',
        label: 'Vegan',
        keywordWhitelist: [
            'vegan',
            'pflanzlich',
            'plant based',
            'vegano',
            'vegana',
            'sin ingredientes animales',
        ],
        dishWhitelist: [
            'falafel',
            'hummus',
            'tofu bowl',
            'chana masala',
            'dal tadka',
            'aloo gobi',
            'veggie sushi roll',
            'vegetable ramen',
        ],
        allergenExclusions: [
            'egg', 'eggs', 'ei', 'eier',
            'milk', 'milch', 'dairy',
            'fish', 'fisch',
            'shellfish', 'crustaceans',
        ],
    },
    {
        key: 'VEGETARIAN',
        label: 'Vegetarian',
        keywordWhitelist: [
            'vegetarian',
            'vegetarisch',
            'sin carne',
            'vegetariano',
            'ovo lacto',
            'meat free',
        ],
        dishWhitelist: [
            'margherita pizza',
            'caprese salad',
            'palak paneer',
            'paneer tikka',
            'vegetable spring rolls',
            'egg fried rice',
            'miso soup',
        ],
        allergenExclusions: [
            'fish', 'fisch',
            'shellfish', 'crustaceans',
        ],
    },
    {
        key: 'GLUTEN_FREE',
        label: 'Gluten-free',
        keywordWhitelist: [
            'gluten free',
            'glutenfrei',
            'sin gluten',
            'sans gluten',
            'celiac safe',
        ],
        dishWhitelist: [
            'corn tortilla tacos',
            'rice bowl',
            'poke bowl',
            'sashimi',
            'dal chawal',
            'quinoa salad',
        ],
        allergenExclusions: [
            'gluten', 'wheat', 'weizen',
            'barley', 'gerste',
            'rye', 'roggen',
        ],
    },
    {
        key: 'LACTOSE_FREE',
        label: 'Lactose-free',
        keywordWhitelist: [
            'lactose free',
            'laktosefrei',
            'dairy free',
            'sin lactosa',
            'sans lactose',
        ],
        dishWhitelist: [
            'sorbet',
            'coconut curry',
            'tom yum soup',
            'olive oil pasta',
            'avocado salad',
            'oat milk latte',
        ],
        allergenExclusions: [
            'milk', 'milch', 'dairy',
            'lactose', 'laktose',
        ],
    },
    {
        key: 'HALAL',
        label: 'Halal',
        keywordWhitelist: [
            'halal',
            'halal certified',
            'halal zertifiziert',
            '100 halal',
        ],
        dishWhitelist: [
            'chicken biryani',
            'butter chicken halal',
            'doner kebab halal',
            'shawarma',
            'lamb tagine',
            'beef kofta',
        ],
        allergenExclusions: [
            'pork', 'schwein',
        ],
    },
];

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
    const existing = await repo.find({select: ['key']});
    const existingKeys = new Set(existing.map((tag) => tag.key));

    const missingCount = DEFAULT_DIET_TAGS.reduce((count, tag) => (
        existingKeys.has(tag.key) ? count : count + 1
    ), 0);

    await repo.upsert(
        DEFAULT_DIET_TAGS.map((tag) => ({
            key: tag.key,
            label: tag.label,
            keywordWhitelistJson: toJsonArray(tag.keywordWhitelist ?? []),
            dishWhitelistJson: toJsonArray(tag.dishWhitelist ?? []),
            allergenExclusionsJson: toJsonArray(tag.allergenExclusions ?? []),
        })),
        ['key'],
    );

    return missingCount;
}

export async function listDietTagConfigs(dataSource: DataSource = AppDataSource): Promise<DietHeuristicConfig[]> {
    const tags = await listDietTags(dataSource);
    return tags.map((tag) => ({
        id: tag.id,
        key: tag.key,
        label: tag.label,
        keywordWhitelist: parseJsonArray(tag.keywordWhitelistJson),
        dishWhitelist: parseJsonArray(tag.dishWhitelistJson),
        allergenExclusions: parseJsonArray(tag.allergenExclusionsJson),
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
    const tag = await repo.findOne({where: {id: tagId}});
    if (!tag) return null;

    if (config.keywordWhitelist !== undefined) {
        tag.keywordWhitelistJson = toJsonArray(config.keywordWhitelist);
    }
    if (config.dishWhitelist !== undefined) {
        tag.dishWhitelistJson = toJsonArray(config.dishWhitelist);
    }
    if (config.allergenExclusions !== undefined) {
        tag.allergenExclusionsJson = toJsonArray(config.allergenExclusions);
    }
    tag.updatedAt = new Date();

    return await repo.save(tag);
}

function parseJsonArray(raw: string | null | undefined): string[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
    } catch {
        return [];
    }
}

function toJsonArray(values: string[]): string | null {
    const normalized = values
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    if (normalized.length === 0) return null;
    return JSON.stringify([...new Set(normalized)]);
}
