/**
 * Test data for ProviderSyncService unit tests.
 */
import {ProviderKey} from '../../../src/providers/ProviderKey';
import {ProviderMenu} from '../../../src/providers/ProviderTypes';

/** A minimal ProviderMenu used by sync tests. */
export const sampleProviderMenu: ProviderMenu = {
    categories: [
        {
            name: 'Starters',
            items: [
                {externalId: 'ext-1', name: 'Bruschetta', description: 'Toasted bread', price: 8.5, currency: 'USD'},
                {externalId: 'ext-2', name: 'Soup', description: null, price: 6.0, currency: 'USD'},
            ],
        },
        {
            name: 'Mains',
            items: [
                {externalId: 'ext-3', name: 'Pasta', description: 'Fresh pasta', price: 14.0, currency: 'USD'},
            ],
        },
    ],
};

/** An empty menu (no categories). */
export const emptyProviderMenu: ProviderMenu = {categories: []};

/** Provider ref fixtures. */
export const providerRefFixtures = {
    active: {
        id: 'ref-1',
        restaurantId: 'rest-1',
        providerKey: ProviderKey.UBER_EATS,
        externalId: 'ext-rest-1',
        url: 'https://example.com/rest-1',
        status: 'active',
        lastSyncAt: null,
    },
    noExternalId: {
        id: 'ref-2',
        restaurantId: 'rest-2',
        providerKey: ProviderKey.UBER_EATS,
        externalId: null,
        url: 'https://example.com/rest-2',
        status: 'active',
        lastSyncAt: null,
    },
};

/** Sync trigger test cases for the controller. */
export const triggerSyncValidData = [
    {
        description: 'triggers sync for all providers when no key given',
        providerKey: undefined,
    },
    {
        description: 'triggers sync for a specific provider',
        providerKey: ProviderKey.UBER_EATS,
    },
];

export const triggerSyncInvalidData = [
    {
        description: 'rejects unknown provider key',
        providerKey: 'unknown_provider',
        expectedError: 'Unknown provider key: unknown_provider',
    },
    {
        description: 'rejects valid enum but unregistered connector',
        providerKey: ProviderKey.DOORDASH,
        expectedError: `No connector registered for provider: ${ProviderKey.DOORDASH}`,
    },
];
