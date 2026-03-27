/**
 * Controller tests for SettingsController
 * Tests validation and business logic delegation
 */

import {
    deleteSavedLocationData,
    getSettingsData,
    saveSettingsInvalidData,
    saveSettingsValidData,
    setDefaultLocationData,
    settingsLocationSamples,
} from '../data/controller/settingsData';
import {setupMock, verifyMockCall} from '../keywords/common/controllerKeywords';
import {ExpectedError, ValidationError} from '../../src/modules/lib/errors';

jest.mock('../../src/modules/database/services/UserPreferenceService');
import * as userPreferenceService from '../../src/modules/database/services/UserPreferenceService';

jest.mock('../../src/modules/database/services/UserDietPreferenceService');
import * as userDietPreferenceService from '../../src/modules/database/services/UserDietPreferenceService';

jest.mock('../../src/modules/database/services/UserLocationService');
import * as userLocationService from '../../src/modules/database/services/UserLocationService';

jest.mock('../../src/modules/lib/addressGeocoding');
import * as addressGeocodingService from '../../src/modules/lib/addressGeocoding';

jest.mock('../../src/modules/sync/UserLocationImportService');
import * as userLocationImportService from '../../src/modules/sync/UserLocationImportService';

const mockGetPreferenceByUserId = userPreferenceService.getByUserId as jest.Mock;
const mockUpsertPreference = userPreferenceService.upsert as jest.Mock;
const mockGetAllDietTags = userDietPreferenceService.getAllDietTags as jest.Mock;
const mockGetDietPrefsByUserId = userDietPreferenceService.getByUserId as jest.Mock;
const mockReplaceDietPrefsForUser = userDietPreferenceService.replaceForUser as jest.Mock;
const mockGetOrBackfillDefaultFromDeliveryArea = userLocationService.getOrBackfillDefaultFromDeliveryArea as jest.Mock;
const mockGetDefaultByUserId = userLocationService.getDefaultByUserId as jest.Mock;
const mockGetByIdForUser = userLocationService.getByIdForUser as jest.Mock;
const mockListByUserId = userLocationService.listByUserId as jest.Mock;
const mockUpsertLocationForUser = userLocationService.upsertLocationForUser as jest.Mock;
const mockSetDefaultLocationForUser = userLocationService.setDefaultLocationForUser as jest.Mock;
const mockDeleteLocationForUser = userLocationService.deleteLocationForUser as jest.Mock;
const mockResolveCoordinates = addressGeocodingService.resolveCoordinates as jest.Mock;
const mockQueueSavedLocationRefreshes = userLocationImportService.queueSavedLocationRefreshes as jest.Mock;

import * as settingsController from '../../src/controller/settingsController';

