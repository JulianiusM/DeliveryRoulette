/**
 * Controller tests for MenuController
 * Tests validation and business logic delegation
 */

import {
    createCategoryValidData,
    createCategoryInvalidData,
    updateCategoryValidData,
    updateCategoryInvalidData,
    createItemValidData,
    createItemInvalidData,
    updateItemValidData,
    updateItemInvalidData,
} from '../data/controller/menuData';
import {setupMock, verifyMockCall} from '../keywords/common/controllerKeywords';
import {ValidationError, ExpectedError} from '../../src/modules/lib/errors';

// Mock the MenuService
jest.mock('../../src/modules/database/services/MenuService');
import * as menuService from '../../src/modules/database/services/MenuService';

// Mock the RestaurantService (used by require helpers)
jest.mock('../../src/modules/database/services/RestaurantService');
import * as restaurantService from '../../src/modules/database/services/RestaurantService';

const mockCreateCategory = menuService.createCategory as jest.Mock;
const mockUpdateCategory = menuService.updateCategory as jest.Mock;
const mockCreateItem = menuService.createItem as jest.Mock;
const mockUpdateItem = menuService.updateItem as jest.Mock;
const mockGetCategoryById = menuService.getCategoryById as jest.Mock;
const mockGetItemById = menuService.getItemById as jest.Mock;
const mockGetRestaurantById = restaurantService.getRestaurantById as jest.Mock;

// Import controller after mocking
import * as menuController from '../../src/controller/menuController';

const sampleRestaurant = {id: 'rest-uuid', name: 'Test', isActive: true};
const sampleCategory = {id: 'cat-uuid', name: 'Appetizers', sortOrder: 0, isActive: true, restaurantId: 'rest-uuid', items: []};
const sampleItem = {id: 'item-uuid', name: 'Salad', categoryId: 'cat-uuid', isActive: true};

