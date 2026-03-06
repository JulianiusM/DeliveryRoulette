import {In} from 'typeorm';
import {AppDataSource} from '../dataSource';
import {DietInferenceResult} from '../entities/diet/DietInferenceResult';
import {DietTag} from '../entities/diet/DietTag';
import {MenuItemDietOverride} from '../entities/diet/MenuItemDietOverride';
import {MenuCategory} from '../entities/menu/MenuCategory';
import settings from '../../settings';

/** Current engine version - bump when rules change. */
export const ENGINE_VERSION = '6.6.0';

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
 * Tag data shape used by the inference engine.
 * Fully data-driven — no hardcoded keys or rules.
 */
interface InferenceTagData {
    id: string;
    key: string;
    parentTagKey?: string | null;
    keywords?: Array<{value: string}>;
    dishes?: Array<{value: string}>;
    allergenExclusions?: Array<{value: string}>;
    negativeKeywords?: Array<{value: string}>;
    strongSignals?: Array<{value: string}>;
    contradictionPatterns?: Array<{value: string}>;
    qualifiedNegExceptions?: Array<{value: string}>;
}

interface DietOptionConfirmation {
    kind: 'preparation' | 'choice';
    negativeCoverage: Set<string>;
    allergenCoverage: Set<string>;
}

// ── Cross-contamination patterns (universal, not diet-specific) ──
const CROSS_CONTAMINATION_PATTERNS: RegExp[] = [
    /\bmay come into contact\b/i,
    /\bprepared on (the )?same grill\b/i,
    /\bon (the )?same grill\b/i,
    /\bauf (dem|denselben|demselben) grill\b/i,
    /\bauf demselben grill\b/i,
    /\bauf dem gleichen grill\b/i,
    /\bin kontakt kommen\b/i,
    /\bkonnten mit diesen in kontakt kommen\b/i,
    /\bcross[- ]?contamination\b/i,
    /\bshared (grill|fryer|equipment)\b/i,
    /\btraces of\b/i,
    /\bspuren von\b/i,
];

const ACCESSORY_ITEM_PATTERNS: RegExp[] = [
    /\bdip\b/i,
    /\bsauce\b/i,
    /\bdressing\b/i,
    /\bmayo\b/i,
    /\bmayonnaise\b/i,
    /\bsosse\b/i,
];

const PAIRING_CONTEXT_PATTERNS: RegExp[] = [
    /\bbest (with|enjoyed|paired)\b/i,
    /\bpair(s|ing)? with\b/i,
    /\bgoes well with\b/i,
    /\bideal with\b/i,
    /\bdipp?ing\b/i,
    /\bdippen\b/i,
    /\bam besten\b/i,
    /\bpasst (perfekt )?zu\b/i,
];

const COMPOUND_INGREDIENT_KEYWORDS = new Set([
    'cheese',
    'kase',
    'fish',
    'fisch',
]);

const PREPARATION_CONFIRMATION_SIGNALS_BY_TAG_KEY: Record<string, string[]> = {
    vegan: ['vegan'],
    vegetarian: ['vegetarian', 'vegetarisch'],
    'gluten free': ['gluten-free', 'gluten free', 'glutenfrei'],
    'lactose free': ['lactose-free', 'lactose free', 'laktosefrei'],
    halal: ['halal'],
};

const EXPLICIT_IDENTITY_PATTERNS_BY_TAG_KEY: Record<string, RegExp[]> = {
    vegan: [
        /\bvegan[a-z]*\b/i,
    ],
    vegetarian: [
        /\bvegetarian\b/i,
        /\bveggie\b/i,
        /\bvegetar[a-z]*\b/i,
        /\bmeat[- ]?free\b/i,
        /\bfleischlos\b/i,
    ],
    'gluten free': [
        /\bgluten[- ]?free\b/i,
        /\bglutenfrei\b/i,
    ],
    'lactose free': [
        /\blactose[- ]?free\b/i,
        /\blaktosefrei\b/i,
        /\bdairy[- ]?free\b/i,
        /\bmilchfrei\b/i,
    ],
    halal: [
        /\bhalal\b/i,
    ],
};

const HEURISTIC_DIET_CONTEXT_PREFIXES = new Set([
    'category:',
    'category-description:',
    'labels:',
    'item-info:',
    'nutrition:',
    'detail-nutrition:',
    'restrictions:',
    'allergens:',
]);