describe('SettingsController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAllDietTags.mockResolvedValue(settingsLocationSamples.sampleDietTags);
        mockGetDietPrefsByUserId.mockResolvedValue([]);
        mockGetOrBackfillDefaultFromDeliveryArea.mockResolvedValue(null);
        mockGetDefaultByUserId.mockResolvedValue(null);
        mockGetByIdForUser.mockResolvedValue(null);
        mockListByUserId.mockResolvedValue([]);
        mockUpsertLocationForUser.mockResolvedValue(null);
        mockSetDefaultLocationForUser.mockResolvedValue(null);
        mockDeleteLocationForUser.mockResolvedValue({
            deleted: false,
            newDefaultLocation: null,
            remainingLocations: [],
        });
        mockResolveCoordinates.mockResolvedValue({status: 'skipped'});
        mockQueueSavedLocationRefreshes.mockResolvedValue({
            queuedJobs: [{
                jobId: 'job-location-refresh',
                status: 'pending',
                providerKey: 'lieferando',
                createdAt: new Date('2026-03-07T12:00:00.000Z'),
            }],
            issues: [],
        });
    });

    describe('getSettings', () => {
        test.each(getSettingsData)('$description', async (testCase) => {
            setupMock(mockGetPreferenceByUserId, testCase.existingPref);
            setupMock(mockGetAllDietTags, testCase.allDietTags);
            setupMock(mockGetDietPrefsByUserId, testCase.userDietPrefs);
            setupMock(mockGetOrBackfillDefaultFromDeliveryArea, testCase.defaultLocation);
            setupMock(mockListByUserId, testCase.savedLocations);
            setupMock(mockGetByIdForUser, testCase.editorLocation);

            const result = await settingsController.getSettings(1, testCase.editorLocationId);

            verifyMockCall(mockGetPreferenceByUserId, 1);
            verifyMockCall(mockGetAllDietTags);
            verifyMockCall(mockGetOrBackfillDefaultFromDeliveryArea, 1, testCase.existingPref?.deliveryArea ?? null);
            verifyMockCall(mockListByUserId, 1);
            if (testCase.editorLocationId) {
                verifyMockCall(mockGetByIdForUser, 1, testCase.editorLocationId);
            }
            expect(result).toEqual(testCase.expected);
        });

        test('throws ExpectedError when user is not authenticated', async () => {
            await expect(settingsController.getSettings(undefined)).rejects.toThrow(ExpectedError);
        });
    });

    describe('saveSettings', () => {
        test.each(saveSettingsValidData)('$description', async (testCase) => {
            const savedPref = {
                id: 1,
                userId: 1,
                ...testCase.expectedPreferenceUpsert,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const savedDietPrefs = testCase.expectedDietTagIds.map((dietTagId: string, index: number) => ({
                id: `diet-pref-${index + 1}`,
                userId: 1,
                dietTagId,
                createdAt: new Date(),
            }));

            mockGetPreferenceByUserId.mockResolvedValue(testCase.existingPref);
            mockGetOrBackfillDefaultFromDeliveryArea
                .mockResolvedValueOnce(testCase.initialDefaultLocation)
                .mockResolvedValue(testCase.resolvedDefaultLocation);
            mockUpsertPreference.mockResolvedValue(savedPref);
            mockReplaceDietPrefsForUser.mockResolvedValue([]);
            mockGetDietPrefsByUserId.mockResolvedValue(savedDietPrefs);
            mockListByUserId.mockResolvedValue(testCase.savedLocationsAfterSave);
            mockGetDefaultByUserId.mockResolvedValue(testCase.resolvedDefaultLocation);
            mockResolveCoordinates.mockResolvedValue(testCase.geocodingResult);

            if (testCase.expectedLocationUpsert) {
                mockUpsertLocationForUser.mockResolvedValue(testCase.upsertedLocation);
                if (testCase.existingEditedLocationBeforeSave) {
                    mockGetByIdForUser
                        .mockResolvedValueOnce(testCase.existingEditedLocationBeforeSave)
                        .mockResolvedValue(testCase.upsertedLocation);
                } else {
                    mockGetByIdForUser.mockResolvedValue(testCase.upsertedLocation);
                }
            }

            const result = await settingsController.saveSettings(1, testCase.input);

            expect(mockUpsertPreference).toHaveBeenCalledWith(1, testCase.expectedPreferenceUpsert);
            expect(mockReplaceDietPrefsForUser).toHaveBeenCalledWith(1, testCase.expectedDietTagIds);

            if (testCase.expectedLocationUpsert) {
                expect(mockUpsertLocationForUser).toHaveBeenCalledWith(
                    1,
                    testCase.expectedLocationUpsert,
                    testCase.expectedLocationUpsertOptions,
                );
                expect(mockQueueSavedLocationRefreshes).toHaveBeenCalledWith(1, testCase.upsertedLocation.id);
            } else {
                expect(mockUpsertLocationForUser).not.toHaveBeenCalled();
                expect(mockQueueSavedLocationRefreshes).not.toHaveBeenCalled();
            }

            expect(result.deliveryArea).toBe(testCase.expectedPreferenceUpsert.deliveryArea);
            expect(result.defaultLocation).toEqual(testCase.expectedDefaultLocation);
            expect(result.locationEditor).toEqual(testCase.expectedEditor);
            expect(result.notices ?? []).toEqual(testCase.expectedNotices);
        });

        test.each(saveSettingsInvalidData)('$description', async (testCase) => {
            mockGetPreferenceByUserId.mockResolvedValue(testCase.existingPref);
            mockGetOrBackfillDefaultFromDeliveryArea.mockResolvedValue(testCase.initialDefaultLocation);
            mockResolveCoordinates.mockResolvedValue(testCase.geocodingResult ?? {status: 'skipped'});

            await expect(settingsController.saveSettings(1, testCase.input)).rejects.toThrow(ValidationError);
            await expect(settingsController.saveSettings(1, testCase.input)).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockUpsertPreference).not.toHaveBeenCalled();
            expect(mockUpsertLocationForUser).not.toHaveBeenCalled();
        });

        test('throws ExpectedError when user is not authenticated', async () => {
            await expect(settingsController.saveSettings(undefined, {deliveryArea: 'Test'})).rejects.toThrow(ExpectedError);
        });
    });

    describe('setDefaultLocation', () => {
        test.each(setDefaultLocationData)('$description', async (testCase) => {
            const updatedPreference = {
                id: 6,
                userId: 1,
                deliveryArea: testCase.newDefaultLocation.label,
                cuisineIncludes: testCase.existingPref.cuisineIncludes,
                cuisineExcludes: testCase.existingPref.cuisineExcludes,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockSetDefaultLocationForUser.mockResolvedValue(testCase.newDefaultLocation);
            mockGetPreferenceByUserId.mockResolvedValue(testCase.existingPref);
            mockUpsertPreference.mockResolvedValue(updatedPreference);
            mockGetOrBackfillDefaultFromDeliveryArea.mockResolvedValue(testCase.newDefaultLocation);
            mockListByUserId.mockResolvedValue(testCase.savedLocations);
            mockGetByIdForUser.mockResolvedValue(testCase.newDefaultLocation);

            const result = await settingsController.setDefaultLocation(1, testCase.locationId);

            expect(mockSetDefaultLocationForUser).toHaveBeenCalledWith(1, testCase.locationId);
            expect(mockUpsertPreference).toHaveBeenCalledWith(1, {
                deliveryArea: testCase.newDefaultLocation.label,
                cuisineIncludes: testCase.existingPref.cuisineIncludes,
                cuisineExcludes: testCase.existingPref.cuisineExcludes,
            });
            expect(mockQueueSavedLocationRefreshes).toHaveBeenCalledWith(1, testCase.newDefaultLocation.id);
            expect(result.defaultLocation?.id).toBe(testCase.newDefaultLocation.id);
            expect(result.locationEditor.id).toBe(testCase.newDefaultLocation.id);
        });
    });

    describe('deleteSavedLocation', () => {
        test.each(deleteSavedLocationData)('$description', async (testCase) => {
            const updatedPreference = {
                id: 7,
                userId: 1,
                deliveryArea: testCase.deleteResult.newDefaultLocation.label,
                cuisineIncludes: testCase.existingPref.cuisineIncludes,
                cuisineExcludes: testCase.existingPref.cuisineExcludes,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockDeleteLocationForUser.mockResolvedValue(testCase.deleteResult);
            mockGetPreferenceByUserId.mockResolvedValue(testCase.existingPref);
            mockUpsertPreference.mockResolvedValue(updatedPreference);
            mockGetOrBackfillDefaultFromDeliveryArea.mockResolvedValue(testCase.deleteResult.newDefaultLocation);
            mockListByUserId.mockResolvedValue(testCase.savedLocations);
            mockGetByIdForUser.mockResolvedValue(testCase.deleteResult.newDefaultLocation);

            const result = await settingsController.deleteSavedLocation(1, testCase.locationId);

            expect(mockDeleteLocationForUser).toHaveBeenCalledWith(1, testCase.locationId);
            expect(mockUpsertPreference).toHaveBeenCalledWith(1, {
                deliveryArea: testCase.deleteResult.newDefaultLocation.label,
                cuisineIncludes: testCase.existingPref.cuisineIncludes,
                cuisineExcludes: testCase.existingPref.cuisineExcludes,
            });
            expect(result.defaultLocation?.id).toBe(testCase.deleteResult.newDefaultLocation.id);
            expect(result.savedLocations).toHaveLength(1);
        });
    });
});
