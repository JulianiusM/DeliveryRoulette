/**
 * Unit tests for DietTag seed script
 * Tests idempotent seeding logic with mocked repository
 */

import {dietTagSeedData, EXPECTED_DIET_TAGS} from '../data/unit/dietTagData';
import {DEFAULT_DIET_TAGS, seedDietTags} from '../../scripts/seedDietTags';
import {DataSource, Repository} from 'typeorm';
import {DietTag} from '../../src/modules/database/entities/diet/DietTag';

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
        function buildMockDataSource(existingTags: { key: string; label: string }[]) {
            const store = [...existingTags];
            const mockRepo = {
                find: jest.fn(() => Promise.resolve(store.map((t) => ({key: t.key})))),
                upsert: jest.fn((entities: { key: string; label: string }[]) => {
                    const values = Array.isArray(entities) ? entities : [entities];
                    for (const value of values) {
                        const existingIndex = store.findIndex((item) => item.key === value.key);
                        if (existingIndex >= 0) {
                            store[existingIndex] = {...store[existingIndex], label: value.label};
                        } else {
                            store.push({...value});
                        }
                    }
                    return Promise.resolve({identifiers: [], generatedMaps: [], raw: []});
                }),
            } as unknown as Repository<DietTag>;

            const mockDataSource = {
                getRepository: jest.fn().mockReturnValue(mockRepo),
            } as unknown as DataSource;

            return {mockDataSource, mockRepo, store};
        }

        test.each(dietTagSeedData)('$description', async (testCase) => {
            const {mockDataSource} = buildMockDataSource(testCase.existing);

            const inserted = await seedDietTags(mockDataSource);

            expect(inserted).toBe(testCase.expectedInserted);
        });

        test('never duplicates rows on repeated runs', async () => {
            const {mockDataSource, store} = buildMockDataSource([]);

            await seedDietTags(mockDataSource);
            expect(store.length).toBe(5);

            // Run a second time – should add nothing
            const secondInserted = await seedDietTags(mockDataSource);
            expect(secondInserted).toBe(0);
            expect(store.length).toBe(5);
        });
    });
});
