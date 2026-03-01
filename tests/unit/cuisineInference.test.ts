import {
    inferCuisineProfile,
    getRestaurantCuisineTokens,
    matchesCuisineFilter,
    parseProviderCuisineList,
} from '../../src/modules/database/services/CuisineInferenceService';
import {
    cuisineInferenceCases,
    cuisineFilterCases,
} from '../data/unit/cuisineInferenceData';

describe('CuisineInferenceService', () => {
    test.each(cuisineInferenceCases)('$description', (testCase) => {
        const profile = inferCuisineProfile(testCase.input);
        const keys = profile.cuisines.map((entry) => entry.key);

        for (const expectedKey of testCase.expectedKeys) {
            expect(keys).toContain(expectedKey);
        }

        for (const expectedProviderKey of testCase.expectedProviderSources) {
            const found = profile.cuisines.find((entry) => entry.key === expectedProviderKey);
            expect(found).toBeDefined();
            expect(found!.source).toBe('provider');
            expect(found!.score).toBe(100);
            expect(found!.confidence).toBe('HIGH');
        }
    });

    test('parseProviderCuisineList parses and normalizes JSON arrays', () => {
        const parsed = parseProviderCuisineList('[" Indian ", "Japanese", "Indian"]');
        expect(parsed).toEqual(['Indian', 'Japanese']);
    });

    test.each(cuisineFilterCases)('$description', (testCase) => {
        const tokens = getRestaurantCuisineTokens({
            providerCuisinesJson: null,
            cuisineInferenceJson: JSON.stringify({
                engineVersion: '1.0.0',
                inferredAt: new Date().toISOString(),
                providerCuisines: [],
                cuisines: [
                    {key: 'INDIAN', label: 'Indian', score: 90, confidence: 'HIGH', source: 'heuristic'},
                ],
            }),
        } as any);

        expect(matchesCuisineFilter(tokens, testCase.query)).toBe(testCase.shouldMatch);
    });
});
