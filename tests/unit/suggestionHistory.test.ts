/**
 * Unit tests for SuggestionHistoryService
 * Tests recording and retrieval of suggestion history
 */

// Mock the AppDataSource
jest.mock('../../src/modules/database/dataSource', () => ({
    AppDataSource: {
        getRepository: jest.fn(),
    },
}));

// Mock settings
jest.mock('../../src/modules/settings', () => ({
    __esModule: true,
    default: {
        value: {
            suggestionExcludeRecentCount: 3,
        },
    },
}));

import {AppDataSource} from '../../src/modules/database/dataSource';
import * as suggestionHistoryService from '../../src/modules/database/services/SuggestionHistoryService';

// Mock query builder chain
function createMockQueryBuilder(rawResults: Array<{restaurantId: string}>) {
    const qb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(rawResults),
    };
    return qb;
}

describe('SuggestionHistoryService', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('recordSuggestion', () => {
        test('creates and saves a history entry with userId', async () => {
            const mockSave = jest.fn().mockResolvedValue({id: 'hist-1', restaurantId: 'r1', userId: 5});
            const mockCreate = jest.fn().mockReturnValue({restaurantId: 'r1', userId: 5});
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                create: mockCreate,
                save: mockSave,
            });

            const result = await suggestionHistoryService.recordSuggestion('r1', 5);

            expect(mockCreate).toHaveBeenCalledWith({restaurantId: 'r1', userId: 5});
            expect(mockSave).toHaveBeenCalled();
            expect(result).toEqual({id: 'hist-1', restaurantId: 'r1', userId: 5});
        });

        test('creates history entry with null userId for anonymous', async () => {
            const mockSave = jest.fn().mockResolvedValue({id: 'hist-2', restaurantId: 'r1', userId: null});
            const mockCreate = jest.fn().mockReturnValue({restaurantId: 'r1', userId: null});
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                create: mockCreate,
                save: mockSave,
            });

            const result = await suggestionHistoryService.recordSuggestion('r1');

            expect(mockCreate).toHaveBeenCalledWith({restaurantId: 'r1', userId: null});
            expect(mockSave).toHaveBeenCalled();
            expect(result.userId).toBeNull();
        });
    });

    describe('getRecentRestaurantIds', () => {
        test('returns recent restaurant IDs for a user', async () => {
            const mockQb = createMockQueryBuilder([
                {restaurantId: 'r1'},
                {restaurantId: 'r2'},
            ]);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            const result = await suggestionHistoryService.getRecentRestaurantIds(42);

            expect(result).toEqual(['r1', 'r2']);
            expect(mockQb.where).toHaveBeenCalledWith('sh.user_id = :userId', {userId: 42});
            expect(mockQb.limit).toHaveBeenCalledWith(3);
        });

        test('returns recent restaurant IDs for anonymous (null user)', async () => {
            const mockQb = createMockQueryBuilder([
                {restaurantId: 'r3'},
            ]);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            const result = await suggestionHistoryService.getRecentRestaurantIds(null);

            expect(result).toEqual(['r3']);
            expect(mockQb.where).toHaveBeenCalledWith('sh.user_id IS NULL');
        });

        test('returns empty array when no history exists', async () => {
            const mockQb = createMockQueryBuilder([]);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            const result = await suggestionHistoryService.getRecentRestaurantIds(1);

            expect(result).toEqual([]);
        });
    });
});
