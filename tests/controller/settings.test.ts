/**
 * Controller tests for SettingsController
 * Tests validation and business logic delegation
 */

import {
    getSettingsData,
    saveSettingsValidData,
    saveSettingsInvalidData,
    settingsLocationSamples,
} from '../data/controller/settingsData';
import {setupMock, verifyMockCall} from '../keywords/common/controllerKeywords';
import {ExpectedError, ValidationError} from '../../src/modules/lib/errors';

// Mock the UserPreferenceService
jest.mock('../../src/modules/database/services/UserPreferenceService');
import * as userPreferenceService from '../../src/modules/database/services/UserPreferenceService';

// Mock the UserDietPreferenceService
jest.mock('../../src/modules/database/services/UserDietPreferenceService');
import * as userDietPreferenceService from '../../src/modules/database/services/UserDietPreferenceService';

// Mock the UserLocationService
jest.mock('../../src/modules/database/services/UserLocationService');
import * as userLocationService from '../../src/modules/database/services/UserLocationService';

const mockGetByUserId = userPreferenceService.getByUserId as jest.Mock;
const mockUpsert = userPreferenceService.upsert as jest.Mock;
const mockGetAllDietTags = userDietPreferenceService.getAllDietTags as jest.Mock;
const mockGetDietPrefsByUserId = userDietPreferenceService.getByUserId as jest.Mock;
const mockReplaceForUser = userDietPreferenceService.replaceForUser as jest.Mock;
const mockGetOrBackfillDefaultFromDeliveryArea = userLocationService.getOrBackfillDefaultFromDeliveryArea as jest.Mock;
const mockListByUserId = userLocationService.listByUserId as jest.Mock;
const mockUpsertDefaultLocationForUser = userLocationService.upsertDefaultLocationForUser as jest.Mock;

// Import controller after mocking
import * as settingsController from '../../src/controller/settingsController';

describe('SettingsController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAllDietTags.mockResolvedValue(settingsLocationSamples.sampleDietTags);
        mockGetDietPrefsByUserId.mockResolvedValue([]);
        mockGetOrBackfillDefaultFromDeliveryArea.mockResolvedValue(null);
        mockListByUserId.mockResolvedValue([]);
        mockUpsertDefaultLocationForUser.mockResolvedValue(null);
    });

    describe('getSettings', () => {
        test.each(getSettingsData)('$description', async (testCase) => {
            setupMock(mockGetByUserId, testCase.existingPref);
            setupMock(mockGetAllDietTags, testCase.allDietTags);
            setupMock(mockGetDietPrefsByUserId, testCase.userDietPrefs);
            setupMock(mockGetOrBackfillDefaultFromDeliveryArea, testCase.defaultLocation);
            setupMock(mockListByUserId, testCase.savedLocations);

            const result = await settingsController.getSettings(1);

            verifyMockCall(mockGetByUserId, 1);
            verifyMockCall(mockGetAllDietTags);
            verifyMockCall(mockGetOrBackfillDefaultFromDeliveryArea, 1, testCase.existingPref?.deliveryArea ?? null);
            verifyMockCall(mockListByUserId, 1);
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
                ...testCase.expectedService,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const savedDietPrefs = testCase.expectedDietTagIds.map((dietTagId: string, index: number) => ({
                id: `diet-pref-${index + 1}`,
                userId: 1,
                dietTagId,
                createdAt: new Date(),
            }));

            mockGetByUserId.mockResolvedValue(testCase.existingPref);
            mockUpsert.mockResolvedValue(savedPref);
            mockReplaceForUser.mockResolvedValue([]);
            mockGetDietPrefsByUserId.mockResolvedValue(savedDietPrefs);
            mockGetOrBackfillDefaultFromDeliveryArea.mockResolvedValue(testCase.defaultLocationAfterSave);
            mockListByUserId.mockResolvedValue(testCase.savedLocationsAfterSave);

            if (testCase.expectedLocationUpsert) {
                mockUpsertDefaultLocationForUser.mockResolvedValue(testCase.upsertedLocation);
            }

            const result = await settingsController.saveSettings(1, testCase.input);

            expect(mockUpsert).toHaveBeenCalledWith(1, testCase.expectedService);
            expect(mockReplaceForUser).toHaveBeenCalledWith(1, testCase.expectedDietTagIds);

            if (testCase.expectedLocationUpsert) {
                expect(mockUpsertDefaultLocationForUser).toHaveBeenCalledWith(1, testCase.expectedLocationUpsert);
            } else {
                expect(mockUpsertDefaultLocationForUser).not.toHaveBeenCalled();
            }

            expect(result.deliveryArea).toBe(testCase.expectedService.deliveryArea);
            expect(result.defaultLocation).toEqual(
                testCase.defaultLocationAfterSave
                    ? {
                        id: testCase.defaultLocationAfterSave.id,
                        label: testCase.defaultLocationAfterSave.label,
                        addressLine1: testCase.defaultLocationAfterSave.addressLine1 ?? '',
                        addressLine2: testCase.defaultLocationAfterSave.addressLine2 ?? '',
                        city: testCase.defaultLocationAfterSave.city ?? '',
                        postalCode: testCase.defaultLocationAfterSave.postalCode ?? '',
                        country: testCase.defaultLocationAfterSave.country ?? '',
                        latitude: testCase.defaultLocationAfterSave.latitude !== null && testCase.defaultLocationAfterSave.latitude !== undefined
                            ? String(testCase.defaultLocationAfterSave.latitude)
                            : '',
                        longitude: testCase.defaultLocationAfterSave.longitude !== null && testCase.defaultLocationAfterSave.longitude !== undefined
                            ? String(testCase.defaultLocationAfterSave.longitude)
                            : '',
                    }
                    : {
                        id: '',
                        label: '',
                        addressLine1: '',
                        addressLine2: '',
                        city: '',
                        postalCode: '',
                        country: '',
                        latitude: '',
                        longitude: '',
                    }
            );
        });

        test.each(saveSettingsInvalidData)('$description', async (testCase) => {
            mockGetByUserId.mockResolvedValue(testCase.existingPref);

            await expect(
                settingsController.saveSettings(1, testCase.input)
            ).rejects.toThrow(ValidationError);

            await expect(
                settingsController.saveSettings(1, testCase.input)
            ).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockUpsert).not.toHaveBeenCalled();
            expect(mockUpsertDefaultLocationForUser).not.toHaveBeenCalled();
        });

        test('throws ExpectedError when user is not authenticated', async () => {
            await expect(
                settingsController.saveSettings(undefined, {deliveryArea: 'Test'})
            ).rejects.toThrow(ExpectedError);
        });
    });
});
