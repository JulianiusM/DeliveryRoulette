/**
 * Test data for DietOverrideService effective suitability computation
 */

/** Sample reasons JSON representing a typical heuristic result with two matched menu items. */
export const sampleReasonsJson = JSON.stringify({
    matchedItems: [
        {itemId: 'item-1', itemName: 'Vegan Burger', keywords: ['vegan']},
        {itemId: 'item-2', itemName: 'Tofu Stir Fry', keywords: ['tofu']},
    ],
    totalMenuItems: 10,
    matchRatio: 0.2,
});

/** Reasons JSON with no matched items — used to test zero-score inference scenarios. */
export const emptyReasonsJson = JSON.stringify({
    matchedItems: [],
    totalMenuItems: 5,
    matchRatio: 0,
});

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
                reasonsJson: sampleReasonsJson,
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
                reasonsJson: sampleReasonsJson,
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
                reasonsJson: emptyReasonsJson,
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
                reasonsJson: sampleReasonsJson,
                engineVersion: '1.0.0',
                computedAt: new Date(),
            },
        ],
        expectedVegan: {
            supported: false,
            source: 'override',
        },
    },
    {
        description: 'multiple overrides and inferences coexist per restaurant',
        overrides: [
            {
                id: 'ov-1',
                restaurantId: 'r-1',
                dietTagId: 'tag-vegan',
                supported: true,
                userId: 1,
                notes: 'Confirmed',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'ov-2',
                restaurantId: 'r-1',
                dietTagId: 'tag-vegetarian',
                supported: false,
                userId: 2,
                notes: 'Not vegetarian',
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
                reasonsJson: sampleReasonsJson,
                engineVersion: '1.0.0',
                computedAt: new Date(),
            },
            {
                id: 'inf-2',
                restaurantId: 'r-1',
                dietTagId: 'tag-gf',
                score: 50,
                confidence: 'HIGH' as const,
                reasonsJson: sampleReasonsJson,
                engineVersion: '1.0.0',
                computedAt: new Date(),
            },
        ],
        expectedVegan: {
            supported: true,
            source: 'override',
        },
        expectedVegetarian: {
            supported: false,
            source: 'override',
        },
        expectedGf: {
            supported: true,
            source: 'inference',
        },
    },
    {
        description: 'inference with null reasonsJson still produces result',
        overrides: [],
        inferences: [
            {
                id: 'inf-1',
                restaurantId: 'r-1',
                dietTagId: 'tag-vegan',
                score: 30,
                confidence: 'MEDIUM' as const,
                reasonsJson: null,
                engineVersion: '1.0.0',
                computedAt: new Date(),
            },
        ],
        expectedVegan: {
            supported: true,
            source: 'inference',
        },
    },
];
