/**
 * Test data for restaurant provider reference controller tests
 */

export const addProviderRefValidData = [
    {
        description: 'adds provider ref with all fields',
        input: {
            providerKey: 'uber_eats',
            externalId: 'ext-123',
            url: 'https://ubereats.com/store/123',
        },
        expected: {
            providerKey: 'uber_eats',
            externalId: 'ext-123',
            url: 'https://ubereats.com/store/123',
        },
    },
    {
        description: 'adds provider ref without externalId',
        input: {
            providerKey: 'doordash',
            url: 'https://doordash.com/store/456',
        },
        expected: {
            providerKey: 'doordash',
            externalId: null,
            url: 'https://doordash.com/store/456',
        },
    },
    {
        description: 'trims whitespace from inputs',
        input: {
            providerKey: '  grubhub  ',
            externalId: '  ext-789  ',
            url: '  https://grubhub.com/store/789  ',
        },
        expected: {
            providerKey: 'grubhub',
            externalId: 'ext-789',
            url: 'https://grubhub.com/store/789',
        },
    },
    {
        description: 'sets externalId to null for empty string',
        input: {
            providerKey: 'just_eat',
            externalId: '',
            url: 'https://just-eat.com/store/321',
        },
        expected: {
            providerKey: 'just_eat',
            externalId: null,
            url: 'https://just-eat.com/store/321',
        },
    },
];

export const addProviderRefInvalidData = [
    {
        description: 'rejects empty providerKey',
        input: {
            providerKey: '',
            url: 'https://example.com',
        },
        expectedError: 'Provider key is required.',
    },
    {
        description: 'rejects missing providerKey',
        input: {
            url: 'https://example.com',
        },
        expectedError: 'Provider key is required.',
    },
    {
        description: 'rejects empty url',
        input: {
            providerKey: 'uber_eats',
            url: '',
        },
        expectedError: 'URL is required.',
    },
    {
        description: 'rejects missing url',
        input: {
            providerKey: 'uber_eats',
        },
        expectedError: 'URL is required.',
    },
];
