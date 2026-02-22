/**
 * Controller tests for syncController
 * Tests validation and delegation to ProviderSyncService.
 */

import {
    triggerSyncValidData,
    triggerSyncInvalidKeyData,
    triggerSyncUnregisteredData,
} from '../data/controller/syncData';
import {ProviderKey} from '../../src/providers/ProviderKey';
import {ExpectedError} from '../../src/modules/lib/errors';
import {stubConnector} from '../data/unit/connectorRegistryData';

// Mock ConnectorRegistry
jest.mock('../../src/providers/ConnectorRegistry');
import * as ConnectorRegistry from '../../src/providers/ConnectorRegistry';
const mockResolve = ConnectorRegistry.resolve as jest.Mock;

// Mock ProviderSyncService
jest.mock('../../src/modules/sync/ProviderSyncService');
import * as syncService from '../../src/modules/sync/ProviderSyncService';
const mockRunSync = syncService.runSync as jest.Mock;

// Import controller after mocking
import * as syncController from '../../src/controller/syncController';

describe('syncController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRunSync.mockResolvedValue({
            jobId: 'job-1',
            status: 'completed',
            restaurantsSynced: 1,
            errorMessage: null,
        });
    });

    describe('triggerSync – valid', () => {
        test.each(triggerSyncValidData)('$description', async ({providerKey, expectedRunSyncArg}) => {
            if (providerKey) {
                mockResolve.mockReturnValue(stubConnector(providerKey as ProviderKey, 'Test'));
            }

            const result = await syncController.triggerSync(providerKey);

            expect(mockRunSync).toHaveBeenCalledWith(expectedRunSyncArg);
            expect(result.status).toBe('completed');
        });
    });

    describe('triggerSync – invalid key', () => {
        test.each(triggerSyncInvalidKeyData)('$description', async ({providerKey, expectedError}) => {
            await expect(syncController.triggerSync(providerKey)).rejects.toThrow(ExpectedError);
            await expect(syncController.triggerSync(providerKey)).rejects.toMatchObject({
                message: expectedError,
            });
            expect(mockRunSync).not.toHaveBeenCalled();
        });
    });

    describe('triggerSync – unregistered connector', () => {
        test.each(triggerSyncUnregisteredData)('$description', async ({providerKey, expectedError}) => {
            mockResolve.mockReturnValue(undefined);

            await expect(syncController.triggerSync(providerKey)).rejects.toThrow(ExpectedError);
            await expect(syncController.triggerSync(providerKey)).rejects.toMatchObject({
                message: expectedError,
            });
            expect(mockRunSync).not.toHaveBeenCalled();
        });
    });
});
