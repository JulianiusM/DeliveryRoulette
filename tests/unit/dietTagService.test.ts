import {DataSource, Repository} from 'typeorm';
import {
    DEFAULT_DIET_TAGS,
    ensureDefaultDietTags,
    toJsonArray,
} from '../../src/modules/database/services/DietTagService';
import {DietTag} from '../../src/modules/database/entities/diet/DietTag';
import {ensureDefaultDietTagsData} from '../data/unit/dietTagServiceData';

describe('DietTagService', () => {
    describe('DEFAULT_DIET_TAGS', () => {
        test('contains expected default keys', () => {
            expect(DEFAULT_DIET_TAGS.map((tag) => tag.key)).toEqual([
                'VEGAN',
                'VEGETARIAN',
                'GLUTEN_FREE',
                'LACTOSE_FREE',
                'HALAL',
            ]);
        });
    });

    describe('ensureDefaultDietTags', () => {
        function buildMockDataSource(existingTags: Array<{key: string}>) {
            const mockRepo = {
                find: jest.fn().mockResolvedValue(existingTags),
                upsert: jest.fn().mockResolvedValue({identifiers: [], generatedMaps: [], raw: []}),
            } as unknown as Repository<DietTag>;

            const mockDataSource = {
                getRepository: jest.fn().mockReturnValue(mockRepo),
            } as unknown as DataSource;

            return {mockDataSource, mockRepo};
        }

        test.each(ensureDefaultDietTagsData)('$description', async (testCase) => {
            const {mockDataSource, mockRepo} = buildMockDataSource(testCase.existing);

            const missing = await ensureDefaultDietTags(mockDataSource);

            expect(missing).toBe(testCase.expectedMissing);
            expect(mockRepo.find).toHaveBeenCalledWith({select: ['key']});
            expect(mockRepo.upsert).toHaveBeenCalledWith(
                DEFAULT_DIET_TAGS.map((tag) => ({
                    key: tag.key,
                    label: tag.label,
                    keywordWhitelistJson: toJsonArray(tag.keywordWhitelist ?? []),
                    dishWhitelistJson: toJsonArray(tag.dishWhitelist ?? []),
                    allergenExclusionsJson: toJsonArray(tag.allergenExclusions ?? []),
                })),
                ['key'],
            );
        });
    });
});
