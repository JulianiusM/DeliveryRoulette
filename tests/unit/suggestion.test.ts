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

// Mock the openingHours module
jest.mock('../../src/modules/lib/openingHours');
import * as openingHours from '../../src/modules/lib/openingHours';
const mockComputeIsOpenNow = openingHours.computeIsOpenNowFromOpeningHours as jest.Mock;

import {AppDataSource} from '../../src/modules/database/dataSource';
import * as suggestionService from '../../src/modules/database/services/SuggestionService';

const mockComputeEffectiveSuitability = dietOverrideService.computeEffectiveSuitability as jest.Mock;

const sampleRestaurants = [
    {id: 'r1', name: 'Vegan Garden', isActive: true, openingHours: 'delivery: Mon 10:00-22:00'},
    {id: 'r2', name: 'Pizza Palace', isActive: true, openingHours: 'delivery: Mon 10:00-22:00'},
    {id: 'r3', name: 'Burger Joint', isActive: true, openingHours: 'delivery: Mon 10:00-22:00'},
];

// Mock query builder chain
function createMockQueryBuilder(results: any[]) {
    const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
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

        test('returns an element when favoriteIds provided but empty', () => {
            const items = [{id: 'a'}, {id: 'b'}];
            const result = suggestionService.pickRandom(items, new Set(), i => i.id);
            expect(items).toContain(result);
        });

        test('works without getId when no favorites', () => {
            const items = ['a', 'b', 'c'];
            const result = suggestionService.pickRandom(items);
            expect(items).toContain(result);
        });

        test('boosts favorites in selection pool', () => {
            // With favorites boosting, 'a' appears twice in pool of 4
            // Run many times to verify favorite appears more often
            const items = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
            const favoriteIds = new Set(['a']);
            const counts: Record<string, number> = {a: 0, b: 0, c: 0};

            for (let i = 0; i < 1000; i++) {
                const result = suggestionService.pickRandom(items, favoriteIds, item => item.id);
                if (result) counts[result.id]++;
            }

            // 'a' should appear roughly 2/4 = 50% of the time (vs 1/3 ≈ 33% without boost)
            // Use a loose threshold: 'a' should be picked more than 'b' or 'c'
            expect(counts.a).toBeGreaterThan(counts.b);
            expect(counts.a).toBeGreaterThan(counts.c);
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

        test('applies cuisine include filter in-memory', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            const result = await suggestionService.findActiveRestaurants({cuisineIncludes: ['Vegan']});
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('r1');
        });

        test('applies cuisine exclude filter in-memory', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            const result = await suggestionService.findActiveRestaurants({cuisineExcludes: ['Burger']});
            expect(result.map((entry) => entry.id)).toEqual(['r1', 'r2']);
        });

        test('matches foreign cuisine aliases from inferred cuisine profile', async () => {
            const withCuisineProfile = [
                {
                    ...sampleRestaurants[0],
                    cuisineInferenceJson: JSON.stringify({
                        engineVersion: '1.0.0',
                        inferredAt: new Date().toISOString(),
                        providerCuisines: [],
                        cuisines: [
                            {key: 'INDIAN', label: 'Indian', score: 92, confidence: 'HIGH', source: 'heuristic'},
                        ],
                    }),
                },
                sampleRestaurants[1],
            ];
            const mockQb = createMockQueryBuilder(withCuisineProfile);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            const result = await suggestionService.findActiveRestaurants({cuisineIncludes: ['indisch']});
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('r1');
        });

        test('filters by open-only when openOnly is true', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            // r1 is open, r2 is closed, r3 has unknown hours
            mockComputeIsOpenNow
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(null);

            const result = await suggestionService.findActiveRestaurants({openOnly: true});
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('r1');
        });

        test('does not filter by open status when openOnly is false', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            const result = await suggestionService.findActiveRestaurants({openOnly: false});
            expect(result).toHaveLength(3);
            expect(mockComputeIsOpenNow).not.toHaveBeenCalled();
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

        test('excludes recently suggested restaurants (no diet filters)', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            // Exclude r1 and r2, only r3 should remain
            const result = await suggestionService.suggest({excludeRestaurantIds: ['r1', 'r2']});
            expect(result).not.toBeNull();
            expect(result!.restaurant.id).toBe('r3');
            expect(result!.reason.totalCandidates).toBe(1);
        });

        test('excludes recently suggested restaurants (with diet filters)', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            // r1 and r2 support vegan, r3 does not
            mockComputeEffectiveSuitability
                .mockResolvedValueOnce([
                    {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'override'},
                ])
                .mockResolvedValueOnce([
                    {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'inference'},
                ])
                .mockResolvedValueOnce([
                    {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: false, source: 'none'},
                ]);

            // Exclude r1, only r2 should remain from compatible set
            const result = await suggestionService.suggest({
                dietTagIds: ['tag-vegan'],
                excludeRestaurantIds: ['r1'],
            });
            expect(result).not.toBeNull();
            expect(result!.restaurant.id).toBe('r2');
            expect(result!.reason.totalCandidates).toBe(1);
        });

        test('fallback: returns from full list when all candidates are excluded (no diet)', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            // Exclude all three
            const result = await suggestionService.suggest({excludeRestaurantIds: ['r1', 'r2', 'r3']});
            expect(result).not.toBeNull();
            expect(sampleRestaurants.map(r => r.id)).toContain(result!.restaurant.id);
            expect(result!.reason.totalCandidates).toBe(3);
        });

        test('fallback: returns from compatible list when all compatible are excluded', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            // Only r1 supports vegan
            mockComputeEffectiveSuitability
                .mockResolvedValueOnce([
                    {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'override'},
                ])
                .mockResolvedValueOnce([
                    {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: false, source: 'inference'},
                ])
                .mockResolvedValueOnce([
                    {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: false, source: 'none'},
                ]);

            // Exclude r1 (the only compatible one) - should still return r1 as fallback
            const result = await suggestionService.suggest({
                dietTagIds: ['tag-vegan'],
                excludeRestaurantIds: ['r1'],
            });
            expect(result).not.toBeNull();
            expect(result!.restaurant.id).toBe('r1');
            expect(result!.reason.totalCandidates).toBe(1);
        });

        test('do-not-suggest: hard-excludes restaurants with no fallback (no diet)', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            // Do-not-suggest r1 and r2, only r3 should remain
            const result = await suggestionService.suggest({doNotSuggestIds: ['r1', 'r2']});
            expect(result).not.toBeNull();
            expect(result!.restaurant.id).toBe('r3');
        });

        test('do-not-suggest: returns null when all restaurants are excluded', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            // Exclude all restaurants via do-not-suggest - no fallback
            const result = await suggestionService.suggest({doNotSuggestIds: ['r1', 'r2', 'r3']});
            expect(result).toBeNull();
        });

        test('do-not-suggest: applied before diet filtering', async () => {
            const mockQb = createMockQueryBuilder(sampleRestaurants);
            (AppDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            });

            // r2 supports vegan but is do-not-suggest; r1 also supports vegan
            mockComputeEffectiveSuitability
                .mockResolvedValueOnce([
                    {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'override'},
                ])
                .mockResolvedValueOnce([
                    {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: false, source: 'none'},
                ]);

            // r2 is do-not-suggest, so only r1 and r3 are candidates for diet check
            const result = await suggestionService.suggest({
                dietTagIds: ['tag-vegan'],
                doNotSuggestIds: ['r2'],
            });
            expect(result).not.toBeNull();
            expect(result!.restaurant.id).toBe('r1');
            // r2 should never be checked for diet compatibility
            expect(mockComputeEffectiveSuitability).toHaveBeenCalledTimes(2);
        });
    });
});
