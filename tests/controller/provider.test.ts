/**
 * Controller tests for ProviderController
 * Tests provider page data and location-aware sync orchestration.
 */

import {ExpectedError} from '../../src/modules/lib/errors';
import {ProviderKey} from '../../src/providers/ProviderKey';
import {stubConnector} from '../data/unit/connectorRegistryData';
import {
    getProvidersPageDataCases,
    providerControllerLocations,
    syncProviderCases,
} from '../data/controller/providerData';

jest.mock('../../src/modules/database/dataSource', () => ({
    AppDataSource: {
        getRepository: jest.fn(),
    },
}));
import {AppDataSource} from '../../src/modules/database/dataSource';

jest.mock('../../src/providers/ConnectorRegistry');
import * as ConnectorRegistry from '../../src/providers/ConnectorRegistry';

jest.mock('../../src/modules/sync/ProviderSyncService');
import * as providerSyncService from '../../src/modules/sync/ProviderSyncService';

jest.mock('../../src/modules/sync/HeuristicRefreshService', () => ({
    isHeuristicRefreshRunning: jest.fn().mockReturnValue(false),
    startHeuristicRefresh: jest.fn(),
}));

jest.mock('../../src/modules/database/services/ProviderLocationRefService');
import * as providerLocationRefService from '../../src/modules/database/services/ProviderLocationRefService';

jest.mock('../../src/modules/database/services/UserLocationService');
import * as userLocationService from '../../src/modules/database/services/UserLocationService';

jest.mock('../../src/modules/database/services/UserPreferenceService');
import * as userPreferenceService from '../../src/modules/database/services/UserPreferenceService';

const mockGetRepository = AppDataSource.getRepository as jest.Mock;
const mockRegisteredKeys = ConnectorRegistry.registeredKeys as jest.Mock;
const mockResolve = ConnectorRegistry.resolve as jest.Mock;
const mockQueueListingSync = providerSyncService.queueListingSync as jest.Mock;
const mockUpsertResolvedLocation = providerLocationRefService.upsertResolvedLocation as jest.Mock;
const mockGetOrBackfillDefaultFromDeliveryArea = userLocationService.getOrBackfillDefaultFromDeliveryArea as jest.Mock;
const mockListLocationsByUserId = userLocationService.listByUserId as jest.Mock;
const mockGetLocationByIdForUser = userLocationService.getByIdForUser as jest.Mock;
const mockGetPreferenceByUserId = userPreferenceService.getByUserId as jest.Mock;

import * as providerController from '../../src/controller/providerController';

function createProviderConfigRepo(storedConfig: any = null) {
    return {
        findOne: jest.fn().mockResolvedValue(storedConfig),
        create: jest.fn((value) => value),
        save: jest.fn().mockImplementation(async (value) => value),
    };
}

