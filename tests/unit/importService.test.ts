/**
 * Unit tests for ImportService
 * Tests parse/validate logic and diff computation
 */

import {
    parseValidCases,
    parseInvalidCases,
    singleNewRestaurant,
    singleExistingRestaurant,
    mixedPayload,
    existingDbRestaurant,
    restaurantWithMenuAndRefs,
} from '../data/unit/importServiceData';
import {setupMock} from '../keywords/common/controllerKeywords';

// Mock database services
jest.mock('../../src/modules/database/services/RestaurantService');
import * as restaurantService from '../../src/modules/database/services/RestaurantService';

jest.mock('../../src/modules/database/services/MenuService');
import * as menuService from '../../src/modules/database/services/MenuService';

jest.mock('../../src/modules/database/services/RestaurantProviderRefService');
import * as providerRefService from '../../src/modules/database/services/RestaurantProviderRefService';

jest.mock('../../src/modules/database/services/DietInferenceService');

// Mock AppDataSource for transaction
jest.mock('../../src/modules/database/dataSource', () => ({
    AppDataSource: {
        transaction: jest.fn(async (cb: any) => cb({})),
    },
}));

const mockListRestaurants = restaurantService.listRestaurants as jest.Mock;
const mockListCategoriesByRestaurant = menuService.listCategoriesByRestaurant as jest.Mock;
const mockListByRestaurant = providerRefService.listByRestaurant as jest.Mock;

// Import service after mocking
import * as importService from '../../src/modules/import/importService';

describe('ImportService', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('parseAndValidate', () => {
        test.each(parseValidCases)('$description', (testCase) => {
            const result = importService.parseAndValidate(testCase.input);
            expect(result.valid).toBe(testCase.expectValid);
            if (testCase.expectValid) {
                expect(result.data).toBeDefined();
            }
        });

        test.each(parseInvalidCases)('$description', (testCase) => {
            const result = importService.parseAndValidate(testCase.input);
            expect(result.valid).toBe(testCase.expectValid);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
        });
    });

    describe('computeDiff', () => {
        test('marks restaurant as new when not in DB', async () => {
            setupMock(mockListRestaurants, []);

            const diff = await importService.computeDiff(singleNewRestaurant);

            expect(diff.restaurants).toHaveLength(1);
            expect(diff.restaurants[0].action).toBe('new');
            expect(diff.restaurants[0].name).toBe('New Place');
            expect(diff.totalNew).toBe(1);
            expect(diff.totalUpdated).toBe(0);
            expect(diff.totalUnchanged).toBe(0);
        });

        test('marks restaurant as updated when fields differ', async () => {
            setupMock(mockListRestaurants, [existingDbRestaurant]);
            setupMock(mockListCategoriesByRestaurant, []);
            setupMock(mockListByRestaurant, []);

            const diff = await importService.computeDiff(singleExistingRestaurant);

            expect(diff.restaurants).toHaveLength(1);
            expect(diff.restaurants[0].action).toBe('updated');
            expect(diff.restaurants[0].fieldChanges.length).toBeGreaterThan(0);
            expect(diff.totalNew).toBe(0);
            expect(diff.totalUpdated).toBe(1);
        });

        test('handles mixed new and existing restaurants', async () => {
            setupMock(mockListRestaurants, [existingDbRestaurant]);
            setupMock(mockListCategoriesByRestaurant, []);
            setupMock(mockListByRestaurant, []);

            const diff = await importService.computeDiff(mixedPayload);

            expect(diff.restaurants).toHaveLength(2);
            const actions = diff.restaurants.map((r) => r.action);
            expect(actions).toContain('updated');
            expect(actions).toContain('new');
            expect(diff.totalNew).toBe(1);
            expect(diff.totalUpdated).toBe(1);
        });

        test('includes category and provider ref diffs', async () => {
            setupMock(mockListRestaurants, []);

            const diff = await importService.computeDiff(restaurantWithMenuAndRefs);

            expect(diff.restaurants[0].categories).toHaveLength(1);
            expect(diff.restaurants[0].categories[0].name).toBe('Mains');
            expect(diff.restaurants[0].categories[0].itemCount).toBe(2);
            expect(diff.restaurants[0].providerRefs).toHaveLength(1);
            expect(diff.restaurants[0].providerRefs[0].providerKey).toBe('ubereats');
            expect(diff.restaurants[0].dietTags).toEqual(['VEGAN']);
        });

        test('marks restaurant as unchanged when no differences', async () => {
            const unchangedRestaurant = {
                ...existingDbRestaurant,
                addressLine1: '1 Old St',
                city: 'Oldtown',
                postalCode: '00000',
                country: '',
            };
            setupMock(mockListRestaurants, [unchangedRestaurant]);
            setupMock(mockListCategoriesByRestaurant, []);
            setupMock(mockListByRestaurant, []);

            const diff = await importService.computeDiff({
                version: 1,
                restaurants: [{
                    name: 'Existing Place',
                    addressLine1: '1 Old St',
                    city: 'Oldtown',
                    postalCode: '00000',
                }],
            });

            expect(diff.restaurants[0].action).toBe('unchanged');
            expect(diff.totalUnchanged).toBe(1);
        });
    });
});
