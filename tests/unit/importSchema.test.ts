/**
 * Unit tests for the import schema validation module.
 * Uses data-driven testing with externalized test data.
 */

import {
    validateImportPayload,
    CURRENT_SCHEMA_VERSION,
} from "../../src/modules/import/importSchema";

import {
    validPayloads,
    invalidPayloads,
    unknownFieldPayload,
    minimalPayload,
} from "../data/unit/importSchemaData";

describe("importSchema", () => {
    describe("CURRENT_SCHEMA_VERSION", () => {
        test("is a positive integer", () => {
            expect(Number.isInteger(CURRENT_SCHEMA_VERSION)).toBe(true);
            expect(CURRENT_SCHEMA_VERSION).toBeGreaterThan(0);
        });
    });

    describe("validateImportPayload – valid inputs", () => {
        test.each(validPayloads)("$description", ({input}) => {
            const result = validateImportPayload(input);
            expect(result.valid).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.errors).toBeUndefined();
        });
    });

    describe("validateImportPayload – invalid inputs", () => {
        test.each(invalidPayloads)("$description", ({input, expectedError}) => {
            const result = validateImportPayload(input);
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
            const joined = result.errors!.join(" ");
            expect(joined).toContain(expectedError);
        });
    });

    describe("validateImportPayload – strips unknown fields", () => {
        test(unknownFieldPayload.description, () => {
            const result = validateImportPayload(unknownFieldPayload.input);
            expect(result.valid).toBe(true);
            const data = result.data!;

            // top-level unknown field removed
            expect((data as any).extra).toBeUndefined();

            // restaurant-level unknown field removed
            expect((data.restaurants[0] as any).unknown).toBeUndefined();

            // nested category-level unknown field removed
            expect((data.restaurants[0].menuCategories![0] as any).bonus).toBeUndefined();

            // nested item-level unknown field removed
            expect((data.restaurants[0].menuCategories![0].items![0] as any).secret).toBeUndefined();
        });
    });

    describe("validateImportPayload – collects all errors", () => {
        test("reports multiple missing fields at once", () => {
            const input = {version: CURRENT_SCHEMA_VERSION, restaurants: [{}]};
            const result = validateImportPayload(input);
            expect(result.valid).toBe(false);
            // At least name, addressLine1, city, postalCode are required
            expect(result.errors!.length).toBeGreaterThanOrEqual(4);
        });
    });

    describe("validateImportPayload – returned data is clean", () => {
        test("returned data matches expected structure", () => {
            const result = validateImportPayload(minimalPayload);
            expect(result.valid).toBe(true);
            expect(result.data!.version).toBe(CURRENT_SCHEMA_VERSION);
            expect(result.data!.restaurants).toHaveLength(1);
            expect(result.data!.restaurants[0].name).toBe("Test Restaurant");
        });
    });
});
