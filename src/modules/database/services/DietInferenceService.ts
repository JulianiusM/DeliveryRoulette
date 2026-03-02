import {In} from 'typeorm';
import {AppDataSource} from '../dataSource';
import {DietInferenceResult} from '../entities/diet/DietInferenceResult';
import {DietTag} from '../entities/diet/DietTag';
import {MenuItemDietOverride} from '../entities/diet/MenuItemDietOverride';
import {MenuCategory} from '../entities/menu/MenuCategory';

/** Current engine version - bump when rules change. */
export const ENGINE_VERSION = '4.0.0';

export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface MatchedItem {
    itemId: string;
    itemName: string;
    keywords: string[];
    source?: 'heuristic' | 'manual_override';
}

export interface ExcludedItem {
    itemId: string;
    itemName: string;
    keywords: string[];
    excludedBy: string[];
}

export interface InferenceReasons {
    matchedItems: MatchedItem[];
    excludedItems?: ExcludedItem[];
    totalMenuItems: number;
    matchRatio: number;
    scoreBreakdown?: {
        ratioScore: number;
        confidenceMultiplier: number;
        evidenceBoost: number;
        evidencePenalty: number;
        finalScore: number;
    };
}

export interface InferenceOutput {
    dietTagId: string;
    dietTagKey: string;
    score: number;
    confidence: Confidence;
    reasons: InferenceReasons;
}

export interface InferTagOptions {
    manualOverridesByItemId?: Map<string, boolean>;
    keywordWhitelist?: string[];
    dishWhitelist?: string[];
    /** Allergen tokens that disqualify items from this diet tag. */
    allergenExclusions?: string[];
}

export interface InferenceMenuItem {
    id: string;
    name: string;
    description?: string | null;
    dietContext?: string | null;
    categoryName?: string | null;
    allergens?: string | null;
}

/**
 * Map of diet-tag key -> keywords to look for in item name / description.
 * All comparisons are case-insensitive after normalization.
 */
export const DIET_KEYWORD_RULES: Record<string, string[]> = {
    VEGAN: [
        'vegan', 'plant-based', 'plant based', 'tofu',
        'tempeh', 'seitan', 'dairy-free', 'dairy free',
        'without dairy', 'no dairy', 'animal-free', 'animal free',
        'pflanzlich', 'pflanzenbasiert', 'veganes',
        'vegano', 'vegana', 'sin ingredientes animales',
    ],
    VEGETARIAN: [
        'vegetarian', 'veggie', 'vegan', 'meat-free',
        'meat free', 'meatless', 'ovo-lacto', 'ovo lacto',
        'vegetarisch', 'vegetarische', 'vegetarischer', 'vegetarisches',
        'fleischlos', 'ohne fleisch', 'vegetariano', 'vegetariana', 'sin carne',
    ],
    GLUTEN_FREE: [
        'gluten-free', 'gluten free', 'gf', 'celiac',
        'coeliac', 'no gluten',
        'glutenfrei', 'ohne gluten', 'sin gluten', 'sans gluten',
    ],
    LACTOSE_FREE: [
        'lactose-free', 'lactose free', 'dairy-free',
        'dairy free', 'no dairy', 'no lactose',
        'laktosefrei', 'ohne laktose', 'milchfrei', 'sin lactosa', 'sans lactose',
    ],
    HALAL: [
        'halal', 'halal certified', 'halal-zertifiziert', 'halal zertifiziert',
    ],
};

const DEFAULT_DISH_WHITELIST: Record<string, string[]> = {
    VEGAN: [
        'falafel',
        'hummus',
        'chana masala',
        'aloo gobi',
        'tofu bowl',
        'vegan sushi',
        'vegetable ramen',
    ],
    VEGETARIAN: [
        'margherita pizza',
        'caprese',
        'palak paneer',
        'paneer tikka',
        'vegetable spring rolls',
        'egg fried rice',
    ],
    GLUTEN_FREE: [
        'corn tortilla tacos',
        'rice bowl',
        'poke bowl',
        'sashimi',
        'quinoa salad',
    ],
    LACTOSE_FREE: [
        'sorbet',
        'coconut curry',
        'tom yum',
        'olive oil pasta',
        'oat milk latte',
    ],
    HALAL: [
        'chicken biryani',
        'shawarma',
        'halal doner',
        'beef kofta',
    ],
};

