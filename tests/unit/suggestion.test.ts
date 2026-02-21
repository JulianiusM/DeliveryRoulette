/**
 * Unit tests for SuggestionService
 * Tests filtering logic and random selection
 */

// Mock the AppDataSource
jest.mock('../../src/modules/database/dataSource', () => ({
    AppDataSource: {
        getRepository: jest.fn(),
    },
}));

// Mock the DietOverrideService
jest.mock('../../src/modules/database/services/DietOverrideService');
import * as dietOverrideService from '../../src/modules/database/services/DietOverrideService';

import {AppDataSource} from '../../src/modules/database/dataSource';
import * as suggestionService from '../../src/modules/database/services/SuggestionService';

const mockComputeEffectiveSuitability = dietOverrideService.computeEffectiveSuitability as jest.Mock;

const sampleRestaurants = [
    {id: 'r1', name: 'Vegan Garden', isActive: true},
    {id: 'r2', name: 'Pizza Palace', isActive: true},
    {id: 'r3', name: 'Burger Joint', isActive: true},
];

// Mock query builder chain
function createMockQueryBuilder(results: any[]) {
    const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(results),
    };
    return qb;
}

describe('SuggestionService', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('pickRandom', () => {
        test('returns null for empty array', () => {
            expect(suggestionService.pickRandom([])).toBeNull();
        });

        test('returns the only element for single-element array', () => {
            expect(suggestionService.pickRandom(['a'])).toBe('a');
        });

        test('returns an element from the array', () => {
            const items = ['a', 'b', 'c'];
            const result = suggestionService.pickRandom(items);
            expect(items).toContain(result);
        });
    });

    describe('checkDietCompatibility', () => {
        test('returns compatible=true when no diet tags required', async () => {
            const result = await suggestionService.checkDietCompatibility('r1', []);
            expect(result.compatible).toBe(true);
            expect(result.matchedDiets).toHaveLength(0);
            expect(mockComputeEffectiveSuitability).not.toHaveBeenCalled();
        });

        test('returns compatible=true when all required diets are supported', async () => {
            mockComputeEffectiveSuitability.mockResolvedValue([
                {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'override'},
                {dietTagId: 'tag-gf', dietTagKey: 'GLUTEN_FREE', dietTagLabel: 'Gluten Free', supported: true, source: 'inference'},
            ]);

            const result = await suggestionService.checkDietCompatibility('r1', ['tag-vegan', 'tag-gf']);
            expect(result.compatible).toBe(true);
            expect(result.matchedDiets).toHaveLength(2);
        });

        test('returns compatible=false when a required diet is not supported', async () => {
            mockComputeEffectiveSuitability.mockResolvedValue([
                {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'override'},
                {dietTagId: 'tag-gf', dietTagKey: 'GLUTEN_FREE', dietTagLabel: 'Gluten Free', supported: false, source: 'inference'},
            ]);

            const result = await suggestionService.checkDietCompatibility('r1', ['tag-vegan', 'tag-gf']);
            expect(result.compatible).toBe(false);
        });

        test('returns compatible=false when a required diet tag is missing from suitability', async () => {
            mockComputeEffectiveSuitability.mockResolvedValue([
                {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'override'},
            ]);

            const result = await suggestionService.checkDietCompatibility('r1', ['tag-vegan', 'tag-unknown']);
            expect(result.compatible).toBe(false);
        });

        test('returns compatible=false when a required diet has null support', async () => {
            mockComputeEffectiveSuitability.mockResolvedValue([
                {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: null, source: 'none'},
            ]);

            const result = await suggestionService.checkDietCompatibility('r1', ['tag-vegan']);
            expect(result.compatible).toBe(false);
        });
    });

    describe('findActiveRestaurants', () => {
        test('queries only active restaurants with no filters', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            const result = await suggestionService.findActiveRestaurants({});
            expect(result).toEqual(sampleRestaurants);
            expect(mockQb.where).toHaveBeenCalledWith('r.is_active = :active', {active: 1});
            expect(mockQb.andWhere).not.toHaveBeenCalled();
        });

        test('adds cuisine include filter', async () => {
            const mockQb = createMockQueryBuilder([sampleRestaurants[0]]);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            await suggestionService.findActiveRestaurants({cuisineIncludes: ['Vegan']});
            expect(mockQb.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('r.name LIKE :ci0'),
                expect.objectContaining({ci0: '%Vegan%'}),
            );
        });

        test('adds cuisine exclude filter', async () => {
            const mockQb = createMockQueryBuilder([sampleRestaurants[1]]);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            await suggestionService.findActiveRestaurants({cuisineExcludes: ['Burger']});
            expect(mockQb.andWhere).toHaveBeenCalledWith(
                'r.name NOT LIKE :ce0',
                {ce0: '%Burger%'},
            );
        });
    });

    describe('suggest', () => {
        test('returns null when no active restaurants found', async () => {
            const mockQb = createMockQueryBuilder([]);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            const result = await suggestionService.suggest({});
            expect(result).toBeNull();
        });

        test('returns a restaurant when no diet filters applied', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            const result = await suggestionService.suggest({});
            expect(result).not.toBeNull();
            expect(sampleRestaurants.map(r => r.id)).toContain(result!.restaurant.id);
            expect(result!.reason.matchedDiets).toHaveLength(0);
            expect(result!.reason.totalCandidates).toBe(3);
        });

        test('returns compatible restaurant when diet filters applied', async () => {
            const veganRestaurant = sampleRestaurants[0];
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            // Only first restaurant supports vegan
            mockComputeEffectiveSuitability
                .mockResolvedValueOnce([
                    {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'override'},
                ])
                .mockResolvedValueOnce([
                    {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: false, source: 'inference'},
                ])
                .mockResolvedValueOnce([
                    {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: null, source: 'none'},
                ]);

            const result = await suggestionService.suggest({dietTagIds: ['tag-vegan']});
            expect(result).not.toBeNull();
            expect(result!.restaurant.id).toBe(veganRestaurant.id);
            expect(result!.reason.matchedDiets).toHaveLength(1);
            expect(result!.reason.matchedDiets[0].source).toBe('override');
            expect(result!.reason.totalCandidates).toBe(1);
        });

        test('returns null when no restaurant matches diet filters', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            // No restaurant supports the diet
            mockComputeEffectiveSuitability
                .mockResolvedValue([
                    {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: false, source: 'inference'},
                ]);

            const result = await suggestionService.suggest({dietTagIds: ['tag-vegan']});
            expect(result).toBeNull();
        });
    });
});
