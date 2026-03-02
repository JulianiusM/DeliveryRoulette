import {
    DEFAULT_DIET_TAGS,
    ensureDefaultDietTags,
} from '../../src/modules/database/services/DietTagService';
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
    });

    describe('ensureDefaultDietTags', () => {
        let idCounter = 0;

        function buildMockDataSource(existingTags: Array<{key: string; label: string; id: string; keywords: any[]; dishes: any[]; allergenExclusions: any[]}>) {
            const tagStore: any[] = [...existingTags];
            const childStores = new Map<string, any[]>();

            const createMockChildRepo = () => ({
                find: jest.fn((opts: any) => {
                    const key = `${opts?.where?.dietTagId ?? 'all'}`;
                    return Promise.resolve(childStores.get(key) ?? []);
                }),
                create: jest.fn((data: any) => ({...data, id: `child-${++idCounter}`})),
                save: jest.fn((data: any) => {
                    const key = `${data.dietTagId}`;
                    const store = childStores.get(key) ?? [];
                    store.push(data);
                    childStores.set(key, store);
                    return Promise.resolve(data);
                }),
                remove: jest.fn(() => Promise.resolve()),
            });

            const mockTagRepo = {
                find: jest.fn(() => Promise.resolve(tagStore)),
                findOne: jest.fn((opts: any) => Promise.resolve(tagStore.find((t: any) => t.id === opts?.where?.id) ?? null)),
                create: jest.fn((data: any) => ({...data, id: `tag-${++idCounter}`, keywords: [], dishes: [], allergenExclusions: []})),
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

            const childRepos = {
                kwRepo: createMockChildRepo(),
                dishRepo: createMockChildRepo(),
                aeRepo: createMockChildRepo(),
            };

            const repoMap: Record<string, any> = {};
            const mockDataSource = {
                getRepository: jest.fn((entity: any) => {
                    const name = entity?.name || String(entity);
                    if (name === 'DietTag') return mockTagRepo;
                    if (name === 'DietTagKeyword') return childRepos.kwRepo;
                    if (name === 'DietTagDish') return childRepos.dishRepo;
                    if (name === 'DietTagAllergenExclusion') return childRepos.aeRepo;
                    return mockTagRepo;
                }),
            };

            return {mockDataSource: mockDataSource as any, mockTagRepo, tagStore};
        }

        test.each(ensureDefaultDietTagsData)('$description', async (testCase) => {
            const existing = testCase.existing.map((t: any) => ({
                ...t,
                id: `tag-${t.key}`,
                keywords: [],
                dishes: [],
                allergenExclusions: [],
            }));
            const {mockDataSource} = buildMockDataSource(existing);

            const missing = await ensureDefaultDietTags(mockDataSource);

            expect(missing).toBe(testCase.expectedMissing);
        });
    });
});