const NEGATIVE_KEYWORD_RULES: Record<string, string[]> = {
    VEGAN: [
        'beef', 'chicken', 'pork', 'ham', 'bacon', 'fish', 'salmon', 'tuna',
        'shrimp', 'egg', 'eggs', 'cheese', 'milk', 'dairy', 'butter', 'cream',
        'yoghurt', 'yogurt', 'mayonnaise', 'mayo', 'whopper',
        'rind', 'huhn', 'schwein', 'speck', 'fisch', 'ei', 'eier',
        'kase', 'milch', 'sahne', 'butter',
    ],
    VEGETARIAN: [
        'beef', 'chicken', 'pork', 'ham', 'bacon', 'fish', 'salmon', 'tuna',
        'shrimp', 'seafood', 'whopper',
        'rind', 'huhn', 'schwein', 'speck', 'fisch', 'garnelen',
    ],
    GLUTEN_FREE: [
        'wheat', 'barley', 'rye', 'breaded', 'breadcrumbs',
        'weizen', 'gerste', 'roggen',
    ],
    LACTOSE_FREE: [
        'milk', 'dairy', 'cheese', 'cream', 'butter', 'yoghurt', 'yogurt',
        'milch', 'kase', 'sahne', 'butter', 'joghurt',
    ],
    HALAL: [
        'pork', 'ham', 'bacon',
        'schwein', 'speck', 'schinken',
    ],
};

const STRONG_NAME_SIGNALS: Record<string, string[]> = {
    VEGAN: ['vegan', 'plant-based', 'plant based', 'pflanzlich', 'pflanzenbasiert'],
    VEGETARIAN: ['vegetarian', 'veggie', 'vegetarisch', 'fleischlos', 'meat-free', 'meat free'],
    GLUTEN_FREE: ['gluten-free', 'gluten free', 'glutenfrei', 'ohne gluten'],
    LACTOSE_FREE: ['lactose-free', 'lactose free', 'laktosefrei', 'milchfrei', 'dairy-free', 'dairy free'],
    HALAL: ['halal'],
};

const QUALIFIED_MEAT_NEGATIVES: Record<string, string[]> = {
    VEGAN: [
        'whopper', 'burger', 'patty', 'chicken', 'beef', 'pork', 'fish',
        'huhn', 'rind', 'schwein', 'fisch',
        'mayonnaise', 'mayo',
    ],
    VEGETARIAN: ['whopper', 'burger', 'patty', 'chicken', 'beef', 'pork', 'fish', 'huhn', 'rind', 'schwein', 'fisch'],
};

const SUBDIET_INHERITANCE: Record<string, string[]> = {
    VEGAN: ['VEGETARIAN'],
};

const CROSS_CONTAMINATION_PATTERNS: RegExp[] = [
    /\bmay come into contact\b/i,
    /\bprepared on (the )?same grill\b/i,
    /\bcross[- ]?contamination\b/i,
    /\bshared (grill|fryer|equipment)\b/i,
    /\btraces of\b/i,
    /\bspuren von\b/i,
];

const CONTRADICTION_PATTERNS: Record<string, RegExp[]> = {
    VEGAN: [
        /\bcontains (dairy|milk|cheese|egg|eggs)\b/i,
        /\bnot vegan\b/i,
    ],
    VEGETARIAN: [
        /\bcontains (beef|chicken|pork|fish|seafood)\b/i,
        /\bnot vegetarian\b/i,
    ],
    GLUTEN_FREE: [
        /\bcontains gluten\b/i,
        /\bnot gluten[- ]?free\b/i,
    ],
    LACTOSE_FREE: [
        /\bcontains (dairy|milk|cheese|cream|lactose)\b/i,
        /\bnot lactose[- ]?free\b/i,
    ],
    HALAL: [
        /\bnot halal\b/i,
    ],
};

/**
 * Parse a comma-separated allergen string into normalized tokens.
 */
