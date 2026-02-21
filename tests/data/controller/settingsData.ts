/**
 * Test data for settings controller tests
 */

export const getSettingsData = [
    {
        description: 'returns empty defaults when no preferences exist',
        existingPref: null,
        expected: {
            deliveryArea: '',
            cuisineIncludes: '',
            cuisineExcludes: '',
        },
    },
    {
        description: 'returns stored preferences',
        existingPref: {
            id: 1,
            userId: 1,
            deliveryArea: 'Downtown',
            cuisineIncludes: 'Italian, Japanese',
            cuisineExcludes: 'Fast Food',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        expected: {
            deliveryArea: 'Downtown',
            cuisineIncludes: 'Italian, Japanese',
            cuisineExcludes: 'Fast Food',
        },
    },
    {
        description: 'returns empty string for null cuisine fields',
        existingPref: {
            id: 2,
            userId: 1,
            deliveryArea: 'Midtown',
            cuisineIncludes: null,
            cuisineExcludes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        expected: {
            deliveryArea: 'Midtown',
            cuisineIncludes: '',
            cuisineExcludes: '',
        },
    },
];

export const saveSettingsValidData = [
    {
        description: 'saves all fields',
        input: {
            deliveryArea: 'Downtown',
            cuisineIncludes: 'Italian, Japanese',
            cuisineExcludes: 'Fast Food',
        },
        expectedService: {
            deliveryArea: 'Downtown',
            cuisineIncludes: 'Italian, Japanese',
            cuisineExcludes: 'Fast Food',
        },
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
    },
    {
        description: 'sets empty cuisine to null',
        input: {
            deliveryArea: 'Uptown',
            cuisineIncludes: '',
            cuisineExcludes: '',
        },
        expectedService: {
            deliveryArea: 'Uptown',
            cuisineIncludes: null,
            cuisineExcludes: null,
        },
    },
    {
        description: 'handles missing fields gracefully',
        input: {},
        expectedService: {
            deliveryArea: '',
            cuisineIncludes: null,
            cuisineExcludes: null,
        },
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
