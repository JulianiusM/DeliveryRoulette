/**
 * Unit tests for DietTag seed script
 * Tests idempotent seeding logic with mocked repository
 */

import {EXPECTED_DIET_TAGS} from '../data/unit/dietTagData';
import {DEFAULT_DIET_TAGS, seedDietTags} from '../../scripts/seedDietTags';

describe('DietTag seed', () => {
    describe('DEFAULT_DIET_TAGS', () => {
        test('contains exactly the five required tags', () => {
            expect(DEFAULT_DIET_TAGS).toEqual(EXPECTED_DIET_TAGS);
        });

        test('all keys are uppercase with underscores only', () => {
            for (const tag of DEFAULT_DIET_TAGS) {
                expect(tag.key).toMatch(/^[A-Z][A-Z_]*$/);
            }
        });

        test('all keys are unique', () => {
            const keys = DEFAULT_DIET_TAGS.map((t) => t.key);
            expect(new Set(keys).size).toBe(keys.length);
        });
    });

    describe('seedDietTags', () => {
        function buildMockDataSource(existingTags: Array<{key: string; label: string}>) {
            const tagStore: any[] = existingTags.map((t) => ({
                ...t,
                id: `tag-${t.key}`,
                keywords: [],
                dishes: [],
                allergenExclusions: [],
            }));
            const childStores = new Map<string, any[]>();

            const createMockChildRepo = () => ({
                find: jest.fn((opts: any) => Promise.resolve(childStores.get(opts?.where?.dietTagId) ?? [])),
                create: jest.fn((data: any) => ({...data, id: `child-${Math.random()}`})),
                save: jest.fn((data: any) => {
                    const key = data.dietTagId;
                    const store = childStores.get(key) ?? [];
                    store.push(data);
                    childStores.set(key, store);
                    return Promise.resolve(data);
                }),
                remove: jest.fn(() => Promise.resolve()),
            });

            const mockTagRepo = {
                find: jest.fn(() => Promise.resolve(tagStore)),
                create: jest.fn((data: any) => ({...data, id: `tag-${data.key}`, keywords: [], dishes: [], allergenExclusions: []})),
                save: jest.fn((data: any) => {
                    const idx = tagStore.findIndex((t: any) => t.key === data.key);
                    if (idx >= 0) {
                        tagStore[idx] = {...tagStore[idx], ...data};
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

            return {mockDataSource: mockDataSource as any, tagStore};
        }

        test('seeds all tags into empty repository', async () => {
            const {mockDataSource, tagStore} = buildMockDataSource([]);
            const inserted = await seedDietTags(mockDataSource);
            expect(inserted).toBe(5);
            expect(tagStore.length).toBe(5);
        });

        test('skips already-existing tags (idempotent)', async () => {
            const {mockDataSource} = buildMockDataSource([{key: 'VEGAN', label: 'Vegan'}]);
            const inserted = await seedDietTags(mockDataSource);
            expect(inserted).toBe(4);
        });

        test('inserts nothing when all tags exist', async () => {
            const existing = DEFAULT_DIET_TAGS.map((t) => ({key: t.key, label: t.label}));
            const {mockDataSource} = buildMockDataSource([...existing]);
            const inserted = await seedDietTags(mockDataSource);
            expect(inserted).toBe(0);
        });

        test('never duplicates rows on repeated runs', async () => {
            const {mockDataSource, tagStore} = buildMockDataSource([]);
            await seedDietTags(mockDataSource);
            expect(tagStore.length).toBe(5);

            const secondInserted = await seedDietTags(mockDataSource);
            expect(secondInserted).toBe(0);
            expect(tagStore.length).toBe(5);
        });
    });
});