const CHOICE_ALLERGEN_COVERAGE_BY_NEGATIVE: Record<string, string[]> = {
    cheese: ['milk', 'milch', 'dairy', 'lactose', 'laktose'],
    kase: ['milk', 'milch', 'dairy', 'lactose', 'laktose'],
    milk: ['milk', 'milch', 'dairy', 'lactose', 'laktose'],
    milch: ['milk', 'milch', 'dairy', 'lactose', 'laktose'],
    dairy: ['milk', 'milch', 'dairy', 'lactose', 'laktose'],
    butter: ['milk', 'milch', 'dairy', 'lactose', 'laktose'],
    cream: ['milk', 'milch', 'dairy', 'lactose', 'laktose'],
    sahne: ['milk', 'milch', 'dairy', 'lactose', 'laktose'],
    yoghurt: ['milk', 'milch', 'dairy', 'lactose', 'laktose'],
    yogurt: ['milk', 'milch', 'dairy', 'lactose', 'laktose'],
    whey: ['milk', 'milch', 'dairy', 'lactose', 'laktose'],
    casein: ['milk', 'milch', 'dairy', 'lactose', 'laktose'],
    egg: ['egg', 'eggs', 'ei', 'eier'],
    eggs: ['egg', 'eggs', 'ei', 'eier'],
    ei: ['egg', 'eggs', 'ei', 'eier'],
    eier: ['egg', 'eggs', 'ei', 'eier'],
    mayo: ['egg', 'eggs', 'ei', 'eier'],
    mayonnaise: ['egg', 'eggs', 'ei', 'eier'],
    aioli: ['egg', 'eggs', 'ei', 'eier'],
    pork: ['pork', 'schwein'],
    ham: ['pork', 'schwein'],
    bacon: ['pork', 'schwein'],
    schinken: ['pork', 'schwein'],
    speck: ['pork', 'schwein'],
};

/**
 * Parse a comma-separated allergen string into normalized tokens.
 */
