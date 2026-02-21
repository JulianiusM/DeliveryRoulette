/**
 * Test data for diet override controller tests
 */

export const addDietOverrideValidData = [
    {
        description: 'adds override with supported=true and notes',
        input: {
            dietTagId: 'tag-uuid',
            supported: 'true',
            notes: 'Verified by staff',
        },
        userId: 1,
        expected: {
            restaurantId: 'test-uuid',
            dietTagId: 'tag-uuid',
            supported: true,
            userId: 1,
            notes: 'Verified by staff',
        },
    },
    {
        description: 'adds override with supported=false',
        input: {
            dietTagId: 'tag-uuid',
            supported: 'false',
        },
        userId: 2,
        expected: {
            restaurantId: 'test-uuid',
            dietTagId: 'tag-uuid',
            supported: false,
            userId: 2,
            notes: null,
        },
    },
    {
        description: 'trims whitespace from inputs',
        input: {
            dietTagId: '  tag-uuid  ',
            supported: 'true',
            notes: '  Some notes  ',
        },
        userId: 1,
        expected: {
            restaurantId: 'test-uuid',
            dietTagId: 'tag-uuid',
            supported: true,
            userId: 1,
            notes: 'Some notes',
        },
    },
];

export const addDietOverrideInvalidData = [
    {
        description: 'rejects empty dietTagId',
        input: {
            dietTagId: '',
            supported: 'true',
        },
        expectedError: 'Diet tag is required.',
    },
    {
        description: 'rejects missing dietTagId',
        input: {
            supported: 'true',
        },
        expectedError: 'Diet tag is required.',
    },
    {
        description: 'rejects missing supported value',
        input: {
            dietTagId: 'tag-uuid',
        },
        expectedError: 'Supported value is required.',
    },
    {
        description: 'rejects empty supported value',
        input: {
            dietTagId: 'tag-uuid',
            supported: '',
        },
        expectedError: 'Supported value is required.',
    },
];
