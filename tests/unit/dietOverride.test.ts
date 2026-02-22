/**
 * Unit tests for DietOverrideService
 * Tests the effective suitability computation logic
 */

import {sampleDietTags, effectiveSuitabilityTestData, sampleReasonsJson, emptyReasonsJson} from '../data/unit/dietOverrideData';

// Mock the AppDataSource
jest.mock('../../src/modules/database/dataSource', () => ({
    AppDataSource: {
        getRepository: jest.fn(),
    },
}));

import {AppDataSource} from '../../src/modules/database/dataSource';
import * as dietOverrideService from '../../src/modules/database/services/DietOverrideService';

const mockGetRepository = AppDataSource.getRepository as jest.Mock;

function createMockRepo(data: any[]) {
    return {
        find: jest.fn().mockResolvedValue(data),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
    };
}

describe('DietOverrideService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('computeEffectiveSuitability', () => {
        test('override takes precedence over inference', async () => {
            const testCase = effectiveSuitabilityTestData[0];
            const tagRepo = createMockRepo(sampleDietTags);
            const overrideRepo = createMockRepo(testCase.overrides);
            const inferenceRepo = createMockRepo(testCase.inferences);

            mockGetRepository
                .mockReturnValueOnce(tagRepo)
                .mockReturnValueOnce(overrideRepo)
                .mockReturnValueOnce(inferenceRepo);

            const results = await dietOverrideService.computeEffectiveSuitability('r-1');

            const vegan = results.find(r => r.dietTagKey === 'VEGAN');
            expect(vegan).toBeDefined();
            expect(vegan!.supported).toBe(testCase.expectedVegan!.supported);
            expect(vegan!.source).toBe(testCase.expectedVegan!.source);
            expect(vegan!.override).toBeDefined();
            expect(vegan!.override!.notes).toBe('Confirmed vegan options');
            // Inference data should also be available alongside the override
            expect(vegan!.inference).toBeDefined();
            expect(vegan!.inference!.score).toBe(10);
            // Reasons should be parsed from reasonsJson
            expect(vegan!.inference!.reasons).toBeDefined();
            expect(vegan!.inference!.reasons!.matchedItems).toHaveLength(2);
            expect(vegan!.inference!.reasons!.matchedItems[0].itemName).toBe('Vegan Burger');
        });

        test('inference used when no override exists', async () => {
            const testCase = effectiveSuitabilityTestData[1];
            const tagRepo = createMockRepo(sampleDietTags);
            const overrideRepo = createMockRepo(testCase.overrides);
            const inferenceRepo = createMockRepo(testCase.inferences);

            mockGetRepository
                .mockReturnValueOnce(tagRepo)
                .mockReturnValueOnce(overrideRepo)
                .mockReturnValueOnce(inferenceRepo);

            const results = await dietOverrideService.computeEffectiveSuitability('r-1');

            const vegetarian = results.find(r => r.dietTagKey === 'VEGETARIAN');
            expect(vegetarian).toBeDefined();
            expect(vegetarian!.supported).toBe(testCase.expectedVegetarian!.supported);
            expect(vegetarian!.source).toBe(testCase.expectedVegetarian!.source);
            expect(vegetarian!.override).toBeUndefined();
            expect(vegetarian!.inference).toBeDefined();
            // Reasons should be parsed and available
            expect(vegetarian!.inference!.reasons).toBeDefined();
            expect(vegetarian!.inference!.reasons!.totalMenuItems).toBe(10);
        });

        test('returns no data when neither override nor inference exists', async () => {
            const testCase = effectiveSuitabilityTestData[2];
            const tagRepo = createMockRepo(sampleDietTags);
            const overrideRepo = createMockRepo(testCase.overrides);
            const inferenceRepo = createMockRepo(testCase.inferences);

            mockGetRepository
                .mockReturnValueOnce(tagRepo)
                .mockReturnValueOnce(overrideRepo)
                .mockReturnValueOnce(inferenceRepo);

            const results = await dietOverrideService.computeEffectiveSuitability('r-1');

            const vegan = results.find(r => r.dietTagKey === 'VEGAN');
            expect(vegan).toBeDefined();
            expect(vegan!.supported).toBeNull();
            expect(vegan!.source).toBe('none');
            expect(vegan!.override).toBeUndefined();
            expect(vegan!.inference).toBeUndefined();
        });

        test('inference with score 0 results in supported=false', async () => {
            const testCase = effectiveSuitabilityTestData[3];
            const tagRepo = createMockRepo(sampleDietTags);
            const overrideRepo = createMockRepo(testCase.overrides);
            const inferenceRepo = createMockRepo(testCase.inferences);

            mockGetRepository
                .mockReturnValueOnce(tagRepo)
                .mockReturnValueOnce(overrideRepo)
                .mockReturnValueOnce(inferenceRepo);

            const results = await dietOverrideService.computeEffectiveSuitability('r-1');

            const gf = results.find(r => r.dietTagKey === 'GLUTEN_FREE');
            expect(gf).toBeDefined();
            expect(gf!.supported).toBe(false);
            expect(gf!.source).toBe('inference');
            // Reasons should be parsed with empty matched items
            expect(gf!.inference!.reasons).toBeDefined();
            expect(gf!.inference!.reasons!.matchedItems).toHaveLength(0);
            expect(gf!.inference!.reasons!.totalMenuItems).toBe(5);
        });

        test('override supported=false overrides positive inference', async () => {
            const testCase = effectiveSuitabilityTestData[4];
            const tagRepo = createMockRepo(sampleDietTags);
            const overrideRepo = createMockRepo(testCase.overrides);
            const inferenceRepo = createMockRepo(testCase.inferences);

            mockGetRepository
                .mockReturnValueOnce(tagRepo)
                .mockReturnValueOnce(overrideRepo)
                .mockReturnValueOnce(inferenceRepo);

            const results = await dietOverrideService.computeEffectiveSuitability('r-1');

            const vegan = results.find(r => r.dietTagKey === 'VEGAN');
            expect(vegan).toBeDefined();
            expect(vegan!.supported).toBe(false);
            expect(vegan!.source).toBe('override');
            // Should still have inference data available with reasons
            expect(vegan!.inference).toBeDefined();
            expect(vegan!.inference!.score).toBe(80);
            expect(vegan!.inference!.reasons).toBeDefined();
            expect(vegan!.inference!.reasons!.matchedItems).toHaveLength(2);
        });

        test('multiple overrides and inferences coexist per restaurant', async () => {
            const testCase = effectiveSuitabilityTestData[5];
            const tagRepo = createMockRepo(sampleDietTags);
            const overrideRepo = createMockRepo(testCase.overrides);
            const inferenceRepo = createMockRepo(testCase.inferences);

            mockGetRepository
                .mockReturnValueOnce(tagRepo)
                .mockReturnValueOnce(overrideRepo)
                .mockReturnValueOnce(inferenceRepo);

            const results = await dietOverrideService.computeEffectiveSuitability('r-1');

            const vegan = results.find(r => r.dietTagKey === 'VEGAN');
            expect(vegan).toBeDefined();
            expect(vegan!.supported).toBe(testCase.expectedVegan!.supported);
            expect(vegan!.source).toBe(testCase.expectedVegan!.source);

            const vegetarian = results.find(r => r.dietTagKey === 'VEGETARIAN');
            expect(vegetarian).toBeDefined();
            expect(vegetarian!.supported).toBe(testCase.expectedVegetarian!.supported);
            expect(vegetarian!.source).toBe(testCase.expectedVegetarian!.source);

            const gf = results.find(r => r.dietTagKey === 'GLUTEN_FREE');
            expect(gf).toBeDefined();
            expect(gf!.supported).toBe(testCase.expectedGf!.supported);
            expect(gf!.source).toBe(testCase.expectedGf!.source);
        });

        test('inference with null reasonsJson still produces result', async () => {
            const testCase = effectiveSuitabilityTestData[6];
            const tagRepo = createMockRepo(sampleDietTags);
            const overrideRepo = createMockRepo(testCase.overrides);
            const inferenceRepo = createMockRepo(testCase.inferences);

            mockGetRepository
                .mockReturnValueOnce(tagRepo)
                .mockReturnValueOnce(overrideRepo)
                .mockReturnValueOnce(inferenceRepo);

            const results = await dietOverrideService.computeEffectiveSuitability('r-1');

            const vegan = results.find(r => r.dietTagKey === 'VEGAN');
            expect(vegan).toBeDefined();
            expect(vegan!.supported).toBe(true);
            expect(vegan!.source).toBe('inference');
            expect(vegan!.inference).toBeDefined();
            expect(vegan!.inference!.score).toBe(30);
            expect(vegan!.inference!.reasons).toBeUndefined();
        });

        test('returns results for all diet tags', async () => {
            const tagRepo = createMockRepo(sampleDietTags);
            const overrideRepo = createMockRepo([]);
            const inferenceRepo = createMockRepo([]);

            mockGetRepository
                .mockReturnValueOnce(tagRepo)
                .mockReturnValueOnce(overrideRepo)
                .mockReturnValueOnce(inferenceRepo);

            const results = await dietOverrideService.computeEffectiveSuitability('r-1');

            expect(results).toHaveLength(3);
            expect(results.map(r => r.dietTagKey)).toEqual(['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE']);
        });

        test('handles malformed reasonsJson gracefully', async () => {
            const tagRepo = createMockRepo(sampleDietTags);
            const overrideRepo = createMockRepo([]);
            const inferenceRepo = createMockRepo([
                {
                    id: 'inf-1',
                    restaurantId: 'r-1',
                    dietTagId: 'tag-vegan',
                    score: 25,
                    confidence: 'MEDIUM' as const,
                    reasonsJson: 'invalid json{{{',
                    engineVersion: '1.0.0',
                    computedAt: new Date(),
                },
            ]);

            mockGetRepository
                .mockReturnValueOnce(tagRepo)
                .mockReturnValueOnce(overrideRepo)
                .mockReturnValueOnce(inferenceRepo);

            const results = await dietOverrideService.computeEffectiveSuitability('r-1');

            const vegan = results.find(r => r.dietTagKey === 'VEGAN');
            expect(vegan).toBeDefined();
            expect(vegan!.inference).toBeDefined();
            expect(vegan!.inference!.score).toBe(25);
            expect(vegan!.inference!.reasons).toBeUndefined();
        });
    });
});
