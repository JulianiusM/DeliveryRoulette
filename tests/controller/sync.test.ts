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
const mockQueueSync = syncService.queueSync as jest.Mock;

// Import controller after mocking
import * as syncController from '../../src/controller/syncController';

describe('syncController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockQueueSync.mockResolvedValue({
            jobId: 'job-1',
            status: 'pending',
            providerKey: null,
            syncQuery: null,
            createdAt: new Date('2026-01-01T12:00:00Z'),
        });
    });

    describe('triggerSync – valid', () => {
        test.each(triggerSyncValidData)('$description', async ({providerKey, expectedQueueSyncArg}) => {
            if (providerKey) {
                mockResolve.mockReturnValue(stubConnector(providerKey as ProviderKey, 'Test'));
            }

            const result = await syncController.triggerSync(providerKey);

            expect(mockQueueSync).toHaveBeenCalledWith(expectedQueueSyncArg);
            expect(result.status).toBe('pending');
        });
    });

    describe('triggerSync – invalid key', () => {
        test.each(triggerSyncInvalidKeyData)('$description', async ({providerKey, expectedError}) => {
            await expect(syncController.triggerSync(providerKey)).rejects.toThrow(ExpectedError);
            await expect(syncController.triggerSync(providerKey)).rejects.toMatchObject({
                message: expectedError,
            });
            expect(mockQueueSync).not.toHaveBeenCalled();
        });
    });

    describe('triggerSync – unregistered connector', () => {
        test.each(triggerSyncUnregisteredData)('$description', async ({providerKey, expectedError}) => {
            mockResolve.mockReturnValue(undefined);

            await expect(syncController.triggerSync(providerKey)).rejects.toThrow(ExpectedError);
            await expect(syncController.triggerSync(providerKey)).rejects.toMatchObject({
                message: expectedError,
            });
            expect(mockQueueSync).not.toHaveBeenCalled();
        });
    });
});
