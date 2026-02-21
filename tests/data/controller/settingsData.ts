/**
 * Test data for settings controller tests
 */

const sampleDietTags = [
    {id: 'tag-1', key: 'VEGAN', label: 'Vegan'},
    {id: 'tag-2', key: 'VEGETARIAN', label: 'Vegetarian'},
    {id: 'tag-3', key: 'GLUTEN_FREE', label: 'Gluten-free'},
];

export const getSettingsData = [
    {
        description: 'returns empty defaults when no preferences exist',
        existingPref: null,
        allDietTags: sampleDietTags,
        userDietPrefs: [],
        expected: {
            deliveryArea: '',
            cuisineIncludes: '',
            cuisineExcludes: '',
            dietTags: [
                {id: 'tag-1', key: 'VEGAN', label: 'Vegan', selected: false},
                {id: 'tag-2', key: 'VEGETARIAN', label: 'Vegetarian', selected: false},
                {id: 'tag-3', key: 'GLUTEN_FREE', label: 'Gluten-free', selected: false},
            ],
        },
    },
    {
        description: 'returns stored preferences with selected diet tags',
        existingPref: {
            id: 1,
            userId: 1,
            deliveryArea: 'Downtown',
            cuisineIncludes: 'Italian, Japanese',
            cuisineExcludes: 'Fast Food',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        allDietTags: sampleDietTags,
        userDietPrefs: [
            {id: 'pref-1', userId: 1, dietTagId: 'tag-1', createdAt: new Date()},
            {id: 'pref-2', userId: 1, dietTagId: 'tag-3', createdAt: new Date()},
        ],
        expected: {
            deliveryArea: 'Downtown',
            cuisineIncludes: 'Italian, Japanese',
            cuisineExcludes: 'Fast Food',
            dietTags: [
                {id: 'tag-1', key: 'VEGAN', label: 'Vegan', selected: true},
                {id: 'tag-2', key: 'VEGETARIAN', label: 'Vegetarian', selected: false},
                {id: 'tag-3', key: 'GLUTEN_FREE', label: 'Gluten-free', selected: true},
            ],
        },
    },
    {
        description: 'returns empty string for null cuisine fields with no diet prefs',
        existingPref: {
            id: 2,
            userId: 1,
            deliveryArea: 'Midtown',
            cuisineIncludes: null,
            cuisineExcludes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        allDietTags: sampleDietTags,
        userDietPrefs: [],
        expected: {
            deliveryArea: 'Midtown',
            cuisineIncludes: '',
            cuisineExcludes: '',
            dietTags: [
                {id: 'tag-1', key: 'VEGAN', label: 'Vegan', selected: false},
                {id: 'tag-2', key: 'VEGETARIAN', label: 'Vegetarian', selected: false},
                {id: 'tag-3', key: 'GLUTEN_FREE', label: 'Gluten-free', selected: false},
            ],
        },
    },
];

export const saveSettingsValidData = [
    {
        description: 'saves all fields with diet tags',
        input: {
            deliveryArea: 'Downtown',
            cuisineIncludes: 'Italian, Japanese',
            cuisineExcludes: 'Fast Food',
            dietTagIds: ['tag-1', 'tag-2'],
        },
        expectedService: {
            deliveryArea: 'Downtown',
            cuisineIncludes: 'Italian, Japanese',
            cuisineExcludes: 'Fast Food',
        },
        expectedDietTagIds: ['tag-1', 'tag-2'],
    },
    {
        description: 'trims whitespace',
        input: {
            deliveryArea: '  Downtown  ',
            cuisineIncludes: '  Italian  ',
            cuisineExcludes: '  Sushi  ',
        },
        expectedService: {
            deliveryArea: 'Downtown',
            cuisineIncludes: 'Italian',
            cuisineExcludes: 'Sushi',
        },
        expectedDietTagIds: [],
    },
    {
        description: 'sets empty cuisine to null',
        input: {
            deliveryArea: 'Uptown',
            cuisineIncludes: '',
            cuisineExcludes: '',
            dietTagIds: ['tag-3'],
        },
        expectedService: {
            deliveryArea: 'Uptown',
            cuisineIncludes: null,
            cuisineExcludes: null,
        },
        expectedDietTagIds: ['tag-3'],
    },
    {
        description: 'handles missing fields gracefully',
        input: {},
        expectedService: {
            deliveryArea: '',
            cuisineIncludes: null,
            cuisineExcludes: null,
        },
        expectedDietTagIds: [],
    },
];

export const saveSettingsInvalidData = [
    {
        description: 'rejects delivery area exceeding 150 characters',
        input: {
            deliveryArea: 'A'.repeat(151),
            cuisineIncludes: '',
            cuisineExcludes: '',
        },
        expectedError: 'Delivery area must be 150 characters or less.',
    },
];
