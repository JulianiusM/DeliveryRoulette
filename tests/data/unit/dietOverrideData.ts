/**
 * Test data for DietOverrideService effective suitability computation
 */

export const sampleDietTags = [
    {id: 'tag-vegan', key: 'VEGAN', label: 'Vegan', createdAt: new Date(), updatedAt: new Date()},
    {id: 'tag-vegetarian', key: 'VEGETARIAN', label: 'Vegetarian', createdAt: new Date(), updatedAt: new Date()},
    {id: 'tag-gf', key: 'GLUTEN_FREE', label: 'Gluten Free', createdAt: new Date(), updatedAt: new Date()},
];

export const effectiveSuitabilityTestData = [
    {
        description: 'override takes precedence over inference',
        overrides: [
            {
                id: 'ov-1',
                restaurantId: 'r-1',
                dietTagId: 'tag-vegan',
                supported: true,
                userId: 1,
                notes: 'Confirmed vegan options',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ],
        inferences: [
            {
                id: 'inf-1',
                restaurantId: 'r-1',
                dietTagId: 'tag-vegan',
                score: 10,
                confidence: 'LOW' as const,
                reasonsJson: '{}',
                engineVersion: '1.0.0',
                computedAt: new Date(),
            },
        ],
        expectedVegan: {
            supported: true,
            source: 'override',
        },
    },
    {
        description: 'inference used when no override exists',
        overrides: [],
        inferences: [
            {
                id: 'inf-1',
                restaurantId: 'r-1',
                dietTagId: 'tag-vegetarian',
                score: 45,
                confidence: 'HIGH' as const,
                reasonsJson: '{}',
                engineVersion: '1.0.0',
                computedAt: new Date(),
            },
        ],
        expectedVegetarian: {
            supported: true,
            source: 'inference',
        },
    },
    {
        description: 'returns no data when neither override nor inference exists',
        overrides: [],
        inferences: [],
        expectedVegan: {
            supported: null,
            source: 'none',
        },
    },
    {
        description: 'inference with score 0 results in supported=false',
        overrides: [],
        inferences: [
            {
                id: 'inf-1',
                restaurantId: 'r-1',
                dietTagId: 'tag-gf',
                score: 0,
                confidence: 'LOW' as const,
                reasonsJson: '{}',
                engineVersion: '1.0.0',
                computedAt: new Date(),
            },
        ],
        expectedGf: {
            supported: false,
            source: 'inference',
        },
    },
    {
        description: 'override supported=false overrides positive inference',
        overrides: [
            {
                id: 'ov-1',
                restaurantId: 'r-1',
                dietTagId: 'tag-vegan',
                supported: false,
                userId: 1,
                notes: 'Not actually vegan',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ],
        inferences: [
            {
                id: 'inf-1',
                restaurantId: 'r-1',
                dietTagId: 'tag-vegan',
                score: 80,
                confidence: 'HIGH' as const,
                reasonsJson: '{}',
                engineVersion: '1.0.0',
                computedAt: new Date(),
            },
        ],
        expectedVegan: {
            supported: false,
            source: 'override',
        },
    },
];
