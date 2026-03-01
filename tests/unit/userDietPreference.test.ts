/**
 * Unit tests for UserDietPreferenceService
 * Tests preference retrieval, replacement, and effective filter resolution
 */

import {
    sampleDietTags,
    sampleUserPrefs,
    getEffectiveDietFilterData,
    getEffectiveDietFiltersData,
    replaceForUserData,
} from '../data/unit/userDietPreferenceData';

// Mock the AppDataSource
jest.mock('../../src/modules/database/dataSource', () => ({
    AppDataSource: {
        getRepository: jest.fn(),
    },
}));

import {AppDataSource} from '../../src/modules/database/dataSource';
import * as userDietPreferenceService from '../../src/modules/database/services/UserDietPreferenceService';

const mockGetRepository = AppDataSource.getRepository as jest.Mock;

function createMockRepo(findData: any[] = []) {
    return {
        find: jest.fn().mockResolvedValue(findData),
        findOne: jest.fn(),
        upsert: jest.fn().mockResolvedValue({identifiers: [], generatedMaps: [], raw: []}),
        create: jest.fn((data: any) => data),
        save: jest.fn((data: any) => Promise.resolve(data)),
        delete: jest.fn().mockResolvedValue({affected: 1}),
    };
}

describe('UserDietPreferenceService', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('getByUserId', () => {
        test('returns user diet preferences with relations', async () => {
            const repo = createMockRepo(sampleUserPrefs);
            mockGetRepository.mockReturnValue(repo);

            const result = await userDietPreferenceService.getByUserId(1);

            expect(result).toEqual(sampleUserPrefs);
            expect(repo.find).toHaveBeenCalledWith({
                where: {userId: 1},
                relations: ['dietTag'],
                order: {createdAt: 'ASC'},
            });
        });

        test('returns empty array when no preferences exist', async () => {
            const repo = createMockRepo([]);
            mockGetRepository.mockReturnValue(repo);

            const result = await userDietPreferenceService.getByUserId(99);

            expect(result).toEqual([]);
        });
    });

    describe('getAllDietTags', () => {
        test('returns all diet tags ordered by key', async () => {
            const repo = createMockRepo(sampleDietTags);
            mockGetRepository.mockReturnValue(repo);

            const result = await userDietPreferenceService.getAllDietTags();

            expect(result).toEqual(sampleDietTags);
            expect(repo.find).toHaveBeenNthCalledWith(1, {select: ['key']});
            expect(repo.upsert).toHaveBeenCalled();
            expect(repo.find).toHaveBeenNthCalledWith(2, {order: {key: 'ASC'}});
        });
    });

    describe('replaceForUser', () => {
        test.each(replaceForUserData)('$description', async (testCase) => {
            const prefRepo = createMockRepo();
            const tagRepo = createMockRepo(testCase.validTags);

            mockGetRepository
                .mockReturnValueOnce(prefRepo)  // UserDietPreference repo for delete
                .mockReturnValueOnce(tagRepo);   // DietTag repo for validation

            // Mock save to return the input
            prefRepo.save.mockImplementation((data: any) => Promise.resolve(data));

            const result = await userDietPreferenceService.replaceForUser(1, testCase.tagIds);

            // Always deletes existing preferences
            expect(prefRepo.delete).toHaveBeenCalledWith({userId: 1});

            if (testCase.expectedCreatedCount === 0) {
                expect(result).toEqual([]);
            } else {
                expect(result).toHaveLength(testCase.expectedCreatedCount);
            }
        });
    });

    describe('getEffectiveDietFilterIds', () => {
        test.each(getEffectiveDietFilterData)('$description', async (testCase) => {
            const repo = createMockRepo(testCase.userPrefs);
            mockGetRepository.mockReturnValue(repo);

            const result = await userDietPreferenceService.getEffectiveDietFilterIds(1);

            expect(result).toEqual(testCase.expectedIds);
        });
    });

    describe('getEffectiveDietFilters', () => {
        test.each(getEffectiveDietFiltersData)('$description', async (testCase) => {
            const repo = createMockRepo(testCase.userPrefs);
            mockGetRepository.mockReturnValue(repo);

            const result = await userDietPreferenceService.getEffectiveDietFilters(1);

            expect(result).toEqual(testCase.expectedTags);
        });
    });
});
