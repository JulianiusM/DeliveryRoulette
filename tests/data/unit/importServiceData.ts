/**
 * Test data for import service unit tests
 */

import {ImportPayload} from '../../../src/modules/import/importSchema';

/** A single new restaurant payload */
export const singleNewRestaurant: ImportPayload = {
    version: 1,
    restaurants: [
        {
            name: 'New Place',
            addressLine1: '1 New St',
            city: 'Newtown',
            postalCode: '11111',
        },
    ],
};

/** A restaurant that will match an existing one (by name) */
export const singleExistingRestaurant: ImportPayload = {
    version: 1,
    restaurants: [
        {
            name: 'Existing Place',
            addressLine1: '99 Updated Ave',
            city: 'Updated City',
            postalCode: '99999',
            country: 'Canada',
        },
    ],
};

/** A payload with menus and provider refs */
export const restaurantWithMenuAndRefs: ImportPayload = {
    version: 1,
    restaurants: [
        {
            name: 'Full Place',
            addressLine1: '1 Full St',
            city: 'Fulltown',
            postalCode: '22222',
            menuCategories: [
                {
                    name: 'Mains',
                    sortOrder: 1,
                    items: [
                        {name: 'Burger', price: 9.99, currency: 'USD'},
                        {name: 'Pizza', price: 12.99, currency: 'USD'},
                    ],
                },
            ],
            providerRefs: [
                {providerKey: 'ubereats', url: 'https://ubereats.com/full-place'},
            ],
            dietTags: ['VEGAN'],
        },
    ],
};

/** Multiple restaurants - one new, one existing */
export const mixedPayload: ImportPayload = {
    version: 1,
    restaurants: [
        {
            name: 'Existing Place',
            addressLine1: '99 Updated Ave',
            city: 'Updated City',
            postalCode: '99999',
        },
        {
            name: 'Brand New',
            addressLine1: '2 Brand St',
            city: 'Brandville',
            postalCode: '33333',
        },
    ],
};

/** Mock existing restaurant in DB */
export const existingDbRestaurant = {
    id: 'existing-uuid',
    name: 'Existing Place',
    addressLine1: '1 Old St',
    city: 'Oldtown',
    postalCode: '00000',
    country: '',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

/** Parse/validate test cases */
export const parseValidCases = [
    {
        description: 'validates correct payload',
        input: {version: 1, restaurants: [{name: 'A', addressLine1: '1 St', city: 'C', postalCode: '1'}]},
        expectValid: true,
    },
];

export const parseInvalidCases = [
    {
        description: 'rejects null input',
        input: null,
        expectValid: false,
    },
    {
        description: 'rejects missing version',
        input: {restaurants: [{name: 'A', addressLine1: '1 St', city: 'C', postalCode: '1'}]},
        expectValid: false,
    },
    {
        description: 'rejects empty restaurants array',
        input: {version: 1, restaurants: []},
        expectValid: false,
    },
];
