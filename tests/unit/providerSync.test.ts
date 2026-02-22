/**
 * Unit tests for ProviderSyncService
 * Tests the unified sync pipeline: listRestaurants → upsert → fetchMenu → sync.
 * All connectors (registry-based and directly provided) follow the same flow.
 */

import {ProviderKey} from '../../src/providers/ProviderKey';
import {
    sampleProviderMenu,
    emptyProviderMenu,
    importPayloadWithMenu,
    importPayloadNoMenu,
    importPayloadMultiple,
} from '../data/unit/providerSyncData';
import {stubConnector} from '../data/unit/connectorRegistryData';

// ── Mocks ───────────────────────────────────────────────────

const mockFindOneJob = jest.fn();
const mockCreateJob = jest.fn();
const mockSaveJob = jest.fn();
const mockFindOneRef = jest.fn();
const mockSaveRef = jest.fn();

jest.mock('../../src/modules/database/dataSource', () => ({
    AppDataSource: {
        getRepository: jest.fn((entity: any) => {
            const name = typeof entity === 'function' ? entity.name : entity;
            if (name === 'SyncJob') {
                return {
                    findOne: mockFindOneJob,
                    create: mockCreateJob.mockImplementation((data: any) => ({id: 'job-1', restaurantsSynced: 0, ...data})),
                    save: mockSaveJob.mockImplementation((e: any) => Promise.resolve(e)),
                };
            }
            if (name === 'RestaurantProviderRef') {
                return {
                    findOne: mockFindOneRef.mockResolvedValue(null),
                    save: mockSaveRef.mockImplementation((e: any) => Promise.resolve(e)),
                };
            }
            return {find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null)};
        }),
    },
}));

jest.mock('../../src/modules/database/services/RestaurantService');
import * as restaurantService from '../../src/modules/database/services/RestaurantService';
const mockUpsertFromProvider = restaurantService.upsertFromProvider as jest.Mock;

jest.mock('../../src/modules/database/services/MenuService');
import * as menuService from '../../src/modules/database/services/MenuService';
const mockUpsertCategories = menuService.upsertCategories as jest.Mock;
const mockUpsertItems = menuService.upsertItems as jest.Mock;

jest.mock('../../src/modules/database/services/RestaurantProviderRefService');
import * as providerRefService from '../../src/modules/database/services/RestaurantProviderRefService';
const mockEnsureProviderRef = providerRefService.ensureProviderRef as jest.Mock;

jest.mock('../../src/modules/database/services/DietInferenceService');
import * as dietInference from '../../src/modules/database/services/DietInferenceService';
const mockRecompute = dietInference.recomputeAfterMenuChange as jest.Mock;

jest.mock('../../src/providers/ConnectorRegistry');
import * as ConnectorRegistry from '../../src/providers/ConnectorRegistry';
const mockResolve = ConnectorRegistry.resolve as jest.Mock;
const mockRegisteredKeys = ConnectorRegistry.registeredKeys as jest.Mock;

import {runSync, isLocked} from '../../src/modules/sync/ProviderSyncService';
import {ImportConnector} from '../../src/providers/ImportConnector';
import type {SyncResult} from '../../src/modules/sync/ProviderSyncService';

