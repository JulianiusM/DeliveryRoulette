import {AppDataSource} from '../dataSource';
import {DietManualOverride} from '../entities/diet/DietManualOverride';
import {DietInferenceResult} from '../entities/diet/DietInferenceResult';
import {DietTag} from '../entities/diet/DietTag';
import {ENGINE_VERSION} from './DietInferenceService';

// ── Override CRUD ──────────────────────────────────────────

export async function addOverride(data: {
    restaurantId: string;
    dietTagId: string;
    supported: boolean;
    userId: number;
    notes?: string | null;
}): Promise<DietManualOverride> {
    const repo = AppDataSource.getRepository(DietManualOverride);

    // Upsert: update if already exists for this restaurant+tag pair
    let existing = await repo.findOne({
        where: {restaurantId: data.restaurantId, dietTagId: data.dietTagId},
    });

    if (existing) {
        existing.supported = data.supported;
        existing.userId = data.userId;
        existing.notes = data.notes ?? null;
        existing.updatedAt = new Date();
        return await repo.save(existing);
    }

    const entity = repo.create({
        restaurantId: data.restaurantId,
        dietTagId: data.dietTagId,
        supported: data.supported,
        userId: data.userId,
        notes: data.notes ?? null,
    });
    return await repo.save(entity);
}

export async function removeOverride(
    overrideId: string,
    restaurantId: string,
): Promise<boolean> {
    const repo = AppDataSource.getRepository(DietManualOverride);
    const override = await repo.findOne({
        where: {id: overrideId, restaurantId},
    });
    if (!override) return false;
    await repo.remove(override);
    return true;
}

export async function listByRestaurant(
    restaurantId: string,
): Promise<DietManualOverride[]> {
    const repo = AppDataSource.getRepository(DietManualOverride);
    return await repo.find({
        where: {restaurantId},
        relations: ['dietTag'],
        order: {createdAt: 'ASC'},
    });
}

// ── Effective suitability ──────────────────────────────────

export interface EffectiveSuitability {
    dietTagId: string;
    dietTagKey: string;
    dietTagLabel: string;
    /** true = supports, false = does not support, null = no data */
    supported: boolean | null;
    /** 'override' if manual override present, 'inference' if from heuristic, 'none' if no data */
    source: 'override' | 'inference' | 'none';
    /** Override details when source is 'override' */
    override?: {
        id: string;
        supported: boolean;
        userId: number;
        notes: string | null;
        updatedAt: Date;
    };
    /** Inference details when source is 'inference' */
    inference?: {
        score: number;
        confidence: string;
        reasons?: {
            matchedItems: Array<{
                itemId: string;
                itemName: string;
                keywords: string[];
                source?: 'heuristic' | 'manual_override';
            }>;
            excludedItems?: Array<{
                itemId: string;
                itemName: string;
                keywords: string[];
                excludedBy: string[];
            }>;
            totalMenuItems: number;
            matchRatio: number;
            scoreBreakdown?: {
                ratioScore: number;
                confidenceMultiplier: number;
                evidenceBoost: number;
                evidencePenalty: number;
                finalScore: number;
            };
        };
    };
}

interface InferenceReasons {
    matchedItems: Array<{
        itemId: string;
        itemName: string;
        keywords: string[];
        source?: 'heuristic' | 'manual_override';
    }>;
    excludedItems?: Array<{
        itemId: string;
        itemName: string;
        keywords: string[];
        excludedBy: string[];
    }>;
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

/**
 * Safely parse reasonsJson from an inference result.
 * Returns undefined if parsing fails or data is missing.
 */
function parseReasons(reasonsJson: string | undefined | null): InferenceReasons | undefined {
    if (!reasonsJson) return undefined;
    try {
        const parsed = JSON.parse(reasonsJson);
        if (parsed && Array.isArray(parsed.matchedItems)) {
            return {
                matchedItems: parsed.matchedItems,
                excludedItems: Array.isArray(parsed.excludedItems) ? parsed.excludedItems : undefined,
                totalMenuItems: parsed.totalMenuItems ?? 0,
                matchRatio: parsed.matchRatio ?? 0,
                scoreBreakdown: parsed.scoreBreakdown ?? undefined,
            };
        }
    } catch { /* ignore malformed JSON */ }
    return undefined;
}

/**
 * Build inference detail object from an inference result entity.
 */
function buildInferenceDetail(inference: DietInferenceResult): NonNullable<EffectiveSuitability['inference']> {
    return {
        score: inference.score,
        confidence: inference.confidence,
        reasons: parseReasons(inference.reasonsJson),
    };
}

/**
 * Compute effective diet suitability for a restaurant.
 * Manual overrides take precedence over heuristic inference results.
 */
export async function computeEffectiveSuitability(
    restaurantId: string,
): Promise<EffectiveSuitability[]> {
    const tagRepo = AppDataSource.getRepository(DietTag);
    const overrideRepo = AppDataSource.getRepository(DietManualOverride);
    const inferenceRepo = AppDataSource.getRepository(DietInferenceResult);

    const dietTags = await tagRepo.find({order: {key: 'ASC'}});
    const overrides = await overrideRepo.find({where: {restaurantId}});
    const inferences = await inferenceRepo.find({
        where: {
            restaurantId,
            engineVersion: ENGINE_VERSION,
        },
        order: {computedAt: 'DESC'},
    });

    const overrideMap = new Map(overrides.map(o => [o.dietTagId, o]));
    const inferenceMap = new Map<string, DietInferenceResult>();
    for (const inference of inferences) {
        if (!inferenceMap.has(inference.dietTagId)) {
            inferenceMap.set(inference.dietTagId, inference);
        }
    }

    return dietTags.map(tag => {
        const override = overrideMap.get(tag.id);
        const inference = inferenceMap.get(tag.id);

        if (override) {
            return {
                dietTagId: tag.id,
                dietTagKey: tag.key,
                dietTagLabel: tag.label,
                supported: override.supported,
                source: 'override' as const,
                override: {
                    id: override.id,
                    supported: override.supported,
                    userId: override.userId,
                    notes: override.notes ?? null,
                    updatedAt: override.updatedAt,
                },
                inference: inference ? buildInferenceDetail(inference) : undefined,
            };
        }

        if (inference) {
            const inferenceDetail = buildInferenceDetail(inference);
            const matchedCount = inferenceDetail.reasons?.matchedItems?.length ?? 0;
            return {
                dietTagId: tag.id,
                dietTagKey: tag.key,
                dietTagLabel: tag.label,
                supported: inference.score > 0 || matchedCount > 0,
                source: 'inference' as const,
                inference: inferenceDetail,
            };
        }

        return {
            dietTagId: tag.id,
            dietTagKey: tag.key,
            dietTagLabel: tag.label,
            supported: null,
            source: 'none' as const,
        };
    });
}
