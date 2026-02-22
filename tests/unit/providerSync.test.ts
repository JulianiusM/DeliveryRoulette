/**
 * Unit tests for ProviderSyncService
 * Tests the sync pipeline: fetch → upsert → infer, plus locking.
 * Tests the import sync pipeline: runImportSync.
 */

import {ProviderKey} from '../../src/providers/ProviderKey';
import {
    sampleProviderMenu,
    emptyProviderMenu,
    providerRefFixtures,
    importPayloadWithMenu,
    importPayloadNoMenu,
    importPayloadMultiple,
} from '../data/unit/providerSyncData';
import {stubConnector} from '../data/unit/connectorRegistryData';

// ── Mocks ───────────────────────────────────────────────────

const mockFindOneJob = jest.fn();
const mockCreateJob = jest.fn();
const mockSaveJob = jest.fn();
const mockFindRefs = jest.fn();
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
                    find: mockFindRefs,
                    save: mockSaveRef.mockImplementation((e: any) => Promise.resolve(e)),
                };
            }
            return {find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null)};
        }),
    },
}));

jest.mock('../../src/modules/database/services/RestaurantService');
import * as restaurantService from '../../src/modules/database/services/RestaurantService';
const mockListRestaurants = restaurantService.listRestaurants as jest.Mock;
const mockCreateRestaurant = restaurantService.createRestaurant as jest.Mock;
const mockUpdateRestaurant = restaurantService.updateRestaurant as jest.Mock;

jest.mock('../../src/modules/database/services/MenuService');
import * as menuService from '../../src/modules/database/services/MenuService';
const mockUpsertCategories = menuService.upsertCategories as jest.Mock;
const mockUpsertItems = menuService.upsertItems as jest.Mock;

jest.mock('../../src/modules/database/services/RestaurantProviderRefService');
import * as providerRefService from '../../src/modules/database/services/RestaurantProviderRefService';
const mockListByRestaurant = providerRefService.listByRestaurant as jest.Mock;
const mockAddProviderRef = providerRefService.addProviderRef as jest.Mock;

jest.mock('../../src/modules/database/services/DietInferenceService');
import * as dietInference from '../../src/modules/database/services/DietInferenceService';
const mockRecompute = dietInference.recomputeAfterMenuChange as jest.Mock;

jest.mock('../../src/providers/ConnectorRegistry');
import * as ConnectorRegistry from '../../src/providers/ConnectorRegistry';
const mockResolve = ConnectorRegistry.resolve as jest.Mock;

import {runSync, runImportSync, isLocked} from '../../src/modules/sync/ProviderSyncService';

