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
import {
    addProviderRefValidData,
    addProviderRefInvalidData,
} from '../data/controller/providerRefData';
import {setupMock, verifyMockCall, verifyResult} from '../keywords/common/controllerKeywords';
import {ValidationError, ExpectedError} from '../../src/modules/lib/errors';

// Mock the RestaurantService
jest.mock('../../src/modules/database/services/RestaurantService');
import * as restaurantService from '../../src/modules/database/services/RestaurantService';

// Mock the MenuService (used by getRestaurantDetail)
jest.mock('../../src/modules/database/services/MenuService');
import * as menuService from '../../src/modules/database/services/MenuService';

// Mock the RestaurantProviderRefService (used by getRestaurantDetail)
jest.mock('../../src/modules/database/services/RestaurantProviderRefService');
import * as providerRefService from '../../src/modules/database/services/RestaurantProviderRefService';

const mockCreateRestaurant = restaurantService.createRestaurant as jest.Mock;
const mockUpdateRestaurant = restaurantService.updateRestaurant as jest.Mock;
const mockGetRestaurantById = restaurantService.getRestaurantById as jest.Mock;
const mockListRestaurants = restaurantService.listRestaurants as jest.Mock;
const mockListCategoriesByRestaurant = menuService.listCategoriesByRestaurant as jest.Mock;
const mockListByRestaurant = providerRefService.listByRestaurant as jest.Mock;
const mockAddProviderRef = providerRefService.addProviderRef as jest.Mock;
const mockRemoveProviderRef = providerRefService.removeProviderRef as jest.Mock;

// Import controller after mocking
import * as restaurantController from '../../src/controller/restaurantController';

const sampleRestaurant = {
    id: 'test-uuid',
    name: 'Pizza Palace',
    addressLine1: '123 Main St',
    addressLine2: null,
    city: 'Springfield',
    postalCode: '12345',
    country: 'USA',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('RestaurantController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('listRestaurants', () => {
        test('returns restaurants with search and filter', async () => {
            setupMock(mockListRestaurants, [sampleRestaurant]);

            const result = await restaurantController.listRestaurants({search: 'Pizza', activeFilter: 'true'});

            expect(mockListRestaurants).toHaveBeenCalledWith({search: 'Pizza', isActive: true});
            expect(result.restaurants).toEqual([sampleRestaurant]);
            expect(result.search).toBe('Pizza');
            expect(result.active).toBe('true');
        });

        test('passes undefined isActive for empty filter', async () => {
            setupMock(mockListRestaurants, []);

            await restaurantController.listRestaurants({});

            expect(mockListRestaurants).toHaveBeenCalledWith({search: undefined, isActive: undefined});
        });

        test('parses activeFilter false', async () => {
            setupMock(mockListRestaurants, []);

            await restaurantController.listRestaurants({activeFilter: 'false'});

            expect(mockListRestaurants).toHaveBeenCalledWith({search: undefined, isActive: false});
        });
    });

    describe('getRestaurantDetail', () => {
        test('returns restaurant with categories', async () => {
            setupMock(mockGetRestaurantById, sampleRestaurant);
            setupMock(mockListCategoriesByRestaurant, []);
            setupMock(mockListByRestaurant, []);

            const result = await restaurantController.getRestaurantDetail('test-uuid');

            expect(result.restaurant).toEqual(sampleRestaurant);
            expect(result.categories).toEqual([]);
            expect(result.providerRefs).toEqual([]);
        });

        test('throws ExpectedError when restaurant not found', async () => {
            setupMock(mockGetRestaurantById, null);

            await expect(restaurantController.getRestaurantDetail('bad-id')).rejects.toThrow(ExpectedError);
        });
    });

    describe('getRestaurantEditData', () => {
        test('returns edit form data for existing restaurant', async () => {
            setupMock(mockGetRestaurantById, sampleRestaurant);

            const result = await restaurantController.getRestaurantEditData('test-uuid') as any;

            expect(result.editing).toBe(true);
            expect(result.id).toBe('test-uuid');
            expect(result.name).toBe('Pizza Palace');
        });

        test('throws ExpectedError when restaurant not found', async () => {
            setupMock(mockGetRestaurantById, null);

            await expect(restaurantController.getRestaurantEditData('bad-id')).rejects.toThrow(ExpectedError);
        });
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

        test('throws ExpectedError when restaurant not found on update', async () => {
            setupMock(mockUpdateRestaurant, null);

            await expect(
                restaurantController.updateRestaurant('bad-id', {
                    name: 'Valid',
                    addressLine1: '123 St',
                    city: 'City',
                    postalCode: '12345',
                })
            ).rejects.toThrow(ExpectedError);
        });
    });

    describe('addProviderRef', () => {
        test.each(addProviderRefValidData)('$description', async (testCase) => {
            setupMock(mockGetRestaurantById, sampleRestaurant);
            setupMock(mockAddProviderRef, {id: 'ref-uuid', restaurantId: 'test-uuid', ...testCase.expected, status: 'active'});

            const result = await restaurantController.addProviderRef('test-uuid', testCase.input);

            verifyMockCall(mockAddProviderRef, {restaurantId: 'test-uuid', ...testCase.expected});
            expect(result).toMatchObject(testCase.expected);
        });

        test.each(addProviderRefInvalidData)('$description', async (testCase) => {
            setupMock(mockGetRestaurantById, sampleRestaurant);

            await expect(
                restaurantController.addProviderRef('test-uuid', testCase.input)
            ).rejects.toThrow(ExpectedError);

            await expect(
                restaurantController.addProviderRef('test-uuid', testCase.input)
            ).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockAddProviderRef).not.toHaveBeenCalled();
        });

        test('throws ExpectedError when restaurant not found', async () => {
            setupMock(mockGetRestaurantById, null);

            await expect(
                restaurantController.addProviderRef('bad-id', {providerKey: 'test', url: 'https://example.com'})
            ).rejects.toThrow(ExpectedError);
        });
    });

    describe('removeProviderRef', () => {
        test('removes provider ref successfully', async () => {
            setupMock(mockGetRestaurantById, sampleRestaurant);
            setupMock(mockRemoveProviderRef, true);

            await restaurantController.removeProviderRef('test-uuid', 'ref-uuid');

            verifyMockCall(mockRemoveProviderRef, 'ref-uuid', 'test-uuid');
        });

        test('throws ExpectedError when provider ref not found', async () => {
            setupMock(mockGetRestaurantById, sampleRestaurant);
            setupMock(mockRemoveProviderRef, false);

            await expect(
                restaurantController.removeProviderRef('test-uuid', 'bad-ref-id')
            ).rejects.toThrow(ExpectedError);
        });

        test('throws ExpectedError when restaurant not found', async () => {
            setupMock(mockGetRestaurantById, null);

            await expect(
                restaurantController.removeProviderRef('bad-id', 'ref-uuid')
            ).rejects.toThrow(ExpectedError);
        });
    });
});
