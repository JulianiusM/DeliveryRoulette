import {
    ensureDefaultDietTags,
} from '../../src/modules/database/services/DietTagService';
import {DEFAULT_DIET_TAGS} from '../../src/modules/database/data/defaultDietTags';
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

        test('all tags have non-empty keywordWhitelist', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                expect(tag.keywordWhitelist.length).toBeGreaterThan(0);
            }
        });

        test('all tags have non-empty dishWhitelist', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                expect(tag.dishWhitelist.length).toBeGreaterThan(0);
            }
        });

        test('all tags have non-empty allergenExclusions', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                expect(tag.allergenExclusions.length).toBeGreaterThan(0);
            }
        });

        test('all tags have non-empty negativeKeywords', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                expect(tag.negativeKeywords.length).toBeGreaterThan(0);
            }
        });

        test('all tags have non-empty strongSignals', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                expect(tag.strongSignals.length).toBeGreaterThan(0);
            }
        });

        test('all tags have non-empty contradictionPatterns', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                expect(tag.contradictionPatterns.length).toBeGreaterThan(0);
            }
        });
    });

    describe('ensureDefaultDietTags', () => {
        let idCounter = 0;

        const ALL_CHILD_KEYS = [
            'keywords', 'dishes', 'allergenExclusions',
            'negativeKeywords', 'strongSignals', 'contradictionPatterns', 'qualifiedNegExceptions',
        ];

        function buildEmptyChildRelations(): Record<string, any[]> {
            const result: Record<string, any[]> = {};
            for (const key of ALL_CHILD_KEYS) {
                result[key] = [];
            }
            return result;
        }

        function buildMockDataSource(existingTags: Array<{key: string; label?: string; id?: string}>) {
            const tagStore: any[] = existingTags.map((t) => ({
                ...t,
                id: t.id ?? `tag-${t.key}`,
                label: t.label ?? t.key,
                parentTagKey: null,
                ...buildEmptyChildRelations(),
            }));

            const createMockChildRepo = () => ({
                find: jest.fn(() => Promise.resolve([])),
                create: jest.fn((data: any) => ({...data, id: `child-${++idCounter}`})),
                save: jest.fn((data: any) => Promise.resolve(data)),
                remove: jest.fn(() => Promise.resolve()),
            });

            const mockTagRepo = {
                find: jest.fn(() => Promise.resolve(tagStore)),
                findOne: jest.fn((opts: any) => Promise.resolve(tagStore.find((t: any) => t.id === opts?.where?.id) ?? null)),
                create: jest.fn((data: any) => ({
                    ...data,
                    id: `tag-${++idCounter}`,
                    parentTagKey: data.parentTagKey ?? null,
                    ...buildEmptyChildRelations(),
                })),
                save: jest.fn((data: any) => {
                    const existing = tagStore.findIndex((t: any) => t.key === data.key);
                    if (existing >= 0) {
                        tagStore[existing] = {...tagStore[existing], ...data};
                    } else {
                        tagStore.push(data);
                    }
                    return Promise.resolve(data);
                }),
            };

            const mockDataSource = {
                getRepository: jest.fn((entity: any) => {
                    const name = entity?.name || String(entity);
                    if (name === 'DietTag') return mockTagRepo;
                    return createMockChildRepo();
                }),
            };

            return {mockDataSource: mockDataSource as any, mockTagRepo, tagStore};
        }

        test.each(ensureDefaultDietTagsData)('$description', async (testCase) => {
            const {mockDataSource} = buildMockDataSource(testCase.existing);

            const missing = await ensureDefaultDietTags(mockDataSource);

            expect(missing).toBe(testCase.expectedMissing);
        });
    });
});
