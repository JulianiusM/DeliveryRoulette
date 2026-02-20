/**
 * Controller tests for RestaurantController
 * Tests validation and business logic delegation
 */

import {
    createRestaurantValidData,
    createRestaurantInvalidData,
    updateRestaurantValidData,
    updateRestaurantInvalidData,
} from '../data/controller/restaurantData';
import {setupMock, verifyMockCall, verifyResult} from '../keywords/common/controllerKeywords';
import {ValidationError} from '../../src/modules/lib/errors';

// Mock the RestaurantService
jest.mock('../../src/modules/database/services/RestaurantService');
import * as restaurantService from '../../src/modules/database/services/RestaurantService';

const mockCreateRestaurant = restaurantService.createRestaurant as jest.Mock;
const mockUpdateRestaurant = restaurantService.updateRestaurant as jest.Mock;

// Import controller after mocking
import * as restaurantController from '../../src/controller/restaurantController';

describe('RestaurantController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createRestaurant', () => {
        test.each(createRestaurantValidData)('$description', async (testCase) => {
            setupMock(mockCreateRestaurant, {id: 'test-uuid', ...testCase.expected, isActive: true});

            const result = await restaurantController.createRestaurant(testCase.input);

            verifyMockCall(mockCreateRestaurant, testCase.expected);
            expect(result).toMatchObject(testCase.expected);
        });

        test.each(createRestaurantInvalidData)('$description', async (testCase) => {
            await expect(
                restaurantController.createRestaurant(testCase.input)
            ).rejects.toThrow(ValidationError);

            await expect(
                restaurantController.createRestaurant(testCase.input)
            ).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockCreateRestaurant).not.toHaveBeenCalled();
        });
    });

    describe('updateRestaurant', () => {
        test.each(updateRestaurantValidData)('$description', async (testCase) => {
            setupMock(mockUpdateRestaurant, {id: 'test-uuid', ...testCase.expected});

            const result = await restaurantController.updateRestaurant('test-uuid', testCase.input);

            expect(mockUpdateRestaurant).toHaveBeenCalledWith('test-uuid', testCase.expected);
            expect(result).toMatchObject(testCase.expected);
        });

        test.each(updateRestaurantInvalidData)('$description', async (testCase) => {
            await expect(
                restaurantController.updateRestaurant('test-uuid', testCase.input)
            ).rejects.toThrow(ValidationError);

            await expect(
                restaurantController.updateRestaurant('test-uuid', testCase.input)
            ).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockUpdateRestaurant).not.toHaveBeenCalled();
        });
    });
});
