/**
 * Test data for ProviderSyncService unit tests.
 */
import {ProviderMenu, ProviderRestaurantAvailability} from '../../../src/providers/ProviderTypes';

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

/** Menu payload with duplicate category names from mixed parser sources. */
export const duplicateCategoryProviderMenu: ProviderMenu = {
    categories: [
        {
            name: 'Burger',
            items: [],
        },
        {
            name: 'Burger',
            items: [
                {externalId: 'ext-b1', name: 'Classic Burger', description: 'Beef', price: 8.9, currency: 'EUR'},
            ],
        },
    ],
};

/** Import payload with menu for sync tests. */
export const importPayloadWithMenu = {
    version: 1 as const,
    restaurants: [
        {
            name: 'Import Place',
            addressLine1: '10 Import St',
            city: 'Berlin',
            postalCode: '10115',
            menuCategories: [
                {
                    name: 'Mains',
                    items: [
                        {name: 'Burger', price: 9.99, currency: 'EUR'},
                    ],
                },
            ],
        },
    ],
};

/** Import payload without menu. */
export const importPayloadNoMenu = {
    version: 1 as const,
    restaurants: [
        {
            name: 'Simple Place',
            addressLine1: '5 Simple St',
            city: 'Munich',
            postalCode: '80331',
        },
    ],
};

/** Import payload with two restaurants. */
export const importPayloadMultiple = {
    version: 1 as const,
    restaurants: [
        {
            name: 'First Place',
            addressLine1: '1 First St',
            city: 'Berlin',
            postalCode: '10115',
        },
        {
            name: 'Second Place',
            addressLine1: '2 Second St',
            city: 'Munich',
            postalCode: '80331',
        },
    ],
};

/** Dynamic provider availability payloads used by location-aware sync tests. */
export const sampleProviderAvailabilitySnapshots: ProviderRestaurantAvailability[] = [
    {
        providerRestaurantId: '1590874',
        providerNativeId: '1590874',
        serviceType: 'delivery',
        isAvailable: true,
        isTemporaryOffline: false,
        isThrottled: false,
        etaMin: 35,
        etaMax: 60,
        minOrderAmountMinor: 3000,
        currency: 'EUR',
        feeBands: [
            {
                minOrderAmountMinor: 3000,
                feeMinor: 150,
            },
        ],
        bagFeeMinor: null,
        serviceFeeMinor: null,
        smallOrderFeeMinor: null,
        observedAt: new Date('2026-03-01T15:42:25.146Z'),
    },
    {
        providerRestaurantId: '1590874',
        providerNativeId: '1590874',
        serviceType: 'collection',
        isAvailable: true,
        isTemporaryOffline: false,
        isThrottled: false,
        observedAt: new Date('2026-03-01T15:42:25.146Z'),
    },
];