describe('ProviderSyncService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFindOneJob.mockResolvedValue(null); // no running job by default
        mockRegisteredKeys.mockReturnValue([]);
    });

    describe('isLocked', () => {
        test('returns false when no in-progress job exists', async () => {
            mockFindOneJob.mockResolvedValue(null);
            expect(await isLocked()).toBe(false);
        });

        test('returns true when an in-progress job exists', async () => {
            mockFindOneJob.mockResolvedValue({id: 'j', status: 'in_progress'});
            expect(await isLocked()).toBe(true);
        });
    });

    describe('runSync – registry-resolved connector', () => {
        test('returns failed result when another sync is already running', async () => {
            mockFindOneJob.mockResolvedValue({id: 'running', status: 'in_progress'});

            const result = await runSync();

            expect(result.status).toBe('failed');
            expect(result.errorMessage).toMatch(/already in progress/);
        });

        test('completes with zero restaurants when no connectors registered', async () => {
            const result = await runSync();

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(0);
            expect(result.restaurants).toEqual([]);
        });

        test('syncs a single restaurant through the unified pipeline', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.listRestaurants as jest.Mock).mockResolvedValue([
                {externalId: 'ext-rest-1', name: 'Test Restaurant', url: 'https://example.com/1', address: '1 Main St', city: 'Berlin', postalCode: '10115'},
            ]);
            (connector.fetchMenu as jest.Mock).mockResolvedValue(sampleProviderMenu);
            mockResolve.mockReturnValue(connector);
            mockRegisteredKeys.mockReturnValue([ProviderKey.UBER_EATS]);

            mockUpsertFromProvider.mockResolvedValue('rest-1');
            mockEnsureProviderRef.mockResolvedValue(undefined);
            mockUpsertCategories.mockResolvedValue([
                {id: 'cat-1', name: 'Starters'},
                {id: 'cat-2', name: 'Mains'},
            ]);
            mockUpsertItems.mockResolvedValue([]);
            mockRecompute.mockResolvedValue([]);

            const result = await runSync({providerKey: ProviderKey.UBER_EATS});

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(1);
            expect(result.restaurants).toHaveLength(1);
            expect(result.restaurants[0].success).toBe(true);
            expect(connector.listRestaurants).toHaveBeenCalled();
            expect(mockUpsertFromProvider).toHaveBeenCalled();
            expect(mockEnsureProviderRef).toHaveBeenCalled();
            expect(connector.fetchMenu).toHaveBeenCalledWith('ext-rest-1');
            expect(mockUpsertCategories).toHaveBeenCalledWith('rest-1', expect.any(Array));
            expect(mockUpsertItems).toHaveBeenCalledTimes(2);
            expect(mockRecompute).toHaveBeenCalledWith('rest-1');
        });

        test('records failure when connector throws', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.listRestaurants as jest.Mock).mockRejectedValue(new Error('API down'));
            mockResolve.mockReturnValue(connector);

            const result = await runSync({providerKey: ProviderKey.UBER_EATS});

            expect(result.status).toBe('failed');
            expect(result.errorMessage).toBe('API down');
        });

        test('syncs with empty menu (no categories)', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.listRestaurants as jest.Mock).mockResolvedValue([
                {externalId: 'ext-1', name: 'Empty Menu Place', url: 'https://example.com/2'},
            ]);
            (connector.fetchMenu as jest.Mock).mockResolvedValue(emptyProviderMenu);
            mockResolve.mockReturnValue(connector);

            mockUpsertFromProvider.mockResolvedValue('rest-2');
            mockEnsureProviderRef.mockResolvedValue(undefined);
            mockUpsertCategories.mockResolvedValue([]);
            mockRecompute.mockResolvedValue([]);

            const result = await runSync({providerKey: ProviderKey.UBER_EATS});

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(1);
            expect(mockUpsertItems).not.toHaveBeenCalled();
        });
    });

    describe('runSync – directly provided connector (ImportConnector)', () => {
        beforeEach(() => {
            mockUpsertFromProvider.mockImplementation(async (data: any) =>
                `new-${data.name.toLowerCase().replace(/\s+/g, '-')}`,
            );
            mockEnsureProviderRef.mockResolvedValue(undefined);
            mockUpsertCategories.mockResolvedValue([]);
            mockRecompute.mockResolvedValue([]);
        });

        test('creates SyncJob with connector providerKey', async () => {
            const connector = new ImportConnector(importPayloadNoMenu);
            const result = await runSync({connector});

            expect(result.status).toBe('completed');
            expect(result.jobId).toBe('job-1');
            expect(mockCreateJob).toHaveBeenCalledWith(
                expect.objectContaining({providerKey: ProviderKey.IMPORT}),
            );
        });

        test('creates new restaurant and provider ref', async () => {
            const connector = new ImportConnector(importPayloadNoMenu);
            const result = await runSync({connector});

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(1);
            expect(result.restaurants).toHaveLength(1);
            expect(result.restaurants[0].success).toBe(true);
            expect(mockUpsertFromProvider).toHaveBeenCalledWith(
                expect.objectContaining({name: 'Simple Place'}),
            );
            expect(mockEnsureProviderRef).toHaveBeenCalledWith(
                expect.any(String),
                ProviderKey.IMPORT,
                'Simple Place',
                expect.stringContaining('import://'),
            );
        });

        test('processes menu through the connector fetchMenu pipeline', async () => {
            mockUpsertCategories.mockResolvedValue([{id: 'cat-1', name: 'Mains'}]);

            const connector = new ImportConnector(importPayloadWithMenu);
            const result = await runSync({connector});

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(1);
            expect(mockUpsertCategories).toHaveBeenCalled();
            expect(mockUpsertItems).toHaveBeenCalled();
            expect(mockRecompute).toHaveBeenCalled();
        });

        test('processes multiple restaurants', async () => {
            const connector = new ImportConnector(importPayloadMultiple);
            const result = await runSync({connector});

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(2);
            expect(result.restaurants).toHaveLength(2);
            expect(mockUpsertFromProvider).toHaveBeenCalledTimes(2);
        });

        test('does not duplicate provider ref when one already exists', async () => {
            // ensureProviderRef handles dedup internally; we verify it's called once per restaurant
            const connector = new ImportConnector(importPayloadNoMenu);
            await runSync({connector});

            expect(mockEnsureProviderRef).toHaveBeenCalledTimes(1);
        });

        test('per-restaurant failures do not block others', async () => {
            mockUpsertFromProvider
                .mockRejectedValueOnce(new Error('DB error'))
                .mockResolvedValueOnce('new-2');

            const connector = new ImportConnector(importPayloadMultiple);
            const result = await runSync({connector});

            expect(result.status).toBe('completed');
            expect(result.restaurants).toHaveLength(2);
            expect(result.restaurants[0].success).toBe(false);
            expect(result.restaurants[0].error).toBe('DB error');
            expect(result.restaurants[1].success).toBe(true);
            expect(result.restaurantsSynced).toBe(1);
        });

        test('concurrent imports use isolated instances', async () => {
            const connector1 = new ImportConnector(importPayloadNoMenu);
            const connector2 = new ImportConnector(importPayloadMultiple);

            const list1 = await connector1.listRestaurants('');
            const list2 = await connector2.listRestaurants('');
            expect(list1).toHaveLength(1);
            expect(list2).toHaveLength(2);
        });
    });
});