function parseAllergenTokens(allergens?: string | null): string[] {
    if (!allergens || !allergens.trim()) return [];
    return allergens
        .split(/[,|;]+/)
        .flatMap((part) => part.trim().toLowerCase().split(/\s+/))
        .filter((token) => token.length > 0);
}

/**
 * Check if an item's allergens disqualify it for a specific diet tag.
 * Uses the allergen exclusion list configured on the diet tag (data-driven).
 * Returns the list of allergen tokens that triggered the exclusion.
 */
function findAllergenExclusions(allergens: string | null | undefined, exclusionList: string[]): string[] {
    const tokens = parseAllergenTokens(allergens);
    if (tokens.length === 0 || exclusionList.length === 0) return [];
    const exclusionSet = new Set(exclusionList.map((e) => e.toLowerCase()));
    const exclusions: string[] = [];
    for (const token of tokens) {
        if (exclusionSet.has(token)) {
            exclusions.push(token);
        }
    }
    return [...new Set(exclusions)];
}

function hasCrossContamination(text: string): boolean {
    return CROSS_CONTAMINATION_PATTERNS.some((pattern) => pattern.test(text));
}

function hasContradiction(dietTagKey: string, text: string): boolean {
    const patterns = CONTRADICTION_PATTERNS[dietTagKey] ?? [];
    return patterns.some((pattern) => pattern.test(text));
}

/**
 * Detect cases where a diet keyword appears only as a side-note in context
 * that does not make the whole item diet-compatible.
 */
