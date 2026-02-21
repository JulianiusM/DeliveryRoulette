/**
 * Test data for suggestion controller tests
 */

export const sampleDietTags = [
    {id: 'tag-vegan', key: 'VEGAN', label: 'Vegan'},
    {id: 'tag-vegetarian', key: 'VEGETARIAN', label: 'Vegetarian'},
    {id: 'tag-gf', key: 'GLUTEN_FREE', label: 'Gluten Free'},
];

export const sampleRestaurant = {
    id: 'rest-1',
    name: 'Pizza Palace',
    addressLine1: '123 Main St',
    addressLine2: null,
    city: 'Springfield',
    postalCode: '12345',
    country: 'USA',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

export const processSuggestionValidData = [
    {
        description: 'suggestion with no filters returns result',
        input: {},
        suggestResult: {
            restaurant: sampleRestaurant,
            reason: {matchedDiets: [], totalCandidates: 3},
        },
        expectedRestaurantName: 'Pizza Palace',
    },
    {
        description: 'suggestion with diet filters returns result with diet matches',
        input: {
            dietTagIds: ['tag-vegan'],
        },
        suggestResult: {
            restaurant: sampleRestaurant,
            reason: {
                matchedDiets: [{
                    dietTagId: 'tag-vegan',
                    dietTagKey: 'VEGAN',
                    dietTagLabel: 'Vegan',
                    supported: true,
                    source: 'override' as const,
                }],
                totalCandidates: 1,
            },
        },
        expectedRestaurantName: 'Pizza Palace',
    },
    {
        description: 'suggestion with cuisine filters returns result',
        input: {
            cuisineIncludes: 'Pizza, Italian',
            cuisineExcludes: 'Burger',
        },
        suggestResult: {
            restaurant: sampleRestaurant,
            reason: {matchedDiets: [], totalCandidates: 2},
        },
        expectedRestaurantName: 'Pizza Palace',
    },
    {
        description: 'suggestion with single diet tag string normalizes to array',
        input: {
            dietTagIds: 'tag-vegan',
        },
        suggestResult: {
            restaurant: sampleRestaurant,
            reason: {
                matchedDiets: [{
                    dietTagId: 'tag-vegan',
                    dietTagKey: 'VEGAN',
                    dietTagLabel: 'Vegan',
                    supported: true,
                    source: 'inference' as const,
                }],
                totalCandidates: 1,
            },
        },
        expectedRestaurantName: 'Pizza Palace',
    },
];

export const processSuggestionNoMatchData = [
    {
        description: 'throws when no restaurants match filters',
        input: {
            dietTagIds: ['tag-vegan'],
            cuisineIncludes: 'NonExistent',
        },
    },
];

export const formDataDefaults = {
    description: 'returns form data with diet tags pre-populated from user preferences',
    userId: 1,
    expectedDietTagCount: 3,
    expectedSelectedCount: 2,
};
