/**
 * Unit tests for UserRestaurantPreferenceService
 * Tests preference retrieval, favorite/do-not-suggest toggling
 */

import {
    toggleFavoriteData,
    toggleDoNotSuggestData,
    getDoNotSuggestData,
    getFavoriteData,
    samplePreference,
} from '../data/unit/userRestaurantPreferenceData';

// Mock the AppDataSource
jest.mock('../../src/modules/database/dataSource', () => ({
    AppDataSource: {
        getRepository: jest.fn(),
    },
}));

import {AppDataSource} from '../../src/modules/database/dataSource';
import * as userRestaurantPreferenceService from '../../src/modules/database/services/UserRestaurantPreferenceService';

const mockGetRepository = AppDataSource.getRepository as jest.Mock;

function createMockRepo(findOneData: any = null, findData: any[] = []) {
    return {
        find: jest.fn().mockResolvedValue(findData),
        findOne: jest.fn().mockResolvedValue(findOneData),
        create: jest.fn((data: any) => data),
        save: jest.fn((data: any) => Promise.resolve(data)),
    };
}

describe('UserRestaurantPreferenceService', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('getByUserAndRestaurant', () => {
        test('returns preference when it exists', async () => {
            const repo = createMockRepo(samplePreference);
            mockGetRepository.mockReturnValue(repo);

            const result = await userRestaurantPreferenceService.getByUserAndRestaurant(1, 'rest-1');

            expect(result).toEqual(samplePreference);
            expect(repo.findOne).toHaveBeenCalledWith({where: {userId: 1, restaurantId: 'rest-1'}});
        });

        test('returns null when no preference exists', async () => {
            const repo = createMockRepo(null);
            mockGetRepository.mockReturnValue(repo);

            const result = await userRestaurantPreferenceService.getByUserAndRestaurant(1, 'rest-99');

            expect(result).toBeNull();
        });
    });

    describe('toggleFavorite', () => {
        test.each(toggleFavoriteData)('$description', async (testCase) => {
            const repo = createMockRepo(testCase.existingPref);
            mockGetRepository.mockReturnValue(repo);

            const result = await userRestaurantPreferenceService.toggleFavorite(1, 'rest-1');

            expect(result.isFavorite).toBe(testCase.expectedIsFavorite);
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('toggleDoNotSuggest', () => {
        test.each(toggleDoNotSuggestData)('$description', async (testCase) => {
            const repo = createMockRepo(testCase.existingPref);
            mockGetRepository.mockReturnValue(repo);

            const result = await userRestaurantPreferenceService.toggleDoNotSuggest(1, 'rest-1');

            expect(result.doNotSuggest).toBe(testCase.expectedDoNotSuggest);
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('getDoNotSuggestRestaurantIds', () => {
        test.each(getDoNotSuggestData)('$description', async (testCase) => {
            const repo = createMockRepo(null, testCase.prefs);
            mockGetRepository.mockReturnValue(repo);

            const result = await userRestaurantPreferenceService.getDoNotSuggestRestaurantIds(1);

            expect(result).toEqual(testCase.expectedIds);
            expect(repo.find).toHaveBeenCalledWith({
                where: {userId: 1, doNotSuggest: true},
                select: ['restaurantId'],
            });
        });
    });

    describe('getFavoriteRestaurantIds', () => {
        test.each(getFavoriteData)('$description', async (testCase) => {
            const repo = createMockRepo(null, testCase.prefs);
            mockGetRepository.mockReturnValue(repo);

            const result = await userRestaurantPreferenceService.getFavoriteRestaurantIds(1);

            expect(result).toEqual(testCase.expectedIds);
            expect(repo.find).toHaveBeenCalledWith({
                where: {userId: 1, isFavorite: true},
                select: ['restaurantId'],
            });
        });
    });
});
