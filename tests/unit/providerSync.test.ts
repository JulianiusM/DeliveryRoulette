/**
 * Unit tests for ProviderSyncService
 * Tests the unified sync pipeline, stale-restaurant detection,
 * and diet-override-stale alerting.
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
const mockFindRef = jest.fn();
const mockSaveRef = jest.fn();
const mockFindOverrides = jest.fn();

jest.mock('../../src/modules/database/dataSource', () => ({
    AppDataSource: {
        getRepository: jest.fn((entity: any) => {
            const name = typeof entity === 'function' ? entity.name : entity;
            if (name === 'SyncJob') {
                return {findOne: mockFindOneJob, create: mockCreateJob, save: mockSaveJob};
            }
            if (name === 'RestaurantProviderRef') {
                return {findOne: mockFindOneRef, find: mockFindRef, save: mockSaveRef};
            }
            if (name === 'DietManualOverride') {
                return {find: mockFindOverrides};
            }
            return {find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null)};
        }),
    },
}));

jest.mock('../../src/modules/database/services/RestaurantService');
import * as restaurantService from '../../src/modules/database/services/RestaurantService';
const mockUpsertFromProvider = restaurantService.upsertFromProvider as jest.Mock;
const mockGetRestaurantById = restaurantService.getRestaurantById as jest.Mock;

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
const mockGetResults = dietInference.getResultsByRestaurant as jest.Mock;

jest.mock('../../src/modules/database/services/SyncAlertService');
import * as syncAlertService from '../../src/modules/database/services/SyncAlertService';
const mockCreateAlert = syncAlertService.createAlert as jest.Mock;
const mockHasActiveAlert = syncAlertService.hasActiveAlert as jest.Mock;

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
        // Defaults for repo mocks
        mockFindOneJob.mockResolvedValue(null);
        mockCreateJob.mockImplementation((data: any) => ({id: 'job-1', restaurantsSynced: 0, ...data}));
        mockSaveJob.mockImplementation((e: any) => Promise.resolve(e));
        mockFindOneRef.mockResolvedValue(null);
        mockFindRef.mockResolvedValue([]);
        mockSaveRef.mockImplementation((e: any) => Promise.resolve(e));
        mockFindOverrides.mockResolvedValue([]);
        // Defaults for service mocks
        mockRegisteredKeys.mockReturnValue([]);
        mockGetResults.mockResolvedValue([]);
        mockHasActiveAlert.mockResolvedValue(false);
        mockCreateAlert.mockResolvedValue({id: 'alert-1'});
        mockGetRestaurantById.mockResolvedValue(null);
    });

    describe('isLocked', () => {
        test('returns false when no in-progress job exists', async () => {
            expect(await isLocked()).toBe(false);
        });

        test('returns true when an in-progress job exists', async () => {
            mockFindOneJob.mockResolvedValue({id: 'j', status: 'in_progress'});
            expect(await isLocked()).toBe(true);
        });
    });

    describe('runSync - registry-resolved connector', () => {
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
            mockUpsertCategories.mockResolvedValue([{id: 'cat-1', name: 'Starters'}, {id: 'cat-2', name: 'Mains'}]);
            mockUpsertItems.mockResolvedValue([]);
            mockRecompute.mockResolvedValue([]);

            const result = await runSync({providerKey: ProviderKey.UBER_EATS});

            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(1);
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

        test('isolates per-restaurant failure when fetchMenu throws', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.listRestaurants as jest.Mock).mockResolvedValue([
                {externalId: 'ext-1', name: 'Good Place', url: 'https://example.com/1'},
                {externalId: 'ext-2', name: 'Bad Place', url: 'https://example.com/2'},
            ]);
            (connector.fetchMenu as jest.Mock)
                .mockResolvedValueOnce(sampleProviderMenu)
                .mockRejectedValueOnce(new Error('Menu fetch failed'));
            mockResolve.mockReturnValue(connector);
            mockUpsertFromProvider.mockResolvedValue('rest-1');
            mockEnsureProviderRef.mockResolvedValue(undefined);
            mockUpsertCategories.mockResolvedValue([{id: 'cat-1', name: 'Starters'}, {id: 'cat-2', name: 'Mains'}]);
            mockUpsertItems.mockResolvedValue([]);
            mockRecompute.mockResolvedValue([]);
            const result = await runSync({providerKey: ProviderKey.UBER_EATS});
            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(1);
            expect(result.restaurants).toHaveLength(2);
            expect(result.restaurants[0].success).toBe(true);
            expect(result.restaurants[1].success).toBe(false);
            expect(result.restaurants[1].error).toBe('Menu fetch failed');
        });
    });

    describe('runSync - directly provided connector (ImportConnector)', () => {
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
            expect(mockCreateJob).toHaveBeenCalledWith(expect.objectContaining({providerKey: ProviderKey.IMPORT}));
        });

        test('creates new restaurant and provider ref', async () => {
            const connector = new ImportConnector(importPayloadNoMenu);
            const result = await runSync({connector});
            expect(result.status).toBe('completed');
            expect(result.restaurantsSynced).toBe(1);
            expect(result.restaurants[0].success).toBe(true);
            expect(mockUpsertFromProvider).toHaveBeenCalledWith(expect.objectContaining({name: 'Simple Place'}));
            expect(mockEnsureProviderRef).toHaveBeenCalledWith(
                expect.any(String), ProviderKey.IMPORT, 'Simple Place', expect.stringContaining('import://'),
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

    describe('stale restaurant detection', () => {
        test('marks ref as stale and creates alert when restaurant not returned', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.listRestaurants as jest.Mock).mockResolvedValue([]);
            mockResolve.mockReturnValue(connector);
            mockRegisteredKeys.mockReturnValue([ProviderKey.UBER_EATS]);
            mockFindRef.mockResolvedValue([
                {restaurantId: 'rest-gone', providerKey: ProviderKey.UBER_EATS, status: 'active', updatedAt: new Date()},
            ]);
            mockGetRestaurantById.mockResolvedValue({id: 'rest-gone', name: 'Gone Place'});

            const result = await runSync({providerKey: ProviderKey.UBER_EATS});

            expect(result.status).toBe('completed');
            expect(mockSaveRef).toHaveBeenCalledWith(expect.objectContaining({restaurantId: 'rest-gone', status: 'stale'}));
            expect(mockCreateAlert).toHaveBeenCalledWith(expect.objectContaining({
                restaurantId: 'rest-gone', providerKey: ProviderKey.UBER_EATS, type: 'restaurant_gone',
            }));
        });

        test('does not duplicate restaurant_gone alert if one already exists', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.listRestaurants as jest.Mock).mockResolvedValue([]);
            mockResolve.mockReturnValue(connector);
            mockRegisteredKeys.mockReturnValue([ProviderKey.UBER_EATS]);
            mockFindRef.mockResolvedValue([
                {restaurantId: 'rest-gone', providerKey: ProviderKey.UBER_EATS, status: 'active', updatedAt: new Date()},
            ]);
            mockHasActiveAlert.mockResolvedValue(true);

            await runSync({providerKey: ProviderKey.UBER_EATS});

            expect(mockCreateAlert).not.toHaveBeenCalled();
        });

        test('does not alert for restaurants that were returned by the connector', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.listRestaurants as jest.Mock).mockResolvedValue([
                {externalId: 'ext-1', name: 'Still Here', url: 'https://example.com/1'},
            ]);
            (connector.fetchMenu as jest.Mock).mockResolvedValue(emptyProviderMenu);
            mockResolve.mockReturnValue(connector);
            mockRegisteredKeys.mockReturnValue([ProviderKey.UBER_EATS]);
            mockUpsertFromProvider.mockResolvedValue('rest-1');
            mockEnsureProviderRef.mockResolvedValue(undefined);
            mockUpsertCategories.mockResolvedValue([]);
            mockRecompute.mockResolvedValue([]);
            mockFindRef.mockResolvedValue([
                {restaurantId: 'rest-1', providerKey: ProviderKey.UBER_EATS, status: 'active', updatedAt: new Date()},
            ]);

            await runSync({providerKey: ProviderKey.UBER_EATS});

            expect(mockSaveRef).not.toHaveBeenCalledWith(expect.objectContaining({status: 'stale'}));
            expect(mockCreateAlert).not.toHaveBeenCalledWith(expect.objectContaining({type: 'restaurant_gone'}));
        });
    });

    describe('diet override stale alerting', () => {
        test('creates alert when diet score changes and manual override exists', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.listRestaurants as jest.Mock).mockResolvedValue([
                {externalId: 'ext-1', name: 'Diet Place', url: 'https://example.com/1'},
            ]);
            (connector.fetchMenu as jest.Mock).mockResolvedValue(sampleProviderMenu);
            mockResolve.mockReturnValue(connector);
            mockRegisteredKeys.mockReturnValue([ProviderKey.UBER_EATS]);
            mockUpsertFromProvider.mockResolvedValue('rest-1');
            mockEnsureProviderRef.mockResolvedValue(undefined);
            mockUpsertCategories.mockResolvedValue([{id: 'cat-1', name: 'Starters'}, {id: 'cat-2', name: 'Mains'}]);
            mockUpsertItems.mockResolvedValue([]);
            mockRecompute.mockResolvedValue([]);
            // Pre-sync: score=50, Post-sync: score=80
            mockGetResults
                .mockResolvedValueOnce([{dietTagId: 'tag-vegan', score: 50}])
                .mockResolvedValueOnce([{dietTagId: 'tag-vegan', score: 80}]);
            mockFindOverrides.mockResolvedValue([{dietTagId: 'tag-vegan', restaurantId: 'rest-1'}]);
            mockGetRestaurantById.mockResolvedValue({id: 'rest-1', name: 'Diet Place'});

            await runSync({providerKey: ProviderKey.UBER_EATS});

            expect(mockCreateAlert).toHaveBeenCalledWith(expect.objectContaining({
                restaurantId: 'rest-1', type: 'diet_override_stale',
            }));
        });

        test('does not create alert when diet scores are unchanged', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.listRestaurants as jest.Mock).mockResolvedValue([
                {externalId: 'ext-1', name: 'Stable Place', url: 'https://example.com/1'},
            ]);
            (connector.fetchMenu as jest.Mock).mockResolvedValue(sampleProviderMenu);
            mockResolve.mockReturnValue(connector);
            mockRegisteredKeys.mockReturnValue([ProviderKey.UBER_EATS]);
            mockUpsertFromProvider.mockResolvedValue('rest-1');
            mockEnsureProviderRef.mockResolvedValue(undefined);
            mockUpsertCategories.mockResolvedValue([{id: 'cat-1', name: 'Starters'}, {id: 'cat-2', name: 'Mains'}]);
            mockUpsertItems.mockResolvedValue([]);
            mockRecompute.mockResolvedValue([]);
            mockGetResults.mockResolvedValue([{dietTagId: 'tag-vegan', score: 50}]);
            mockFindOverrides.mockResolvedValue([{dietTagId: 'tag-vegan', restaurantId: 'rest-1'}]);

            await runSync({providerKey: ProviderKey.UBER_EATS});

            expect(mockCreateAlert).not.toHaveBeenCalledWith(expect.objectContaining({type: 'diet_override_stale'}));
        });

        test('does not create alert when no manual overrides exist', async () => {
            const connector = stubConnector(ProviderKey.UBER_EATS, 'Uber Eats');
            (connector.listRestaurants as jest.Mock).mockResolvedValue([
                {externalId: 'ext-1', name: 'No Override Place', url: 'https://example.com/1'},
            ]);
            (connector.fetchMenu as jest.Mock).mockResolvedValue(sampleProviderMenu);
            mockResolve.mockReturnValue(connector);
            mockRegisteredKeys.mockReturnValue([ProviderKey.UBER_EATS]);
            mockUpsertFromProvider.mockResolvedValue('rest-1');
            mockEnsureProviderRef.mockResolvedValue(undefined);
            mockUpsertCategories.mockResolvedValue([{id: 'cat-1', name: 'Starters'}, {id: 'cat-2', name: 'Mains'}]);
            mockUpsertItems.mockResolvedValue([]);
            mockRecompute.mockResolvedValue([]);
            mockGetResults
                .mockResolvedValueOnce([{dietTagId: 'tag-vegan', score: 50}])
                .mockResolvedValueOnce([{dietTagId: 'tag-vegan', score: 80}]);
            mockFindOverrides.mockResolvedValue([]);

            await runSync({providerKey: ProviderKey.UBER_EATS});

            expect(mockCreateAlert).not.toHaveBeenCalledWith(expect.objectContaining({type: 'diet_override_stale'}));
        });
    });
});