function hasContextFalsePositive(dietTagKey: string, text: string, nameText?: string): boolean {
    if (dietTagKey !== 'VEGAN' && dietTagKey !== 'VEGETARIAN') {
        return false;
    }

    if (nameText && hasDietQualifierInName(dietTagKey, nameText)) {
        return false;
    }

    const condimentMention = /\b(vegan|vegetarian)\b.*\b(mayo|mayonnaise|sauce|dressing|salad mayonnaise)\b/i.test(text);
    const sideComponentPhrase = /\b(comes with|also comes with|served with|with our)\b.*\b(vegan|vegetarian)\b/i.test(text);

    if (!condimentMention && !sideComponentPhrase) {
        return false;
    }

    const nonDietMain = /\b(beef|chicken|pork|fish|whopper|burger|patty)\b/i.test(text);
    return nonDietMain;
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildKeywordPattern(keyword: string): RegExp {
    const escaped = escapeRegex(keyword)
        .replace(/\\\s+/g, '\\s+')
        .replace(/\\-/g, '[-\\s]?');
    return new RegExp(`\\b${escaped}\\b`, 'i');
}

function findKeywordHits(text: string, keywords: string[]): string[] {
    return keywords.filter((keyword) => buildKeywordPattern(keyword).test(text));
}

function isNegatedOrFreeContext(text: string, keyword: string): boolean {
    const escaped = escapeRegex(keyword)
        .replace(/\\\s+/g, '\\s+')
        .replace(/\\-/g, '[-\\s]?');

    const patterns = [
        new RegExp(`\\b(no|without|ohne)\\s+${escaped}\\b`, 'i'),
        new RegExp(`\\b${escaped}[-\\s]?free\\b`, 'i'),
        new RegExp(`\\b${escaped}frei\\b`, 'i'),
    ];

    return patterns.some((pattern) => pattern.test(text));
}

function hasStrongLactoseFreeSignal(positiveHits: string[]): boolean {
    const strongSignals = new Set([
        'lactose-free',
        'lactose free',
        'no lactose',
        'laktosefrei',
        'ohne laktose',
        'dairy-free',
        'dairy free',
        'milchfrei',
    ]);
    return positiveHits.some((hit) => strongSignals.has(hit));
}

function hasExplicitCompatibilityClaim(dietTagKey: string, text: string): boolean {
    if (dietTagKey === 'VEGAN') {
        return [
            /\b(is|it's|its)\s+vegan\b/i,
            /\bvegan\s+too\b/i,
            /\b100%\s+vegan\b/i,
            /\bfully\s+vegan\b/i,
        ].some((pattern) => pattern.test(text));
    }

    if (dietTagKey === 'VEGETARIAN') {
        return [
            /\b(is|it's|its)\s+vegetarian\b/i,
            /\b100%\s+vegetarian\b/i,
        ].some((pattern) => pattern.test(text));
    }

    return false;
}

function hasDietQualifierInName(dietTagKey: string, nameText: string): boolean {
    if (!nameText) return false;
    const strongSignals = STRONG_NAME_SIGNALS[dietTagKey] ?? [];
    return strongSignals.some((signal) => buildKeywordPattern(signal).test(nameText));
}

function mergeUnique(values: string[]): string[] {
    return [...new Set(values)];
}

function confidenceRank(value: Confidence): number {
    if (value === 'HIGH') return 3;
    if (value === 'MEDIUM') return 2;
    return 1;
}

function maxConfidence(a: Confidence, b: Confidence): Confidence {
    return confidenceRank(a) >= confidenceRank(b) ? a : b;
}

/**
 * Normalize text for keyword matching.
 * Lower-cases, strips accents, collapses whitespace, and trims.
 */
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Given a ratio of matching items to total items (0-1),
 * return a score (0-100) and confidence level.
 */
export function computeScoreAndConfidence(
    matchRatio: number,
    totalMenuItems: number,
    context: {
        strongSignalCount?: number;
        manualOverrideCount?: number;
        excludedCount?: number;
    } = {},
): {
    score: number;
    confidence: Confidence;
    breakdown: {
        ratioScore: number;
        confidenceMultiplier: number;
        evidenceBoost: number;
        evidencePenalty: number;
        finalScore: number;
    };
} {
    const safeRatio = Math.max(0, Math.min(1, matchRatio));
    const ratioScore = Math.round(safeRatio * 100);
    const strongSignalCount = context.strongSignalCount ?? 0;
    const manualOverrideCount = context.manualOverrideCount ?? 0;
    const excludedCount = context.excludedCount ?? 0;

    let confidence: Confidence;
    if (totalMenuItems === 0) {
        confidence = 'LOW';
    } else if (strongSignalCount >= 2 && safeRatio >= 0.2) {
        confidence = 'HIGH';
    } else if (totalMenuItems < 5) {
        confidence = safeRatio >= 0.5 ? 'MEDIUM' : 'LOW';
    } else if (safeRatio >= 0.3) {
        confidence = 'HIGH';
    } else if (safeRatio > 0) {
        confidence = 'MEDIUM';
    } else {
        confidence = 'LOW';
    }

    const evidenceBoost = Math.min(
        20,
        Math.round((strongSignalCount * 3) + (manualOverrideCount * 5) + (safeRatio * 4)),
    );
    const evidencePenalty = Math.min(18, excludedCount * 2);
    const confidenceMultiplier = confidence === 'HIGH'
        ? 1
        : confidence === 'MEDIUM'
            ? 0.92
            : 0.82;
    const weighted = Math.round((ratioScore + evidenceBoost - evidencePenalty) * confidenceMultiplier);
    const finalScore = Math.max(0, Math.min(100, weighted));

    return {
        score: finalScore,
        confidence,
        breakdown: {
            ratioScore,
            confidenceMultiplier,
            evidenceBoost,
            evidencePenalty,
            finalScore,
        },
    };
}

function parseJsonArray(raw: unknown): string[] {
    if (typeof raw !== 'string' || !raw.trim()) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => normalizeText(entry))
            .filter((entry) => entry.length > 0);
    } catch {
        return [];
    }
}

function findDishHits(nameText: string, contextText: string, dishWhitelist: string[]): string[] {
    if (dishWhitelist.length === 0) return [];
    const text = `${nameText} ${contextText}`.trim();
    return dishWhitelist.filter((dish) => buildKeywordPattern(dish).test(text));
}

/**
 * Run keyword matching for a single diet tag against a list of menu items.
 * Supports item-level manual overrides and context-aware false-positive filtering.
 */
export function inferForTag(
    dietTag: {id: string; key: string; keywordWhitelistJson?: string | null; dishWhitelistJson?: string | null; allergenExclusionsJson?: string | null},
    items: InferenceMenuItem[],
    options: InferTagOptions = {},
): InferenceOutput {
    const tagKeywordWhitelist = parseJsonArray(dietTag.keywordWhitelistJson);
    const tagDishWhitelist = parseJsonArray(dietTag.dishWhitelistJson);
    const tagAllergenExclusions = parseJsonArray(dietTag.allergenExclusionsJson);
    const optionKeywordWhitelist = (options.keywordWhitelist ?? []).map((entry) => normalizeText(entry));
    const optionDishWhitelist = (options.dishWhitelist ?? []).map((entry) => normalizeText(entry));
    const optionAllergenExclusions = (options.allergenExclusions ?? []).map((entry) => normalizeText(entry));

    const keywords = mergeUnique([
        ...(DIET_KEYWORD_RULES[dietTag.key] ?? []),
        ...tagKeywordWhitelist,
        ...optionKeywordWhitelist,
    ]);
    const dishWhitelist = mergeUnique([
        ...(DEFAULT_DISH_WHITELIST[dietTag.key] ?? []),
        ...tagDishWhitelist,
        ...optionDishWhitelist,
    ]);
    const allergenExclusions = mergeUnique([
        ...tagAllergenExclusions,
        ...optionAllergenExclusions,
    ]);
    const negativeKeywords = NEGATIVE_KEYWORD_RULES[dietTag.key] ?? [];
    const manualOverridesByItemId = options.manualOverridesByItemId ?? new Map<string, boolean>();

    const matchedItems: MatchedItem[] = [];
    const excludedItems: ExcludedItem[] = [];

    let positiveEvidence = 0;
    let negativeEvidence = 0;
    let strongSignalCount = 0;
    let manualOverrideCount = 0;

    for (const item of items) {
        const manualOverride = manualOverridesByItemId.get(item.id);
        if (manualOverride === true) {
            matchedItems.push({
                itemId: item.id,
                itemName: item.name,
                keywords: ['manual-override'],
                source: 'manual_override',
            });
            positiveEvidence += 1;
            strongSignalCount += 1;
            manualOverrideCount += 1;
            continue;
        }

        if (manualOverride === false) {
            excludedItems.push({
                itemId: item.id,
                itemName: item.name,
                keywords: [],
                excludedBy: ['manual-override:false'],
            });
            negativeEvidence += 1;
            continue;
        }

        const nameText = normalizeText(item.name);
        const contextText = normalizeText([
            item.categoryName ?? '',
            item.description ?? '',
            item.dietContext ?? '',
        ].join(' '));
        const text = normalizeText(`${nameText} ${contextText}`);

        const positiveNameHits = findKeywordHits(nameText, keywords);
        const positiveContextHits = findKeywordHits(contextText, keywords);
        const dishHits = findDishHits(nameText, contextText, dishWhitelist);
        const positiveHits = mergeUnique([
            ...positiveNameHits,
            ...positiveContextHits,
            ...dishHits.map((dish) => `dish:${dish}`),
        ]);
        if (positiveHits.length === 0) {
            continue;
        }

        const penalties: string[] = [];
        const strongLactoseFreeSignal = dietTag.key === 'LACTOSE_FREE'
            && hasStrongLactoseFreeSignal(positiveHits);
        const explicitCompatibilityClaim = hasExplicitCompatibilityClaim(dietTag.key, text);
        const dietQualifierInName = hasDietQualifierInName(dietTag.key, nameText);
        const hasStrongSignal = dietQualifierInName
            || explicitCompatibilityClaim
            || positiveNameHits.length > 0
            || dishHits.length > 0;
        if (hasStrongSignal) {
            strongSignalCount += 1;
        }

        const negativeNameHits = findKeywordHits(nameText, negativeKeywords)
            .filter((keyword) => !isNegatedOrFreeContext(text, keyword));
        const negativeContextHits = findKeywordHits(contextText, negativeKeywords)
            .filter((keyword) => !isNegatedOrFreeContext(text, keyword));

        const negativeHits = mergeUnique([...negativeNameHits, ...negativeContextHits])
            .filter((keyword) => {
                if (!dietQualifierInName) return true;
                const allow = QUALIFIED_MEAT_NEGATIVES[dietTag.key] ?? [];
                return !allow.includes(keyword);
            })
            .filter((keyword) => {
                if (!strongLactoseFreeSignal) return true;
                return !['milk', 'dairy', 'milch'].includes(keyword);
            })
            .filter((keyword) => {
                if (!explicitCompatibilityClaim) return true;
                return !['chicken', 'beef', 'pork', 'fish', 'whopper', 'huhn', 'rind', 'schwein', 'fisch'].includes(keyword);
            });
        const contradiction = hasContradiction(dietTag.key, text);
        const contextFalsePositive = hasContextFalsePositive(dietTag.key, text, nameText);
        const crossContamination = hasCrossContamination(text);
        const itemAllergenExclusions = findAllergenExclusions(item.allergens, allergenExclusions);

        if (contradiction) {
            penalties.push('contradiction');
        }

        if (contextFalsePositive) {
            penalties.push('context-false-positive');
        }

        if (itemAllergenExclusions.length > 0) {
            penalties.push(`allergen:${itemAllergenExclusions.join(',')}`);
        }

        if (negativeHits.length > 0 && !crossContamination) {
            penalties.push(`negative:${negativeHits[0]}`);
        }

        if (penalties.length > 0) {
            excludedItems.push({
                itemId: item.id,
                itemName: item.name,
                keywords: positiveHits,
                excludedBy: penalties,
            });
            negativeEvidence += hasStrongSignal ? 1.2 : 1;
            continue;
        }

        if (crossContamination) {
            matchedItems.push({
                itemId: item.id,
                itemName: item.name,
                keywords: [...positiveHits, 'cross-contamination'],
                source: 'heuristic',
            });
            positiveEvidence += 0.5;
            continue;
        }

        matchedItems.push({
            itemId: item.id,
            itemName: item.name,
            keywords: positiveHits,
            source: 'heuristic',
        });
        positiveEvidence += dishHits.length > 0 ? 1.2 : 1;
    }

    const totalMenuItems = items.length;
    const rawRatio = totalMenuItems > 0
        ? (positiveEvidence - (negativeEvidence * 0.35)) / totalMenuItems
        : 0;
    const matchRatio = Math.max(0, Math.min(1, rawRatio));
    const {score, confidence, breakdown} = computeScoreAndConfidence(matchRatio, totalMenuItems, {
        strongSignalCount,
        manualOverrideCount,
        excludedCount: excludedItems.length,
    });

    return {
        dietTagId: dietTag.id,
        dietTagKey: dietTag.key,
        score,
        confidence,
        reasons: {
            matchedItems,
            excludedItems: excludedItems.length > 0 ? excludedItems : undefined,
            totalMenuItems,
            matchRatio,
            scoreBreakdown: breakdown,
        },
    };
}

/**
 * Fetch all active menu items for a restaurant (across all active categories).
 */
export async function getActiveMenuItems(restaurantId: string): Promise<InferenceMenuItem[]> {
    const catRepo = AppDataSource.getRepository(MenuCategory);
    const categories = await catRepo.find({
        where: {restaurantId, isActive: true},
        relations: ['items'],
    });

    const items: InferenceMenuItem[] = [];
    for (const category of categories) {
        for (const item of category.items) {
            if (!item.isActive) continue;
            items.push({
                id: item.id,
                name: item.name,
                description: item.description ?? null,
                dietContext: item.dietContext ?? null,
                categoryName: category.name,
                allergens: item.allergens ?? null,
            });
        }
    }
    return items;
}

function applySubdietInheritance(outputs: InferenceOutput[]): void {
    const byKey = new Map(outputs.map((output) => [output.dietTagKey, output]));

    for (const [parentKey, childKeys] of Object.entries(SUBDIET_INHERITANCE)) {
        const parent = byKey.get(parentKey);
        if (!parent) continue;

        for (const childKey of childKeys) {
            const child = byKey.get(childKey);
            if (!child) continue;

            const merged = new Map(
                child.reasons.matchedItems.map((item) => [item.itemId, item]),
            );

            for (const item of parent.reasons.matchedItems) {
                if (merged.has(item.itemId)) continue;
                merged.set(item.itemId, {
                    ...item,
                    keywords: mergeUnique([...item.keywords, `inherited-from:${parentKey.toLowerCase()}`]),
                    source: item.source ?? 'heuristic',
                });
            }

            const totalMenuItems = Math.max(
                child.reasons.totalMenuItems,
                parent.reasons.totalMenuItems,
            );
            const inheritedRatio = totalMenuItems > 0
                ? merged.size / totalMenuItems
                : 0;
            const inherited = computeScoreAndConfidence(inheritedRatio, totalMenuItems);

            child.reasons.matchedItems = [...merged.values()];
            child.reasons.totalMenuItems = totalMenuItems;
            child.reasons.matchRatio = Math.max(child.reasons.matchRatio, inheritedRatio);
            child.reasons.scoreBreakdown = inherited.breakdown;
            child.score = Math.max(child.score, inherited.score);
            child.confidence = maxConfidence(child.confidence, inherited.confidence);
        }
    }
}

/**
 * Compute inference results for every diet tag for a given restaurant
 * and persist them (upsert by unique constraint).
 */
export async function computeForRestaurant(restaurantId: string): Promise<DietInferenceResult[]> {
    return AppDataSource.transaction(async (manager) => {
        const tagRepo = manager.getRepository(DietTag);
        const resultRepo = manager.getRepository(DietInferenceResult);
        const itemOverrideRepo = manager.getRepository(MenuItemDietOverride);

        const dietTags = await tagRepo.find();
        const items = await getActiveMenuItems(restaurantId);
        const itemIds = items.map((item) => item.id);
        const itemOverrides = itemIds.length > 0
            ? await itemOverrideRepo.find({where: {menuItemId: In(itemIds)}})
            : [];

        const overrideMapByTag = new Map<string, Map<string, boolean>>();
        for (const override of itemOverrides) {
            const byItem = overrideMapByTag.get(override.dietTagId) ?? new Map<string, boolean>();
            byItem.set(override.menuItemId, !!override.supported);
            overrideMapByTag.set(override.dietTagId, byItem);
        }

        const outputs: InferenceOutput[] = [];
        for (const tag of dietTags) {
            const output = inferForTag(tag, items, {
                manualOverridesByItemId: overrideMapByTag.get(tag.id),
            });
            outputs.push(output);
        }

        applySubdietInheritance(outputs);

        const results: DietInferenceResult[] = [];
        for (const output of outputs) {
            const tag = dietTags.find((entry) => entry.id === output.dietTagId);
            if (!tag) continue;

            let existing = await resultRepo.findOne({
                where: {
                    restaurantId,
                    dietTagId: tag.id,
                    engineVersion: ENGINE_VERSION,
                },
            });

            if (existing) {
                existing.score = output.score;
                existing.confidence = output.confidence;
                existing.reasonsJson = JSON.stringify(output.reasons);
                existing.computedAt = new Date();
                results.push(await resultRepo.save(existing));
            } else {
                const entity = resultRepo.create({
                    restaurantId,
                    dietTagId: tag.id,
                    score: output.score,
                    confidence: output.confidence,
                    reasonsJson: JSON.stringify(output.reasons),
                    engineVersion: ENGINE_VERSION,
                    computedAt: new Date(),
                });
                results.push(await resultRepo.save(entity));
            }
        }

        return results;
    });
}

/**
 * Get stored inference results for a restaurant (optionally filtered by engine version).
 */
export async function getResultsByRestaurant(
    restaurantId: string,
    engineVersion?: string,
): Promise<DietInferenceResult[]> {
    const repo = AppDataSource.getRepository(DietInferenceResult);
    const where: Record<string, unknown> = {restaurantId};
    if (engineVersion) {
        where.engineVersion = engineVersion;
    }
    return await repo.find({where, relations: ['dietTag']});
}

/**
 * Recompute diet inference after a menu change.
 */
export async function recomputeAfterMenuChange(restaurantId: string): Promise<DietInferenceResult[]> {
    return await computeForRestaurant(restaurantId);
}