describe('ProviderController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRegisteredKeys.mockReturnValue([]);
        mockGetPreferenceByUserId.mockResolvedValue({deliveryArea: 'Home'});
        mockGetOrBackfillDefaultFromDeliveryArea.mockResolvedValue(providerControllerLocations.home);
        mockListLocationsByUserId.mockResolvedValue([
            providerControllerLocations.home,
            providerControllerLocations.office,
        ]);
        mockGetLocationByIdForUser.mockResolvedValue(providerControllerLocations.home);
        mockQueueListingSync.mockResolvedValue({
            jobId: 'job-1',
            providerKey: ProviderKey.LIEFERANDO,
            syncType: 'listing',
            status: 'pending',
        });
        mockUpsertResolvedLocation.mockResolvedValue({id: 'provider-location-ref-1'});
    });

    describe('getProvidersPageData', () => {
        test.each(getProvidersPageDataCases)('$description', async (testCase) => {
            const connector = stubConnector(testCase.providerKey, 'Lieferando');
            (connector.capabilities as jest.Mock).mockReturnValue({
                canDiscoverFromListingUrl: true,
                canImportFromUrl: true,
                listingUrlLabel: 'Listing URL',
                importUrlLabel: 'Restaurant URL',
            });

            mockRegisteredKeys.mockReturnValue([testCase.providerKey]);
            mockResolve.mockReturnValue(connector);
            mockGetRepository.mockReturnValue(createProviderConfigRepo(testCase.storedConfig));
            mockGetOrBackfillDefaultFromDeliveryArea.mockResolvedValue(testCase.defaultLocation);
            mockListLocationsByUserId.mockResolvedValue(testCase.locations);

            const result = await providerController.getProvidersPageData(testCase.userId);

            expect(result.providers).toHaveLength(1);
            expect(result.providers[0]).toMatchObject({
                providerKey: testCase.providerKey,
                displayName: 'Lieferando',
                listingUrl: testCase.storedConfig.listingUrl,
            });
            expect(result.activeLocation).toMatchObject({
                id: testCase.defaultLocation.id,
                label: testCase.defaultLocation.label,
                hasCoordinates: true,
            });
            expect(result.savedLocations).toHaveLength(2);
        });
    });

    describe('syncProvider', () => {
        test.each(syncProviderCases)('$description', async (testCase) => {
            const connector = stubConnector(testCase.providerKey, 'Lieferando');
            (connector.capabilities as jest.Mock).mockReturnValue({
                canDiscoverFromListingUrl: true,
                canImportFromUrl: false,
                listingUrlLabel: 'Listing URL',
            });
            connector.validateListingUrl = jest.fn();
            connector.resolveLocation = jest.fn().mockResolvedValue(testCase.resolution);

            mockResolve.mockReturnValue(connector);
            mockGetRepository.mockReturnValue(createProviderConfigRepo(null));
            mockGetLocationByIdForUser.mockResolvedValue(testCase.selectedLocation);
            mockUpsertResolvedLocation.mockResolvedValue(testCase.providerLocationRef);
            mockQueueListingSync.mockResolvedValue(testCase.expectedJob);

            const result = await providerController.syncProvider(
                testCase.userId,
                testCase.providerKey,
                testCase.listingUrl,
                testCase.locationId,
            );

            expect(mockGetLocationByIdForUser).toHaveBeenCalledWith(1, testCase.locationId);
            expect(connector.resolveLocation).toHaveBeenCalledWith(expect.objectContaining({
                label: testCase.selectedLocation.label,
                latitude: testCase.selectedLocation.latitude,
                longitude: testCase.selectedLocation.longitude,
                listingUrl: testCase.listingUrl,
            }));
            expect(mockUpsertResolvedLocation).toHaveBeenCalledWith(
                testCase.selectedLocation.id,
                testCase.resolution,
            );
            expect(mockQueueListingSync).toHaveBeenCalledWith(
                testCase.providerKey,
                testCase.listingUrl,
                testCase.providerLocationRef.id,
            );
            expect(result).toEqual(testCase.expectedJob);
        });

        test('rejects explicitly selected locations that do not belong to the user', async () => {
            const connector = stubConnector(ProviderKey.LIEFERANDO, 'Lieferando');
            (connector.capabilities as jest.Mock).mockReturnValue({
                canDiscoverFromListingUrl: true,
                canImportFromUrl: false,
            });
            connector.validateListingUrl = jest.fn();
            connector.resolveLocation = jest.fn();

            mockResolve.mockReturnValue(connector);
            mockGetRepository.mockReturnValue(createProviderConfigRepo(null));
            mockGetLocationByIdForUser.mockResolvedValue(null);

            await expect(
                providerController.syncProvider(
                    '1',
                    ProviderKey.LIEFERANDO,
                    'https://www.lieferando.de/en/delivery/food/neutraubling-93073',
                    'loc-missing',
                )
            ).rejects.toThrow(ExpectedError);

            expect(mockQueueListingSync).not.toHaveBeenCalled();
            expect(mockUpsertResolvedLocation).not.toHaveBeenCalled();
        });
    });
});