describe('MenuController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default: restaurant exists
        mockGetRestaurantById.mockResolvedValue(sampleRestaurant);
    });

    describe('getCategoryFormData', () => {
        test('returns form data for existing restaurant', async () => {
            const result = await menuController.getCategoryFormData('rest-uuid') as any;

            expect(result.editing).toBe(false);
            expect(result.restaurantId).toBe('rest-uuid');
        });

        test('throws ExpectedError when restaurant not found', async () => {
            mockGetRestaurantById.mockResolvedValue(null);

            await expect(menuController.getCategoryFormData('bad-id')).rejects.toThrow(ExpectedError);
        });
    });

    describe('getCategoryEditData', () => {
        test('returns edit form data', async () => {
            setupMock(mockGetCategoryById, sampleCategory);

            const result = await menuController.getCategoryEditData('rest-uuid', 'cat-uuid') as any;

            expect(result.editing).toBe(true);
            expect(result.restaurantId).toBe('rest-uuid');
            expect(result.name).toBe('Appetizers');
        });

        test('throws ExpectedError when category not found', async () => {
            setupMock(mockGetCategoryById, null);

            await expect(menuController.getCategoryEditData('rest-uuid', 'bad-id')).rejects.toThrow(ExpectedError);
        });
    });

    describe('createCategory', () => {
        test.each(createCategoryValidData)('$description', async (testCase) => {
            setupMock(mockCreateCategory, {id: 'cat-uuid', ...testCase.expected, restaurantId: 'rest-uuid', isActive: true});

            const result = await menuController.createCategory('rest-uuid', testCase.input);

            verifyMockCall(mockCreateCategory, {
                ...testCase.expected,
                restaurantId: 'rest-uuid',
            });
            expect(result).toMatchObject(testCase.expected);
        });

        test.each(createCategoryInvalidData)('$description', async (testCase) => {
            await expect(
                menuController.createCategory('rest-uuid', testCase.input)
            ).rejects.toThrow(ValidationError);

            await expect(
                menuController.createCategory('rest-uuid', testCase.input)
            ).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockCreateCategory).not.toHaveBeenCalled();
        });

        test('throws ExpectedError when restaurant not found', async () => {
            mockGetRestaurantById.mockResolvedValue(null);

            await expect(menuController.createCategory('bad-id', {name: 'Test'})).rejects.toThrow(ExpectedError);
        });
    });

    describe('updateCategory', () => {
        test.each(updateCategoryValidData)('$description', async (testCase) => {
            setupMock(mockUpdateCategory, {id: 'cat-uuid', ...testCase.expected});

            const result = await menuController.updateCategory('rest-uuid', 'cat-uuid', testCase.input);

            expect(mockUpdateCategory).toHaveBeenCalledWith('cat-uuid', testCase.expected);
            expect(result).toMatchObject(testCase.expected);
        });

        test.each(updateCategoryInvalidData)('$description', async (testCase) => {
            await expect(
                menuController.updateCategory('rest-uuid', 'cat-uuid', testCase.input)
            ).rejects.toThrow(ValidationError);

            await expect(
                menuController.updateCategory('rest-uuid', 'cat-uuid', testCase.input)
            ).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockUpdateCategory).not.toHaveBeenCalled();
        });

        test('throws ExpectedError when category not found on update', async () => {
            setupMock(mockUpdateCategory, null);

            await expect(
                menuController.updateCategory('rest-uuid', 'bad-id', {name: 'Valid'})
            ).rejects.toThrow(ExpectedError);
        });
    });

    describe('getItemFormData', () => {
        test('returns form data for existing restaurant and category', async () => {
            setupMock(mockGetCategoryById, sampleCategory);

            const result = await menuController.getItemFormData('rest-uuid', 'cat-uuid') as any;

            expect(result.editing).toBe(false);
            expect(result.restaurantId).toBe('rest-uuid');
            expect(result.categoryId).toBe('cat-uuid');
        });

        test('throws ExpectedError when category not found', async () => {
            setupMock(mockGetCategoryById, null);

            await expect(menuController.getItemFormData('rest-uuid', 'bad-id')).rejects.toThrow(ExpectedError);
        });
    });

    describe('getItemEditData', () => {
        test('returns edit form data', async () => {
            setupMock(mockGetItemById, sampleItem);

            const result = await menuController.getItemEditData('rest-uuid', 'item-uuid') as any;

            expect(result.editing).toBe(true);
            expect(result.restaurantId).toBe('rest-uuid');
            expect(result.name).toBe('Salad');
        });

        test('throws ExpectedError when item not found', async () => {
            setupMock(mockGetItemById, null);

            await expect(menuController.getItemEditData('rest-uuid', 'bad-id')).rejects.toThrow(ExpectedError);
        });
    });

    describe('createItem', () => {
        beforeEach(() => {
            setupMock(mockGetCategoryById, sampleCategory);
        });

        test.each(createItemValidData)('$description', async (testCase) => {
            setupMock(mockCreateItem, {id: 'item-uuid', ...testCase.expected, categoryId: 'cat-uuid', isActive: true});

            const result = await menuController.createItem('rest-uuid', 'cat-uuid', testCase.input);

            verifyMockCall(mockCreateItem, {
                ...testCase.expected,
                categoryId: 'cat-uuid',
            });
            expect(result).toMatchObject(testCase.expected);
        });

        test.each(createItemInvalidData)('$description', async (testCase) => {
            await expect(
                menuController.createItem('rest-uuid', 'cat-uuid', testCase.input)
            ).rejects.toThrow(ValidationError);

            await expect(
                menuController.createItem('rest-uuid', 'cat-uuid', testCase.input)
            ).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockCreateItem).not.toHaveBeenCalled();
        });

        test('throws ExpectedError when restaurant not found', async () => {
            mockGetRestaurantById.mockResolvedValue(null);

            await expect(menuController.createItem('bad-id', 'cat-uuid', {name: 'Test'})).rejects.toThrow(ExpectedError);
        });

        test('throws ExpectedError when category not found', async () => {
            mockGetCategoryById.mockResolvedValue(null);

            await expect(menuController.createItem('rest-uuid', 'bad-id', {name: 'Test'})).rejects.toThrow(ExpectedError);
        });
    });

    describe('updateItem', () => {
        test.each(updateItemValidData)('$description', async (testCase) => {
            setupMock(mockUpdateItem, {id: 'item-uuid', ...testCase.expected});

            const result = await menuController.updateItem('rest-uuid', 'item-uuid', testCase.input);

            expect(mockUpdateItem).toHaveBeenCalledWith('item-uuid', testCase.expected);
            expect(result).toMatchObject(testCase.expected);
        });

        test.each(updateItemInvalidData)('$description', async (testCase) => {
            await expect(
                menuController.updateItem('rest-uuid', 'item-uuid', testCase.input)
            ).rejects.toThrow(ValidationError);

            await expect(
                menuController.updateItem('rest-uuid', 'item-uuid', testCase.input)
            ).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockUpdateItem).not.toHaveBeenCalled();
        });

        test('throws ExpectedError when item not found on update', async () => {
            setupMock(mockUpdateItem, null);

            await expect(
                menuController.updateItem('rest-uuid', 'bad-id', {name: 'Valid'})
            ).rejects.toThrow(ExpectedError);
        });

        test('throws ExpectedError when restaurant not found', async () => {
            mockGetRestaurantById.mockResolvedValue(null);

            await expect(
                menuController.updateItem('bad-id', 'item-uuid', {name: 'Valid'})
            ).rejects.toThrow(ExpectedError);
        });
    });
});
