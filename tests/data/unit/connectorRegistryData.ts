/**
 * Test data for ConnectorRegistry unit tests.
 */
import {ProviderKey} from '../../../src/providers/ProviderKey';
import {ConnectorCapabilities, DeliveryProviderConnector} from '../../../src/providers/DeliveryProviderConnector';
import {ProviderMenu, ProviderRestaurant, RateLimitPolicy} from '../../../src/providers/ProviderTypes';

/** Helper: build a minimal stub connector for a given key. */
export function stubConnector(key: ProviderKey, displayName: string): DeliveryProviderConnector {
    return {
        providerKey: key,
        displayName,
        listRestaurants: jest.fn<Promise<ProviderRestaurant[]>, [string]>()
            .mockResolvedValue([]),
        fetchMenu: jest.fn<Promise<ProviderMenu>, [string]>()
            .mockResolvedValue({categories: []}),
        rateLimitPolicy: jest.fn<RateLimitPolicy, []>()
            .mockReturnValue({maxRequests: 60, windowMs: 60_000}),
        capabilities: jest.fn<ConnectorCapabilities, []>()
            .mockReturnValue({canDiscoverFromListingUrl: false, canImportFromUrl: false}),
    };
}

export const registerData = [
    {
        description: 'registers and resolves a single connector',
        key: ProviderKey.UBER_EATS,
        displayName: 'Uber Eats',
    },
    {
        description: 'registers and resolves a different connector',
        key: ProviderKey.DOORDASH,
        displayName: 'DoorDash',
    },
];

export const unknownKeyData = [
    {
        description: 'returns undefined for unregistered key GRUBHUB',
        key: ProviderKey.GRUBHUB,
    },
    {
        description: 'returns undefined for unregistered key JUST_EAT',
        key: ProviderKey.JUST_EAT,
    },
];
