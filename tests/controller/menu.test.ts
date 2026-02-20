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
import {ValidationError} from '../../src/modules/lib/errors';

// Mock the MenuService
jest.mock('../../src/modules/database/services/MenuService');
import * as menuService from '../../src/modules/database/services/MenuService';

const mockCreateCategory = menuService.createCategory as jest.Mock;
const mockUpdateCategory = menuService.updateCategory as jest.Mock;
const mockCreateItem = menuService.createItem as jest.Mock;
const mockUpdateItem = menuService.updateItem as jest.Mock;

// Import controller after mocking
import * as menuController from '../../src/controller/menuController';

describe('MenuController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
    });

    describe('updateCategory', () => {
        test.each(updateCategoryValidData)('$description', async (testCase) => {
            setupMock(mockUpdateCategory, {id: 'cat-uuid', ...testCase.expected});

            const result = await menuController.updateCategory('cat-uuid', testCase.input);

            expect(mockUpdateCategory).toHaveBeenCalledWith('cat-uuid', testCase.expected);
            expect(result).toMatchObject(testCase.expected);
        });

        test.each(updateCategoryInvalidData)('$description', async (testCase) => {
            await expect(
                menuController.updateCategory('cat-uuid', testCase.input)
            ).rejects.toThrow(ValidationError);

            await expect(
                menuController.updateCategory('cat-uuid', testCase.input)
            ).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockUpdateCategory).not.toHaveBeenCalled();
        });
    });

    describe('createItem', () => {
        test.each(createItemValidData)('$description', async (testCase) => {
            setupMock(mockCreateItem, {id: 'item-uuid', ...testCase.expected, categoryId: 'cat-uuid', isActive: true});

            const result = await menuController.createItem('cat-uuid', testCase.input);

            verifyMockCall(mockCreateItem, {
                ...testCase.expected,
                categoryId: 'cat-uuid',
            });
            expect(result).toMatchObject(testCase.expected);
        });

        test.each(createItemInvalidData)('$description', async (testCase) => {
            await expect(
                menuController.createItem('cat-uuid', testCase.input)
            ).rejects.toThrow(ValidationError);

            await expect(
                menuController.createItem('cat-uuid', testCase.input)
            ).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockCreateItem).not.toHaveBeenCalled();
        });
    });

    describe('updateItem', () => {
        test.each(updateItemValidData)('$description', async (testCase) => {
            setupMock(mockUpdateItem, {id: 'item-uuid', ...testCase.expected});

            const result = await menuController.updateItem('item-uuid', testCase.input);

            expect(mockUpdateItem).toHaveBeenCalledWith('item-uuid', testCase.expected);
            expect(result).toMatchObject(testCase.expected);
        });

        test.each(updateItemInvalidData)('$description', async (testCase) => {
            await expect(
                menuController.updateItem('item-uuid', testCase.input)
            ).rejects.toThrow(ValidationError);

            await expect(
                menuController.updateItem('item-uuid', testCase.input)
            ).rejects.toMatchObject({
                message: testCase.expectedError,
            });

            expect(mockUpdateItem).not.toHaveBeenCalled();
        });
    });
});