describe('ProviderSyncService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFindOneJob.mockResolvedValue(null); // no running job by default
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

    describe('runSync', () => {
        test('returns failed result when another sync is already running', async () => {
            mockFindOneJob.mockResolvedValue({id: 'running', status: 'in_progress'});

            const result = await runSync();

            expect(result.status).toBe('failed');
            expect(result.errorMessage).toMatch(/already in progress/);
        });

        test('completes successfully with no provider refs', async () => {
            mockFindRefs.mockResolvedValue([]);

            const result = await runSync();

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(0);
        });

        test('syncs a single restaurant via its connector', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.fetchMenu as jest.Mock).mockResolvedValue(sampleProviderMenu);
            mockResolve.mockReturnValue(connector);

            mockFindRefs.mockResolvedValue([providerRefFixtures.active]);
            mockUpsertCategories.mockResolvedValue([
                {id: 'cat-1', name: 'Starters'},
                {id: 'cat-2', name: 'Mains'},
            ]);
            mockUpsertItems.mockResolvedValue([]);
            mockRecompute.mockResolvedValue([]);

            const result = await runSync(ProviderKey.UBER_EATS);

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(1);
            expect(connector.fetchMenu).toHaveBeenCalledWith('ext-rest-1');
            expect(mockUpsertCategories).toHaveBeenCalledWith('rest-1', expect.any(Array));
            expect(mockUpsertItems).toHaveBeenCalledTimes(2); // one per category
            expect(mockRecompute).toHaveBeenCalledWith('rest-1');
        });

        test('skips refs with no externalId', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            mockResolve.mockReturnValue(connector);
            mockFindRefs.mockResolvedValue([providerRefFixtures.noExternalId]);

            const result = await runSync();

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(0);
            expect(connector.fetchMenu).not.toHaveBeenCalled();
        });

        test('skips refs whose connector is not registered', async () => {
            mockResolve.mockReturnValue(undefined);
            mockFindRefs.mockResolvedValue([providerRefFixtures.active]);

            const result = await runSync();

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(0);
        });

        test('records failure when connector throws', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.fetchMenu as jest.Mock).mockRejectedValue(new Error('API down'));
            mockResolve.mockReturnValue(connector);
            mockFindRefs.mockResolvedValue([providerRefFixtures.active]);

            const result = await runSync();

            expect(result.status).toBe('failed');
            expect(result.errorMessage).toBe('API down');
        });

        test('syncs with empty menu (no categories)', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.fetchMenu as jest.Mock).mockResolvedValue(emptyProviderMenu);
            mockResolve.mockReturnValue(connector);
            mockFindRefs.mockResolvedValue([providerRefFixtures.active]);
            mockUpsertCategories.mockResolvedValue([]);
            mockRecompute.mockResolvedValue([]);

            const result = await runSync(ProviderKey.UBER_EATS);

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(1);
            expect(mockUpsertItems).not.toHaveBeenCalled();
        });
    });

    describe('runImportSync', () => {
        beforeEach(() => {
            mockListRestaurants.mockResolvedValue([]);
            mockCreateRestaurant.mockImplementation(async (data: any) => ({
                id: `new-${data.name.toLowerCase().replace(/\s+/g, '-')}`,
                ...data,
            }));
            mockListByRestaurant.mockResolvedValue([]);
            mockAddProviderRef.mockResolvedValue({});
            mockUpsertCategories.mockResolvedValue([]);
            mockRecompute.mockResolvedValue([]);
        });

        test('creates SyncJob with IMPORT provider key', async () => {
            const result = await runImportSync(importPayloadNoMenu);

            expect(result.status).toBe('completed');
            expect(result.jobId).toBe('job-1');
            // Verify the job was created with IMPORT key
            expect(mockCreateJob).toHaveBeenCalledWith(
                expect.objectContaining({providerKey: ProviderKey.IMPORT}),
            );
        });

        test('creates new restaurant and IMPORT provider ref', async () => {
            const result = await runImportSync(importPayloadNoMenu);

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(1);
            expect(result.restaurants).toHaveLength(1);
            expect(result.restaurants[0].success).toBe(true);
            expect(mockCreateRestaurant).toHaveBeenCalledWith(
                expect.objectContaining({name: 'Simple Place'}),
            );
            expect(mockAddProviderRef).toHaveBeenCalledWith(
                expect.objectContaining({providerKey: ProviderKey.IMPORT}),
            );
        });

        test('updates existing restaurant instead of creating', async () => {
            mockListRestaurants.mockResolvedValue([
                {id: 'existing-id', name: 'Simple Place', addressLine1: '1 Old St', city: 'Berlin', postalCode: '10115'},
            ]);

            const result = await runImportSync(importPayloadNoMenu);

            expect(result.status).toBe('completed');
            expect(mockCreateRestaurant).not.toHaveBeenCalled();
            expect(mockUpdateRestaurant).toHaveBeenCalledWith('existing-id', expect.any(Object));
        });

        test('processes menu through the connector fetchMenu pipeline', async () => {
            mockUpsertCategories.mockResolvedValue([{id: 'cat-1', name: 'Mains'}]);

            const result = await runImportSync(importPayloadWithMenu);

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(1);
            // Menu was upserted via the unified pipeline (connector.fetchMenu → upsertCategories → upsertItems)
            expect(mockUpsertCategories).toHaveBeenCalled();
            expect(mockUpsertItems).toHaveBeenCalled();
            expect(mockRecompute).toHaveBeenCalled();
        });

        test('processes multiple restaurants', async () => {
            const result = await runImportSync(importPayloadMultiple);

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(2);
            expect(result.restaurants).toHaveLength(2);
            expect(result.restaurants.every((r) => r.success)).toBe(true);
            expect(mockCreateRestaurant).toHaveBeenCalledTimes(2);
        });

        test('does not skip when existing IMPORT ref already exists', async () => {
            mockListByRestaurant.mockResolvedValue([
                {providerKey: ProviderKey.IMPORT, externalId: 'Simple Place'},
            ]);

            const result = await runImportSync(importPayloadNoMenu);

            expect(result.status).toBe('completed');
            // Should not add a duplicate IMPORT ref
            expect(mockAddProviderRef).not.toHaveBeenCalledWith(
                expect.objectContaining({providerKey: ProviderKey.IMPORT}),
            );
        });

        test('per-restaurant failures do not block others', async () => {
            mockCreateRestaurant
                .mockRejectedValueOnce(new Error('DB error'))
                .mockImplementationOnce(async (data: any) => ({id: 'new-2', ...data}));

            const result = await runImportSync(importPayloadMultiple);

            expect(result.status).toBe('completed');
            expect(result.restaurants).toHaveLength(2);
            expect(result.restaurants[0].success).toBe(false);
            expect(result.restaurants[0].error).toBe('DB error');
            expect(result.restaurants[1].success).toBe(true);
            expect(result.restaurantsSynced).toBe(1);
        });

        test('clears ImportConnector payload after completion', async () => {
            // We can verify indirectly: after runImportSync, the connector
            // should return empty when queried
            const {ImportConnector} = await import('../../src/providers/ImportConnector');

            await runImportSync(importPayloadNoMenu);

            const restaurants = await ImportConnector.listRestaurants('');
            expect(restaurants).toEqual([]);
        });
    });
});
