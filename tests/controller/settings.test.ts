/**
 * Controller tests for SettingsController
 * Tests validation and business logic delegation
 */

import {
    getSettingsData,
    saveSettingsValidData,
    saveSettingsInvalidData,
} from '../data/controller/settingsData';
import {setupMock, verifyMockCall} from '../keywords/common/controllerKeywords';
import {ValidationError, ExpectedError} from '../../src/modules/lib/errors';

// Mock the UserPreferenceService
jest.mock('../../src/modules/database/services/UserPreferenceService');
import * as userPreferenceService from '../../src/modules/database/services/UserPreferenceService';

const mockGetByUserId = userPreferenceService.getByUserId as jest.Mock;
const mockUpsert = userPreferenceService.upsert as jest.Mock;

// Import controller after mocking
import * as settingsController from '../../src/controller/settingsController';

describe('SettingsController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getSettings', () => {
        test.each(getSettingsData)('$description', async (testCase) => {
            setupMock(mockGetByUserId, testCase.existingPref);

            const result = await settingsController.getSettings(1);

            verifyMockCall(mockGetByUserId, 1);
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
            setupMock(mockUpsert, savedPref);

            const result = await settingsController.saveSettings(1, testCase.input);

            expect(mockUpsert).toHaveBeenCalledWith(1, testCase.expectedService);
            expect(result.deliveryArea).toBe(testCase.expectedService.deliveryArea);
        });

        test.each(saveSettingsInvalidData)('$description', async (testCase) => {
            await expect(
                settingsController.saveSettings(1, testCase.input)
            ).rejects.toThrow(ValidationError);

            await expect(
                settingsController.saveSettings(1, testCase.input)
            ).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockUpsert).not.toHaveBeenCalled();
        });

        test('throws ExpectedError when user is not authenticated', async () => {
            await expect(
                settingsController.saveSettings(undefined, {deliveryArea: 'Test'})
            ).rejects.toThrow(ExpectedError);
        });
    });
});
