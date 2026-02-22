import {AppDataSource} from '../dataSource';
import {DietInferenceResult} from '../entities/diet/DietInferenceResult';
import {DietTag} from '../entities/diet/DietTag';
import {MenuCategory} from '../entities/menu/MenuCategory';
import {MenuItem} from '../entities/menu/MenuItem';

/** Current engine version — bump when rules change. */
export const ENGINE_VERSION = '1.0.0';

// ── Confidence enum ────────────────────────────────────────

export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';

// ── Reason structures ──────────────────────────────────────

export interface MatchedItem {
    itemId: string;
    itemName: string;
    keywords: string[];
}

export interface InferenceReasons {
    matchedItems: MatchedItem[];
    totalMenuItems: number;
    matchRatio: number;
}

export interface InferenceOutput {
    dietTagId: string;
    dietTagKey: string;
    score: number;
    confidence: Confidence;
    reasons: InferenceReasons;
}

// ── Keyword rule sets ──────────────────────────────────────

/**
 * Map of diet-tag key → keywords to look for in item name / description.
 * All comparisons are case-insensitive after normalisation.
 */
export const DIET_KEYWORD_RULES: Record<string, string[]> = {
    VEGAN: [
        'vegan', 'plant-based', 'plant based', 'tofu',
        'tempeh', 'seitan', 'dairy-free', 'dairy free',
        // German
        'pflanzlich', 'pflanzenbasiert',
    ],
    VEGETARIAN: [
        'vegetarian', 'veggie', 'vegan', 'meat-free',
        'meat free', 'meatless',
        // German
        'vegetarisch', 'fleischlos', 'ohne fleisch',
    ],
    GLUTEN_FREE: [
        'gluten-free', 'gluten free', 'gf', 'celiac',
        'coeliac', 'no gluten',
        // German
        'glutenfrei', 'ohne gluten',
    ],
    LACTOSE_FREE: [
        'lactose-free', 'lactose free', 'dairy-free',
        'dairy free', 'no dairy', 'no lactose',
        // German
        'laktosefrei', 'ohne laktose', 'milchfrei',
    ],
    HALAL: [
        'halal',
    ],
};

// ── Text normalisation ────────────────────────────────────

/**
 * Normalize text for keyword matching.
 * Lower-cases, collapses whitespace, and strips surrounding whitespace.
 */
export function normalizeText(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

// ── Scoring helpers ────────────────────────────────────────

/**
 * Given a ratio of matching items to total items (0–1),
 * return a score (0–100) and confidence level.
 */
export function computeScoreAndConfidence(
    matchRatio: number,
    totalMenuItems: number,
): {score: number; confidence: Confidence} {
    const score = Math.round(matchRatio * 100);

    let confidence: Confidence;
    if (totalMenuItems === 0) {
        confidence = 'LOW';
    } else if (totalMenuItems < 5) {
        confidence = matchRatio >= 0.5 ? 'MEDIUM' : 'LOW';
    } else {
        if (matchRatio >= 0.3) {
            confidence = 'HIGH';
        } else if (matchRatio > 0) {
            confidence = 'MEDIUM';
        } else {
            confidence = 'LOW';
        }
    }

    return {score, confidence};
}

// ── Core inference logic (pure) ────────────────────────────

/**
 * Run keyword matching for a single diet tag against a list of menu items.
 * This is the pure, testable core – no database access.
 */
export function inferForTag(
    dietTag: {id: string; key: string},
    items: Array<{id: string; name: string; description?: string | null}>,
): InferenceOutput {
    const keywords = DIET_KEYWORD_RULES[dietTag.key] ?? [];
    const matchedItems: MatchedItem[] = [];

    for (const item of items) {
        const haystack = normalizeText(
            [item.name, item.description ?? ''].join(' '),
        );
        const matched = keywords.filter((kw) => haystack.includes(kw));
        if (matched.length > 0) {
            matchedItems.push({
                itemId: item.id,
                itemName: item.name,
                keywords: matched,
            });
        }
    }

    const totalMenuItems = items.length;
    const matchRatio = totalMenuItems > 0
        ? matchedItems.length / totalMenuItems
        : 0;

    const {score, confidence} = computeScoreAndConfidence(matchRatio, totalMenuItems);

    return {
        dietTagId: dietTag.id,
        dietTagKey: dietTag.key,
        score,
        confidence,
        reasons: {
            matchedItems,
            totalMenuItems,
            matchRatio,
        },
    };
}

// ── Database-backed operations ─────────────────────────────

/**
 * Fetch all active menu items for a restaurant (across all active categories).
 */
export async function getActiveMenuItems(
    restaurantId: string,
): Promise<MenuItem[]> {
    const catRepo = AppDataSource.getRepository(MenuCategory);
    const categories = await catRepo.find({
        where: {restaurantId, isActive: true},
        relations: ['items'],
    });

    const items: MenuItem[] = [];
    for (const cat of categories) {
        for (const item of cat.items) {
            if (item.isActive) items.push(item);
        }
    }
    return items;
}

/**
 * Compute inference results for every diet tag for a given restaurant
 * and persist them (upsert by unique constraint).
 */
export async function computeForRestaurant(
    restaurantId: string,
): Promise<DietInferenceResult[]> {
    return AppDataSource.transaction(async (manager) => {
        const tagRepo = manager.getRepository(DietTag);
        const resultRepo = manager.getRepository(DietInferenceResult);

        const dietTags = await tagRepo.find();
        const items = await getActiveMenuItems(restaurantId);

        const results: DietInferenceResult[] = [];

        for (const tag of dietTags) {
            const output = inferForTag(tag, items);

            // Try to find an existing result for this (restaurant, tag, version)
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
 * This is the main entrypoint to be called from the service layer
 * whenever menu items are created, updated, or deleted.
 */
export async function recomputeAfterMenuChange(
    restaurantId: string,
): Promise<DietInferenceResult[]> {
    return await computeForRestaurant(restaurantId);
}
