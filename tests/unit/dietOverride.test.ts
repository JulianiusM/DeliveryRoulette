/**
 * Unit tests for DietOverrideService
 * Tests the effective suitability computation logic
 */

import {sampleDietTags, effectiveSuitabilityTestData} from '../data/unit/dietOverrideData';

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
            // Should still have inference data available
            expect(vegan!.inference).toBeDefined();
            expect(vegan!.inference!.score).toBe(80);
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
    });
});
