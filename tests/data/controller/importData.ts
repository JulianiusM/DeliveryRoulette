/**
 * Test data for import controller tests
 */

/** A valid minimal import payload */
export const validPayloadJson = JSON.stringify({
    version: 1,
    restaurants: [
        {
            name: 'Test Restaurant',
            addressLine1: '123 Main St',
            city: 'Springfield',
            postalCode: '12345',
        },
    ],
});

/** A payload with full fields */
export const fullPayloadJson = JSON.stringify({
    version: 1,
    restaurants: [
        {
            name: 'Full Restaurant',
            addressLine1: '456 Oak Ave',
            addressLine2: 'Suite 2',
            city: 'Shelbyville',
            postalCode: '67890',
            country: 'USA',
            menuCategories: [
                {
                    name: 'Starters',
                    sortOrder: 0,
                    items: [
                        {name: 'Soup', description: 'Hot soup', price: 5.99, currency: 'USD'},
                    ],
                },
            ],
            providerRefs: [
                {providerKey: 'deliveroo', url: 'https://deliveroo.com/test'},
            ],
            dietTags: ['VEGAN'],
        },
    ],
});

/** Invalid JSON string */
export const invalidJsonString = 'not valid json {{{';

/** Valid JSON but fails schema validation (missing version) */
export const invalidSchemaJson = JSON.stringify({
    restaurants: [{name: 'Test', addressLine1: '1 St', city: 'C', postalCode: '1'}],
});

/** Empty string */
export const emptyPayload = '';

export const uploadValidCases = [
    {
        description: 'handles valid minimal import',
        fileContent: validPayloadJson,
    },
    {
        description: 'handles valid full import',
        fileContent: fullPayloadJson,
    },
];

export const uploadInvalidCases = [
    {
        description: 'rejects invalid JSON',
        fileContent: invalidJsonString,
        expectedError: 'Invalid JSON',
    },
    {
        description: 'rejects schema validation failure',
        fileContent: invalidSchemaJson,
        expectedError: 'Validation failed',
    },
];

export const applyInvalidCases = [
    {
        description: 'rejects empty payload',
        payloadJson: '',
        expectedError: 'Missing import payload',
    },
    {
        description: 'rejects invalid JSON payload',
        payloadJson: '{not valid',
        expectedError: 'Invalid import payload',
    },
    {
        description: 'rejects payload that fails re-validation',
        payloadJson: JSON.stringify({restaurants: []}),
        expectedError: 'no longer valid',
    },
];
