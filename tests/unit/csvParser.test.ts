/**
 * Unit tests for CSV parser
 * Tests CSV parsing and column mapping to ImportRestaurant fields
 */

import {
    validCsvCases,
    invalidCsvCases,
    fullCsv,
    multiTagsCsv,
    snakeCaseCsv,
    multiRowCsv,
} from '../data/unit/csvParserData';

import {parseCsvBuffer} from '../../src/modules/import/csvParser';
import {CURRENT_SCHEMA_VERSION} from '../../src/modules/import/importSchema';

describe('CsvParser', () => {
    describe('parseCsvBuffer – valid CSVs', () => {
        test.each(validCsvCases)('$description', async (testCase) => {
            const buffer = Buffer.from(testCase.input, 'utf-8');
            const result = await parseCsvBuffer(buffer);

            expect(result.valid).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.version).toBe(CURRENT_SCHEMA_VERSION);
            expect(result.data!.restaurants).toHaveLength(testCase.expectedCount);
            expect(result.data!.restaurants[0].name).toBe(testCase.expectedName);
        });
    });

    describe('parseCsvBuffer – invalid CSVs', () => {
        test.each(invalidCsvCases)('$description', async (testCase) => {
            const buffer = Buffer.from(testCase.input, 'utf-8');
            const result = await parseCsvBuffer(buffer);

            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
            expect(result.errors!.some((e) => e.includes(testCase.expectedError))).toBe(true);
        });
    });

    describe('field mapping', () => {
        test('maps all optional fields correctly', async () => {
            const buffer = Buffer.from(fullCsv, 'utf-8');
            const result = await parseCsvBuffer(buffer);

            expect(result.valid).toBe(true);
            const restaurant = result.data!.restaurants[0];
            expect(restaurant.name).toBe('Pizza Palace');
            expect(restaurant.addressLine1).toBe('123 Main St');
            expect(restaurant.addressLine2).toBe('Apt 4B');
            expect(restaurant.city).toBe('Berlin');
            expect(restaurant.postalCode).toBe('10115');
            expect(restaurant.country).toBe('Germany');
            expect(restaurant.dietTags).toEqual(['vegan', 'gluten_free']);
        });

        test('parses semicolon-separated diet tags', async () => {
            const buffer = Buffer.from(multiTagsCsv, 'utf-8');
            const result = await parseCsvBuffer(buffer);

            expect(result.valid).toBe(true);
            expect(result.data!.restaurants[0].dietTags).toEqual(['vegan', 'gluten_free', 'organic']);
        });

        test('maps snake_case column names', async () => {
            const buffer = Buffer.from(snakeCaseCsv, 'utf-8');
            const result = await parseCsvBuffer(buffer);

            expect(result.valid).toBe(true);
            const restaurant = result.data!.restaurants[0];
            expect(restaurant.name).toBe('Burger Joint');
            expect(restaurant.addressLine1).toBe('456 Oak Ave');
            expect(restaurant.addressLine2).toBe('Suite 2');
            expect(restaurant.postalCode).toBe('80331');
            expect(restaurant.dietTags).toEqual(['halal']);
        });

        test('does not include menuCategories or providerRefs', async () => {
            const buffer = Buffer.from(fullCsv, 'utf-8');
            const result = await parseCsvBuffer(buffer);

            expect(result.valid).toBe(true);
            const restaurant = result.data!.restaurants[0];
            expect(restaurant.menuCategories).toBeUndefined();
            expect(restaurant.providerRefs).toBeUndefined();
        });
    });

    describe('payload structure', () => {
        test('sets version to CURRENT_SCHEMA_VERSION', async () => {
            const buffer = Buffer.from(multiRowCsv, 'utf-8');
            const result = await parseCsvBuffer(buffer);

            expect(result.valid).toBe(true);
            expect(result.data!.version).toBe(CURRENT_SCHEMA_VERSION);
        });

        test('returns all restaurants from multi-row CSV', async () => {
            const buffer = Buffer.from(multiRowCsv, 'utf-8');
            const result = await parseCsvBuffer(buffer);

            expect(result.valid).toBe(true);
            expect(result.data!.restaurants).toHaveLength(3);
            expect(result.data!.restaurants.map((r) => r.name)).toEqual([
                'Restaurant A',
                'Restaurant B',
                'Restaurant C',
            ]);
        });
    });
});
