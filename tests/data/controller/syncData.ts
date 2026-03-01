/**
 * Test data for sync controller tests
 */
import {ProviderKey} from '../../../src/providers/ProviderKey';

export const triggerSyncValidData = [
    {
        description: 'triggers sync for all providers when no key given',
        providerKey: undefined,
        expectedQueueSyncArg: {providerKey: undefined},
    },
    {
        description: 'triggers sync for a specific provider',
        providerKey: ProviderKey.UBER_EATS,
        expectedQueueSyncArg: {providerKey: ProviderKey.UBER_EATS},
    },
];

export const triggerSyncInvalidKeyData = [
    {
        description: 'rejects unknown provider key',
        providerKey: 'unknown_provider',
        expectedError: 'Unknown provider key: unknown_provider',
    },
];

export const triggerSyncUnregisteredData = [
    {
        description: 'rejects valid enum but unregistered connector',
        providerKey: ProviderKey.DOORDASH,
        expectedError: `No connector registered for provider: ${ProviderKey.DOORDASH}`,
    },
];