function parseAllergenTokens(allergens?: string | null): string[] {
    if (!allergens || !allergens.trim()) return [];
    return allergens
        .split(/[,|;]+/)
        .flatMap((part) => stripDiacritics(part.trim().toLowerCase()).split(/\s+/))
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

function isCrossContaminationNegativeHit(text: string, keyword: string): boolean {
    const sentences = text
        .split(/[.!?\n]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    const keywordPattern = buildKeywordPattern(keyword);

    return sentences.some((sentence) => (
        keywordPattern.test(sentence)
        && CROSS_CONTAMINATION_PATTERNS.some((pattern) => pattern.test(sentence))
    ));
}

function splitDietContextLines(dietContext: string | null | undefined): string[] {
    if (!dietContext) return [];
    return dietContext
        .split(/\r?\n+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

function buildHeuristicContextText(item: InferenceMenuItem): string {
    const relevantContextLines = splitDietContextLines(item.dietContext)
        .filter((line) => {
            const normalizedLine = normalizeText(line);
            return [...HEURISTIC_DIET_CONTEXT_PREFIXES].some((prefix) => normalizedLine.startsWith(prefix));
        });

    return normalizeText([
        item.categoryName ?? '',
        item.description ?? '',
        ...relevantContextLines,
    ].join(' '));
}

function getDietOptionConfirmation(
    dietContext: string | null | undefined,
    dietTagKey: string,
    negativeKeywords: string[],
    allergenExclusions: string[],
): DietOptionConfirmation | null {
    const lines = splitDietContextLines(dietContext).map((line) => normalizeText(line));
    if (lines.length === 0) return null;

    const normalizedTagKey = normalizeText(dietTagKey.replace(/_/g, ' '));
    const confirmationSignals = PREPARATION_CONFIRMATION_SIGNALS_BY_TAG_KEY[normalizedTagKey] ?? [normalizedTagKey];
    const signalPatterns = confirmationSignals.map((signal) => buildKeywordPattern(signal));
    const choiceNegativeCoverage = new Set<string>();
    const choiceAllergenCoverage = new Set<string>();

    for (const line of lines) {
        if (!signalPatterns.some((pattern) => pattern.test(line))) {
            continue;
        }

        if (/^diet-preparation:/i.test(line)) {
            return {
                kind: 'preparation',
                negativeCoverage: new Set<string>(),
                allergenCoverage: new Set<string>(),
            };
        }

        if (
            /^diet-options:/i.test(line)
            && /\b(prepar(?:ed|ation)?|zubereitet|zubereitung)\b/i.test(line)
        ) {
            return {
                kind: 'preparation',
                negativeCoverage: new Set<string>(),
                allergenCoverage: new Set<string>(),
            };
        }

        if (!/^diet-choice:/i.test(line)) {
            continue;
        }

        const negativeCoverage = findKeywordHits(line, negativeKeywords).map((keyword) => normalizeText(keyword));
        const allergenCoverage = [
            ...findAllergenExclusions(line, allergenExclusions).map((keyword) => normalizeText(keyword)),
            ...expandChoiceAllergenCoverage(negativeCoverage),
        ];

        for (const keyword of negativeCoverage) {
            choiceNegativeCoverage.add(keyword);
        }
        for (const keyword of allergenCoverage) {
            choiceAllergenCoverage.add(keyword);
        }
    }

    if (choiceNegativeCoverage.size === 0 && choiceAllergenCoverage.size === 0) {
        return null;
    }

    return {
        kind: 'choice',
        negativeCoverage: choiceNegativeCoverage,
        allergenCoverage: choiceAllergenCoverage,
    };
}

function expandChoiceAllergenCoverage(negativeCoverage: string[]): string[] {
    const expanded = new Set<string>();
    for (const keyword of negativeCoverage) {
        const mapped = CHOICE_ALLERGEN_COVERAGE_BY_NEGATIVE[normalizeText(keyword)] ?? [];
        for (const allergen of mapped) {
            expanded.add(normalizeText(allergen));
        }
    }
    return [...expanded];
}

function hasDirectDietNegation(text: string, dietTagKey: string): boolean {
    const normalizedTagKey = normalizeText(dietTagKey.replace(/_/g, ' '));
    const confirmationSignals = PREPARATION_CONFIRMATION_SIGNALS_BY_TAG_KEY[normalizedTagKey] ?? [normalizedTagKey];

    return confirmationSignals.some((signal) => {
        const escaped = escapeRegex(stripDiacritics(signal))
            .replace(/\\\s+/g, '\\s+')
            .replace(/\\-/g, '[-\\s]?');
        return new RegExp(`\\b(not|nicht|kein|keine)\\s+${escaped}\\b`, 'i').test(text);
    });
}

function isChoiceCovered(coverage: Set<string>, keyword: string): boolean {
    return coverage.has(normalizeText(keyword));
}

function getExplicitIdentitySource(
    nameText: string,
    categoryText: string,
    dietTagKey: string,
): 'name' | 'category' | null {
    const normalizedTagKey = normalizeText(dietTagKey.replace(/_/g, ' '));
    const patterns = EXPLICIT_IDENTITY_PATTERNS_BY_TAG_KEY[normalizedTagKey] ?? [];

    if (patterns.some((pattern) => pattern.test(nameText))) {
        return 'name';
    }
    if (patterns.some((pattern) => pattern.test(categoryText))) {
        return 'category';
    }

    return null;
}

function hasContradiction(text: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
}

function hasAccessoryItemName(nameText: string): boolean {
    return ACCESSORY_ITEM_PATTERNS.some((pattern) => pattern.test(nameText));
}

/**
 * Detect cases where a diet keyword appears only as a side-note in context
 * that does not make the whole item diet-compatible.
 * Uses strong signals from the tag data rather than hardcoded keys.
 * Supports English and German pattern structures.
 */
function hasContextFalsePositive(
    text: string,
    nameText: string,
    strongSignals: string[],
): boolean {
    if (strongSignals.length === 0) return false;

    // Check if any strong signal is in the name — if so, it's a primary claim
    if (nameText && strongSignals.some((signal) => buildKeywordPattern(signal).test(nameText))) {
        return false;
    }

    // Check for condiment/side component mention pattern (EN + DE)
    const signalPattern = strongSignals.map((s) => escapeRegex(s)).join('|');
    const condimentMention = new RegExp(`\\b(${signalPattern})\\b.*\\b(mayo|mayonnaise|sauce|dressing|sosse|dip)\\b`, 'i').test(text);
    const sideComponentPhrase = new RegExp(
        `\\b(comes with|also comes with|served with|with our|dazu|serviert mit|mit unserer|beilage)\\b.*\\b(${signalPattern})\\b`, 'i',
    ).test(text);

    if (!condimentMention && !sideComponentPhrase) {
        return false;
    }

    // EN + DE: the main item itself is non-diet
    const nonDietMain = /\b(beef|chicken|pork|fish|burger|patty|steak|rind|huhn|hahnchen|schwein|fisch|schnitzel)\b/i.test(text);
    return nonDietMain;
}

function isQualifiedSupportingContext(
    text: string,
    keyword: string,
    strongSignals: string[],
): boolean {
    if (strongSignals.length === 0) return false;

    const normalizedKeyword = keyword.toLowerCase();
    if (!['mayo', 'mayonnaise', 'sauce', 'dressing', 'sosse', 'dip'].includes(normalizedKeyword)) {
        return false;
    }

    const escapedKeyword = escapeRegex(keyword)
        .replace(/\\\s+/g, '\\s+')
        .replace(/\\-/g, '[-\\s]?');
    const signalPattern = strongSignals.map((signal) => escapeRegex(signal)).join('|');

    const qualifiedCondimentPhrase = new RegExp(
        `\\b(${signalPattern})\\b[^.!?]{0,40}\\b${escapedKeyword}\\b`,
        'i',
    ).test(text);
    const sideComponentPhrase = new RegExp(
        `\\b(comes with|also comes with|served with|with our|dazu|serviert mit|mit unserer|beilage)\\b[^.!?]{0,60}\\b${escapedKeyword}\\b`,
        'i',
    ).test(text);

    return qualifiedCondimentPhrase || sideComponentPhrase;
}

function isPairingContextNegativeHit(
    nameText: string,
    text: string,
    keyword: string,
    explicitCompatibilityClaim: boolean,
): boolean {
    if (!explicitCompatibilityClaim || !hasAccessoryItemName(nameText)) return false;

    const sentences = text
        .split(/[.!?\n]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    const keywordPattern = buildKeywordPattern(keyword);

    if (keywordPattern.test(nameText)) {
        return false;
    }

    return sentences.some((sentence) => (
        keywordPattern.test(sentence)
        && PAIRING_CONTEXT_PATTERNS.some((pattern) => pattern.test(sentence))
    ));
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildKeywordPattern(keyword: string): RegExp {
    const escaped = escapeRegex(stripDiacritics(keyword))
        .replace(/\\\s+/g, '\\s+')
        .replace(/\\-/g, '[-\\s]?');
    return new RegExp(`\\b${escaped}\\b`, 'i');
}

function buildCompoundKeywordPattern(keyword: string): RegExp | null {
    const normalizedKeyword = normalizeText(keyword);
    if (!COMPOUND_INGREDIENT_KEYWORDS.has(normalizedKeyword)) {
        return null;
    }

    const escaped = escapeRegex(stripDiacritics(keyword))
        .replace(/\\\s+/g, '\\s+')
        .replace(/\\-/g, '[-\\s]?');
    return new RegExp(`\\b${escaped}[a-z]+\\b`, 'i');
}

function findKeywordHits(text: string, keywords: string[]): string[] {
    return keywords.filter((keyword) => {
        if (buildKeywordPattern(keyword).test(text)) {
            return true;
        }

        const compoundPattern = buildCompoundKeywordPattern(keyword);
        return compoundPattern ? compoundPattern.test(text) : false;
    });
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

function findDishHits(nameText: string, contextText: string, dishWhitelist: string[]): string[] {
    if (dishWhitelist.length === 0) return [];
    void contextText;
    return dishWhitelist.filter((dish) => buildKeywordPattern(dish).test(nameText));
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
 * Strip diacritics/accents from a string without altering case or whitespace.
 * Safe to apply to regex pattern strings — only removes combining marks.
 */
function stripDiacritics(text: string): string {
    return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
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
 * All thresholds and weights read from settings for configurability.
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
    const s = settings.value;
    const safeRatio = Math.max(0, Math.min(1, matchRatio));
    const ratioScore = Math.round(safeRatio * 100);
    const strongSignalCount = context.strongSignalCount ?? 0;
    const manualOverrideCount = context.manualOverrideCount ?? 0;
    const excludedCount = context.excludedCount ?? 0;

    let confidence: Confidence;
    if (totalMenuItems === 0) {
        confidence = 'LOW';
    } else if (strongSignalCount >= s.inferenceHighConfidenceMinStrongSignals && safeRatio >= 0.2) {
        confidence = 'HIGH';
    } else if (totalMenuItems < s.inferenceSmallMenuThreshold) {
        confidence = safeRatio >= s.inferenceMediumConfidenceMinRatio ? 'MEDIUM' : 'LOW';
    } else if (safeRatio >= s.inferenceHighConfidenceMinRatio) {
        confidence = 'HIGH';
    } else if (safeRatio > 0) {
        confidence = 'MEDIUM';
    } else {
        confidence = 'LOW';
    }

    const evidenceBoost = Math.min(
        s.inferenceEvidenceBoostCap,
        Math.round((strongSignalCount * s.inferenceStrongSignalWeight) + (manualOverrideCount * s.inferenceManualOverrideWeight) + (safeRatio * s.inferenceRatioWeight)),
    );
    const evidencePenalty = Math.min(s.inferenceEvidencePenaltyCap, excludedCount * s.inferencePenaltyPerExcluded);
    const confidenceMultiplier = confidence === 'HIGH'
        ? 1
        : confidence === 'MEDIUM'
            ? s.inferenceConfidenceMultiplierMedium
            : s.inferenceConfidenceMultiplierLow;
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

/**
 * Run keyword matching for a single diet tag against a list of menu items.
 * Fully data-driven: all rules come from the tag's child tables.
 * Supports item-level manual overrides and context-aware false-positive filtering.
 */
export function inferForTag(
    dietTag: InferenceTagData,
    items: InferenceMenuItem[],
    options: InferTagOptions = {},
): InferenceOutput {
    const s = settings.value;

    // Load all rules from tag data (fully data-driven, no hardcoded keys)
    const tagKeywords = (dietTag.keywords ?? []).map((kw) => kw.value);
    const tagDishes = (dietTag.dishes ?? []).map((d) => d.value);
    const tagAllergenExclusions = (dietTag.allergenExclusions ?? []).map((ae) => ae.value);
    const tagNegativeKeywords = (dietTag.negativeKeywords ?? []).map((nk) => nk.value);
    const tagStrongSignals = (dietTag.strongSignals ?? []).map((ss) => ss.value);
    const tagContradictionPatterns = (dietTag.contradictionPatterns ?? []).map((cp) => {
        try { return new RegExp(stripDiacritics(cp.value), 'i'); } catch { return null; }
    }).filter((p): p is RegExp => p !== null);
    const tagQualifiedNegExceptions = new Set((dietTag.qualifiedNegExceptions ?? []).map((qne) => normalizeText(qne.value)));

    // Merge with runtime options
    const keywords = mergeUnique([
        ...tagKeywords,
        ...(options.keywordWhitelist ?? []).map((entry) => normalizeText(entry)),
    ]);
    const dishWhitelist = mergeUnique([
        ...tagDishes,
        ...(options.dishWhitelist ?? []).map((entry) => normalizeText(entry)),
    ]);
    const allergenExclusions = mergeUnique([
        ...tagAllergenExclusions,
        ...(options.allergenExclusions ?? []).map((entry) => normalizeText(entry)),
    ]);
    const negativeKeywords = tagNegativeKeywords;
    const strongSignals = tagStrongSignals;
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
        const categoryText = normalizeText(item.categoryName ?? '');
        const contextText = buildHeuristicContextText(item);
        const text = normalizeText(`${nameText} ${contextText}`);
        const explicitIdentitySource = getExplicitIdentitySource(nameText, categoryText, dietTag.key);
        const dietOptionConfirmation = getDietOptionConfirmation(
            item.dietContext,
            dietTag.key,
            negativeKeywords,
            allergenExclusions,
        );

        const positiveNameHits = findKeywordHits(nameText, keywords);
        const positiveContextHits = findKeywordHits(contextText, keywords);
        const dishHits = findDishHits(nameText, contextText, dishWhitelist);
        const positiveHits = mergeUnique([
            ...positiveNameHits,
            ...positiveContextHits,
            ...dishHits.map((dish) => `dish:${dish}`),
            ...(explicitIdentitySource ? [`explicit-${explicitIdentitySource}`] : []),
            ...(dietOptionConfirmation ? [`diet-${dietOptionConfirmation.kind}`] : []),
        ]);
        if (positiveHits.length === 0) {
            continue;
        }

        if (explicitIdentitySource) {
            matchedItems.push({
                itemId: item.id,
                itemName: item.name,
                keywords: positiveHits,
                source: 'heuristic',
            });
            positiveEvidence += 1;
            strongSignalCount += 1;
            continue;
        }

        if (dietOptionConfirmation?.kind === 'preparation') {
            matchedItems.push({
                itemId: item.id,
                itemName: item.name,
                keywords: [...positiveHits, 'preparation-option'],
                source: 'heuristic',
            });
            positiveEvidence += 1;
            strongSignalCount += 1;
            continue;
        }

        const penalties: string[] = [];
        const dietQualifierInName = strongSignals.some((signal) => buildKeywordPattern(signal).test(nameText));
        const explicitCompatibilityClaim = hasExplicitCompatibilityClaim(text, strongSignals);
        const hasStrongSignal = dietQualifierInName
            || explicitCompatibilityClaim
            || positiveNameHits.length > 0
            || dishHits.length > 0
            || Boolean(dietOptionConfirmation);
        if (hasStrongSignal) {
            strongSignalCount += 1;
        }

        const negativeNameHits = findKeywordHits(nameText, negativeKeywords)
            .filter((keyword) => !isNegatedOrFreeContext(text, keyword));
        const negativeContextHits = findKeywordHits(contextText, negativeKeywords)
            .filter((keyword) => !isNegatedOrFreeContext(text, keyword));

        const filteredNegativeNameHits = negativeNameHits.filter((keyword) => {
            if (!dietQualifierInName && !explicitCompatibilityClaim) return true;
            return !tagQualifiedNegExceptions.has(normalizeText(keyword));
        });
        const filteredNegativeContextHits = negativeContextHits.filter((keyword) => {
            const isQualifiedException = tagQualifiedNegExceptions.has(normalizeText(keyword));
            if (explicitCompatibilityClaim && isQualifiedException) return false;
            if (isPairingContextNegativeHit(nameText, text, keyword, explicitCompatibilityClaim)) return false;
            if (dietQualifierInName && isQualifiedException && isQualifiedSupportingContext(text, keyword, strongSignals)) {
                return false;
            }
            return true;
        });
        const negativeHits = mergeUnique([...filteredNegativeNameHits, ...filteredNegativeContextHits]);
        const contradiction = hasContradiction(text, tagContradictionPatterns);
        const contextFalsePositive = hasContextFalsePositive(text, nameText, strongSignals);
        const crossContamination = hasCrossContamination(text);
        const actionableNegativeHits = negativeHits.filter((keyword) => !isCrossContaminationNegativeHit(text, keyword));
        const itemAllergenExclusions = findAllergenExclusions(item.allergens, allergenExclusions);
        const uncoveredNegativeHits = dietOptionConfirmation?.kind === 'choice'
            ? actionableNegativeHits.filter((keyword) => !isChoiceCovered(dietOptionConfirmation.negativeCoverage, keyword))
            : actionableNegativeHits;
        const uncoveredAllergenExclusions = dietOptionConfirmation?.kind === 'choice'
            ? itemAllergenExclusions.filter((keyword) => !isChoiceCovered(dietOptionConfirmation.allergenCoverage, keyword))
            : itemAllergenExclusions;
        const choiceCanOverride = dietOptionConfirmation?.kind === 'choice'
            && !hasDirectDietNegation(text, dietTag.key)
            && uncoveredNegativeHits.length === 0
            && uncoveredAllergenExclusions.length === 0;

        if (contradiction && !choiceCanOverride) {
            penalties.push('contradiction');
        }

        if (contextFalsePositive) {
            penalties.push('context-false-positive');
        }

        if (uncoveredAllergenExclusions.length > 0) {
            penalties.push(`allergen:${uncoveredAllergenExclusions.join(',')}`);
        }

        if (uncoveredNegativeHits.length > 0) {
            penalties.push(`negative:${uncoveredNegativeHits[0]}`);
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
            positiveEvidence += s.inferenceCrossContaminationWeight;
            continue;
        }

        matchedItems.push({
            itemId: item.id,
            itemName: item.name,
            keywords: dietOptionConfirmation?.kind === 'choice'
                ? [...positiveHits, 'choice-option']
                : positiveHits,
            source: 'heuristic',
        });
        positiveEvidence += dishHits.length > 0 ? s.inferenceDishHitWeight : 1;
    }

    const totalMenuItems = items.length;
    const rawRatio = totalMenuItems > 0
        ? (positiveEvidence - (negativeEvidence * s.inferenceNegativeEvidenceWeight)) / totalMenuItems
        : 0;
    const matchRatio = Math.max(0, Math.min(1, rawRatio));
    const {score, confidence, breakdown} = computeScoreAndConfidence(matchRatio, totalMenuItems, {
        strongSignalCount,
        manualOverrideCount,
        excludedCount: excludedItems.length,
    });
    const hasMatchedItems = matchedItems.length > 0;
    const finalScore = hasMatchedItems ? score : 0;
    const finalConfidence: Confidence = hasMatchedItems ? confidence : 'LOW';

    return {
        dietTagId: dietTag.id,
        dietTagKey: dietTag.key,
        score: finalScore,
        confidence: finalConfidence,
        reasons: {
            matchedItems,
            excludedItems: excludedItems.length > 0 ? excludedItems : undefined,
            totalMenuItems,
            matchRatio,
            scoreBreakdown: {
                ...breakdown,
                finalScore,
            },
        },
    };
}

/**
 * Check for explicit compatibility claims using strong signals.
 * E.g., "is vegan", "100% vegetarian", "fully vegan", "ist vegan", "komplett vegan"
 */
function hasExplicitCompatibilityClaim(text: string, strongSignals: string[]): boolean {
    for (const signal of strongSignals) {
        const escaped = escapeRegex(signal);
        const patterns = [
            // EN patterns
            new RegExp(`\\b(is|it's|its)\\s+${escaped}\\b`, 'i'),
            new RegExp(`\\b${escaped}\\s+too\\b`, 'i'),
            new RegExp(`\\b100%\\s+${escaped}\\b`, 'i'),
            new RegExp(`\\bfully\\s+${escaped}\\b`, 'i'),
            // DE patterns
            new RegExp(`\\b(ist|komplett|rein|zu 100%)\\s+${escaped}\\b`, 'i'),
            new RegExp(`\\b${escaped}\\s+(auch|ebenfalls)\\b`, 'i'),
            new RegExp(`\\b(auch|ebenfalls|jetzt|nun|sogar)\\b[^.!?]{0,20}\\bin\\s+${escaped}\\b`, 'i'),
            new RegExp(`\\b${escaped}\\s+zubereitet\\b`, 'i'),
        ];
        if (patterns.some((p) => p.test(text))) return true;
    }
    return false;
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

/**
 * Apply subdiet inheritance using the parentTagKey field.
 * E.g., VEGAN items are inherited by VEGETARIAN.
 */
function applySubdietInheritance(outputs: InferenceOutput[], tags: DietTag[]): void {
    const byKey = new Map(outputs.map((output) => [output.dietTagKey, output]));
    const tagsByKey = new Map(tags.map((tag) => [tag.key, tag]));

    for (const tag of tags) {
        if (!tag.parentTagKey) continue;
        const parent = byKey.get(tag.key);
        const child = byKey.get(tag.parentTagKey);
        if (!parent || !child) continue;

        const merged = new Map(
            child.reasons.matchedItems.map((item) => [item.itemId, item]),
        );

        for (const item of parent.reasons.matchedItems) {
            if (merged.has(item.itemId)) continue;
            merged.set(item.itemId, {
                ...item,
                keywords: mergeUnique([...item.keywords, `inherited-from:${tag.key.toLowerCase()}`]),
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

/**
 * Compute inference results for every diet tag for a given restaurant
 * and persist them (upsert by unique constraint).
 */
export async function computeForRestaurant(restaurantId: string): Promise<DietInferenceResult[]> {
    return AppDataSource.transaction(async (manager) => {
        const tagRepo = manager.getRepository(DietTag);
        const resultRepo = manager.getRepository(DietInferenceResult);
        const itemOverrideRepo = manager.getRepository(MenuItemDietOverride);

        const dietTags = await tagRepo.find({relations: ['keywords', 'dishes', 'allergenExclusions', 'negativeKeywords', 'strongSignals', 'contradictionPatterns', 'qualifiedNegExceptions']});
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

        applySubdietInheritance(outputs, dietTags);

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
