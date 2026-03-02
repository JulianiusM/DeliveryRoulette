/**
 * Unit tests for DietInferenceService
 * Tests pure inference logic (normalisation, scoring, keyword matching)
 */

import {
    normalizeTextData,
    scoreAndConfidenceData,
    inferForTagData,
    germanKeywordExpectations,
    engineVersionData,
} from '../data/unit/dietInferenceData';
import {
    normalizeText,
    computeScoreAndConfidence,
    inferForTag,
    ENGINE_VERSION,
    DIET_KEYWORD_RULES,
} from '../../src/modules/database/services/DietInferenceService';
import {
    DEFAULT_DIET_TAGS,
} from '../../src/modules/database/services/DietTagService';

describe('DietInferenceService', () => {
    describe('ENGINE_VERSION', () => {
        test('is a non-empty semver-like string', () => {
            expect(ENGINE_VERSION).toMatch(engineVersionData.validFormat);
        });

        test('matches expected current version', () => {
            expect(ENGINE_VERSION).toBe(engineVersionData.expectedCurrent);
        });

        test('version components are non-negative integers', () => {
            const parts = ENGINE_VERSION.split('.').map(Number);
            expect(parts).toHaveLength(3);
            for (const part of parts) {
                expect(Number.isInteger(part)).toBe(true);
                expect(part).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe('DIET_KEYWORD_RULES', () => {
        test('has rules for all five default diet tags', () => {
            const expectedKeys = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'LACTOSE_FREE', 'HALAL'];
            for (const key of expectedKeys) {
                expect(DIET_KEYWORD_RULES[key]).toBeDefined();
                expect(DIET_KEYWORD_RULES[key].length).toBeGreaterThan(0);
            }
        });

        test('all keywords are lowercase', () => {
            for (const [, keywords] of Object.entries(DIET_KEYWORD_RULES)) {
                for (const kw of keywords) {
                    expect(kw).toBe(kw.toLowerCase());
                }
            }
        });

        test('no duplicate keywords within the same tag', () => {
            for (const [key, keywords] of Object.entries(DIET_KEYWORD_RULES)) {
                const unique = new Set(keywords);
                expect(unique.size).toBe(keywords.length);
            }
        });

        test.each(germanKeywordExpectations)(
            'includes German keywords for $key',
            ({key, expectedKeywords}) => {
                const rules = DIET_KEYWORD_RULES[key];
                for (const kw of expectedKeywords) {
                    expect(rules).toContain(kw);
                }
            },
        );
    });

    describe('normalizeText', () => {
        test.each(normalizeTextData)('$description', (testCase) => {
            expect(normalizeText(testCase.input)).toBe(testCase.expected);
        });
    });

    describe('computeScoreAndConfidence', () => {
        test.each(scoreAndConfidenceData)('$description', (testCase) => {
            const {score, confidence} = computeScoreAndConfidence(
                testCase.matchRatio,
                testCase.totalMenuItems,
            );
            expect(score).toBe(testCase.expectedScore);
            expect(confidence).toBe(testCase.expectedConfidence);
        });
    });

    describe('Allergen exclusions (data-driven from DEFAULT_DIET_TAGS)', () => {
        const veganTag = DEFAULT_DIET_TAGS.find((t) => t.key === 'VEGAN')!;
        const lactoseFreeTag = DEFAULT_DIET_TAGS.find((t) => t.key === 'LACTOSE_FREE')!;
        const glutenFreeTag = DEFAULT_DIET_TAGS.find((t) => t.key === 'GLUTEN_FREE')!;
        const halalTag = DEFAULT_DIET_TAGS.find((t) => t.key === 'HALAL')!;

        test('VEGAN tag has egg allergen exclusions', () => {
            expect(veganTag.allergenExclusions).toContain('egg');
            expect(veganTag.allergenExclusions).toContain('eggs');
        });

        test('VEGAN tag has milk/dairy allergen exclusions', () => {
            expect(veganTag.allergenExclusions).toContain('milk');
            expect(veganTag.allergenExclusions).toContain('dairy');
        });

        test('LACTOSE_FREE tag has milk/lactose allergen exclusions', () => {
            expect(lactoseFreeTag.allergenExclusions).toContain('milk');
            expect(lactoseFreeTag.allergenExclusions).toContain('lactose');
        });

        test('GLUTEN_FREE tag has gluten/wheat allergen exclusions', () => {
            expect(glutenFreeTag.allergenExclusions).toContain('gluten');
            expect(glutenFreeTag.allergenExclusions).toContain('wheat');
        });

        test('HALAL tag has pork allergen exclusions', () => {
            expect(halalTag.allergenExclusions).toContain('pork');
        });

        test('all exclusion tokens are lowercase', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                for (const exclusion of (tag.allergenExclusions ?? [])) {
                    expect(exclusion).toBe(exclusion.toLowerCase());
                }
            }
        });
    });

    describe('inferForTag', () => {
        test.each(inferForTagData)('$description', (testCase) => {
            const result = inferForTag(testCase.tag, testCase.items);

            expect(result.dietTagId).toBe(testCase.tag.id);
            expect(result.dietTagKey).toBe(testCase.tag.key);

            // Check match count
            expect(result.reasons.matchedItems).toHaveLength(testCase.expectedMatchCount);

            // Check matched item IDs
            const matchedIds = result.reasons.matchedItems.map((m) => m.itemId);
            expect(matchedIds).toEqual(testCase.expectedMatchedItemIds);

            // Score is 0-100
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(100);

            // Confidence is valid
            expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.confidence);

            // Total menu items matches input
            expect(result.reasons.totalMenuItems).toBe(testCase.items.length);

            // Match ratio is consistent
            expect(result.reasons.matchRatio).toBeGreaterThanOrEqual(0);
            expect(result.reasons.matchRatio).toBeLessThanOrEqual(1);
            if (testCase.expectedMatchCount > 0) {
                expect(result.reasons.matchRatio).toBeGreaterThan(0);
            }

            // Each matched item has at least one keyword
            for (const match of result.reasons.matchedItems) {
                expect(match.keywords.length).toBeGreaterThan(0);
            }
        });
    });
});
