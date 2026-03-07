/**
 * Unit tests for DietInferenceService
 * Tests pure inference logic (normalisation, scoring, keyword matching)
 */

import {
    normalizeTextData,
    scoreAndConfidenceData,
    inferForTagData,
    heuristicCoverageCases,
    germanKeywordExpectations,
    engineVersionData,
} from '../data/unit/dietInferenceData';
import {
    normalizeText,
    computeScoreAndConfidence,
    inferForTag,
    ENGINE_VERSION,
} from '../../src/modules/database/services/DietInferenceService';
import {
    DEFAULT_DIET_TAGS,
} from '../../src/modules/database/data/defaultDietTags';

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

    describe('DEFAULT_DIET_TAGS keyword rules', () => {
        test('has keyword rules for all five default diet tags', () => {
            const expectedKeys = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'LACTOSE_FREE', 'HALAL'];
            for (const key of expectedKeys) {
                const tag = DEFAULT_DIET_TAGS.find((t) => t.key === key);
                expect(tag).toBeDefined();
                expect(tag!.keywordWhitelist.length).toBeGreaterThan(0);
            }
        });

        test('all keywords are lowercase', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                for (const kw of tag.keywordWhitelist) {
                    expect(kw).toBe(kw.toLowerCase());
                }
            }
        });

        test('no duplicate keywords within the same tag', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                const unique = new Set(tag.keywordWhitelist);
                expect(unique.size).toBe(tag.keywordWhitelist.length);
            }
        });

        test.each(germanKeywordExpectations)(
            'includes German keywords for $key',
            ({key, expectedKeywords}) => {
                const tag = DEFAULT_DIET_TAGS.find((t) => t.key === key);
                expect(tag).toBeDefined();
                for (const kw of expectedKeywords) {
                    expect(tag!.keywordWhitelist).toContain(kw);
                }
            },
        );
    });

    describe('DEFAULT_DIET_TAGS negative keywords', () => {
        test('all five tags have negative keywords', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                expect(tag.negativeKeywords.length).toBeGreaterThan(0);
            }
        });

        test('all negative keywords are lowercase', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                for (const kw of tag.negativeKeywords) {
                    expect(kw).toBe(kw.toLowerCase());
                }
            }
        });

        test('VEGAN includes common non-vegan cheese names in the blacklist', () => {
            const veganTag = DEFAULT_DIET_TAGS.find((tag) => tag.key === 'VEGAN');
            expect(veganTag).toBeDefined();
            expect(veganTag!.negativeKeywords).toEqual(expect.arrayContaining([
                'halloumi',
                'haloumi',
                'camembert',
                'brie',
            ]));
        });
    });

    describe('DEFAULT_DIET_TAGS strong signals', () => {
        test('all five tags have strong signals', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                expect(tag.strongSignals.length).toBeGreaterThan(0);
            }
        });
    });

    describe('DEFAULT_DIET_TAGS subdiet inheritance', () => {
        test('VEGAN has VEGETARIAN as parent', () => {
            const veganTag = DEFAULT_DIET_TAGS.find((t) => t.key === 'VEGAN');
            expect(veganTag!.parentTagKey).toBe('VEGETARIAN');
        });

        test('other tags have no parent', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                if (tag.key !== 'VEGAN') {
                    expect(tag.parentTagKey ?? null).toBeNull();
                }
            }
        });
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

        test('returns zero score when all positive hints are excluded by safeguards', () => {
            const veganTag = DEFAULT_DIET_TAGS.find((t) => t.key === 'VEGAN')!;
            const result = inferForTag(
                {
                    id: 'tag-vegan',
                    key: 'VEGAN',
                    parentTagKey: veganTag.parentTagKey ?? null,
                    keywords: veganTag.keywordWhitelist.map((value) => ({value})),
                    dishes: veganTag.dishWhitelist.map((value) => ({value})),
                    allergenExclusions: veganTag.allergenExclusions.map((value) => ({value})),
                    negativeKeywords: veganTag.negativeKeywords.map((value) => ({value})),
                    strongSignals: veganTag.strongSignals.map((value) => ({value})),
                    contradictionPatterns: veganTag.contradictionPatterns.map((value) => ({value})),
                    qualifiedNegExceptions: veganTag.qualifiedNegExceptions.map((value) => ({value})),
                },
                [
                    {
                        id: 'item-1',
                        name: 'Plant-based Big King',
                        description: 'Plant-based burger with sauce',
                        dietContext: 'diet-addon:plant-based zubereitet => Ja | Nein',
                        allergens: 'Eggs, Milk',
                    },
                ],
            );

            expect(result.reasons.matchedItems).toHaveLength(0);
            expect(result.reasons.excludedItems).toHaveLength(1);
            expect(result.score).toBe(0);
            expect(result.confidence).toBe('LOW');
            expect(result.reasons.scoreBreakdown?.finalScore).toBe(0);
        });

        test('excludes halloumi-based falafel items from VEGAN matches', () => {
            const veganTag = DEFAULT_DIET_TAGS.find((t) => t.key === 'VEGAN')!;
            const result = inferForTag(
                {
                    id: 'tag-vegan',
                    key: 'VEGAN',
                    parentTagKey: veganTag.parentTagKey ?? null,
                    keywords: veganTag.keywordWhitelist.map((value) => ({value})),
                    dishes: veganTag.dishWhitelist.map((value) => ({value})),
                    allergenExclusions: veganTag.allergenExclusions.map((value) => ({value})),
                    negativeKeywords: veganTag.negativeKeywords.map((value) => ({value})),
                    strongSignals: veganTag.strongSignals.map((value) => ({value})),
                    contradictionPatterns: veganTag.contradictionPatterns.map((value) => ({value})),
                    qualifiedNegExceptions: veganTag.qualifiedNegExceptions.map((value) => ({value})),
                },
                [
                    {
                        id: 'item-1',
                        name: 'Halloumi Falafel Wrap',
                        description: 'Falafel wrap with salad and sauce',
                        dietContext: null,
                        allergens: null,
                    },
                ],
            );

            expect(result.score).toBe(0);
            expect(result.reasons.matchedItems).toHaveLength(0);
            expect(result.reasons.excludedItems).toHaveLength(1);
            expect(result.reasons.excludedItems?.[0].excludedBy.join(' ')).toContain('negative:halloumi');
        });

        test.each(heuristicCoverageCases)('$description', (testCase) => {
            const result = inferForTag(testCase.tag, testCase.items);

            expect(result.reasons.menuStats?.matchedUniqueItems).toBe(testCase.expected.matchedUniqueItems);
            expect(result.reasons.menuStats?.totalUniqueItems).toBe(testCase.expected.totalUniqueItems);

            if (testCase.expected.duplicateItemsFiltered !== undefined) {
                expect(result.reasons.menuStats?.duplicateItemsFiltered).toBe(testCase.expected.duplicateItemsFiltered);
            }
            if (testCase.expected.matchedDuplicateItemsFiltered !== undefined) {
                expect(result.reasons.menuStats?.matchedDuplicateItemsFiltered).toBe(testCase.expected.matchedDuplicateItemsFiltered);
            }
            if (testCase.expected.sharePercent !== undefined) {
                expect(Math.round(result.reasons.matchRatio * 100)).toBe(testCase.expected.sharePercent);
            }
            if (testCase.expected.score !== undefined) {
                expect(result.score).toBe(testCase.expected.score);
            }
            if (testCase.expected.confidence !== undefined) {
                expect(result.confidence).toBe(testCase.expected.confidence);
            }
            if (testCase.expected.varietyPercent !== undefined) {
                expect(Math.round((result.reasons.menuStats?.varietyRatio ?? 0) * 100)).toBe(testCase.expected.varietyPercent);
            }
            if ((testCase.expected as {dedupedMatchedNames?: string[]}).dedupedMatchedNames) {
                expect(result.reasons.matchedItems.map((item) => item.itemName)).toEqual(
                    (testCase.expected as {dedupedMatchedNames: string[]}).dedupedMatchedNames,
                );
            }
        });
    });
});
