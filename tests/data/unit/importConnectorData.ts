/**
 * Test data for ImportConnector unit tests.
 */

import {ImportPayload} from '../../../src/modules/import/importSchema';

/** Expected display name for the import connector. */
export const expectedDisplayName = "Import";

/** Expected provider key value. */
export const expectedProviderKey = "import";

/** Sample import payload for testing constructor / listRestaurants / fetchMenu. */
export const samplePayload: ImportPayload = {
    version: 1,
    restaurants: [
        {
            name: 'Pizza Palace',
            addressLine1: '1 Main St',
            city: 'Berlin',
            postalCode: '10115',
            country: 'Germany',
            menuCategories: [
                {
                    name: 'Mains',
                    items: [
                        {name: 'Margherita', description: 'Classic pizza', price: 9.99, currency: 'EUR'},
                        {name: 'Pepperoni', price: 11.99, currency: 'EUR'},
                    ],
                },
            ],
            providerRefs: [
                {providerKey: 'ubereats', url: 'https://ubereats.com/pizza-palace'},
            ],
        },
        {
            name: 'Burger Barn',
            addressLine1: '2 Side St',
            addressLine2: 'Floor 2',
            city: 'Munich',
            postalCode: '80331',
        },
    ],
};

/** Data for listRestaurants tests after payload is loaded. */
export const listRestaurantsExpected = [
    {description: 'returns Pizza Palace', name: 'Pizza Palace', address: '1 Main St', city: 'Berlin'},
    {description: 'returns Burger Barn', name: 'Burger Barn', address: '2 Side St', city: 'Munich'},
];

/** Data for fetchMenu tests. */
export const fetchMenuCases = [
    {
        description: 'returns menu for restaurant with categories',
        externalId: 'Pizza Palace',
        expectedCategoryCount: 1,
        expectedItemCount: 2,
    },
    {
        description: 'returns empty menu for restaurant without categories',
        externalId: 'Burger Barn',
        expectedCategoryCount: 0,
        expectedItemCount: 0,
    },
    {
        description: 'returns empty menu for unknown restaurant',
        externalId: 'Unknown Place',
        expectedCategoryCount: 0,
        expectedItemCount: 0,
    },
];

/** Empty payload for edge-case tests. */
export const emptyPayload: ImportPayload = {
    version: 1,
    restaurants: [],
};
