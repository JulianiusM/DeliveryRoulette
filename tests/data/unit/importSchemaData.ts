/**
 * Test data for import schema validation tests.
 */

import type {ImportPayload} from "../../../src/modules/import/importSchema";
import {CURRENT_SCHEMA_VERSION} from "../../../src/modules/import/importSchema";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Minimal valid restaurant object used as a building block. */
export const minimalRestaurant = {
    name: "Test Restaurant",
    addressLine1: "123 Main St",
    city: "Berlin",
    postalCode: "10115",
};

/** Minimal valid payload. */
export const minimalPayload: ImportPayload = {
    version: CURRENT_SCHEMA_VERSION,
    restaurants: [minimalRestaurant],
};

/* ------------------------------------------------------------------ */
/*  Valid payloads                                                      */
/* ------------------------------------------------------------------ */

export const validPayloads = [
    {
        description: "minimal restaurant",
        input: minimalPayload,
    },
    {
        description: "restaurant with all optional fields",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [
                {
                    ...minimalRestaurant,
                    addressLine2: "Apt 4B",
                    country: "Germany",
                    dietTags: ["vegan", "gluten_free"],
                    providerRefs: [
                        {providerKey: "lieferando", externalId: "ext-1", url: "https://example.com/r/1"},
                    ],
                    menuCategories: [
                        {
                            name: "Starters",
                            sortOrder: 0,
                            items: [
                                {
                                    name: "Bruschetta",
                                    description: "Toasted bread with tomato topping",
                                    price: 6.5,
                                    currency: "EUR",
                                    sortOrder: 0,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    },
    {
        description: "multiple restaurants",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [
                minimalRestaurant,
                {...minimalRestaurant, name: "Second Place"},
            ],
        },
    },
    {
        description: "restaurant with empty optional arrays",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [
                {
                    ...minimalRestaurant,
                    providerRefs: [],
                    menuCategories: [],
                    dietTags: [],
                },
            ],
        },
    },
    {
        description: "menu item with null optional fields",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [
                {
                    ...minimalRestaurant,
                    menuCategories: [
                        {
                            name: "Mains",
                            items: [
                                {name: "Mystery Dish", description: null, price: null, currency: null},
                            ],
                        },
                    ],
                },
            ],
        },
    },
    {
        description: "provider ref with null externalId",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [
                {
                    ...minimalRestaurant,
                    providerRefs: [
                        {providerKey: "uber_eats", externalId: null, url: "https://ubereats.com/r/1"},
                    ],
                },
            ],
        },
    },
];

/* ------------------------------------------------------------------ */
/*  Invalid payloads                                                    */
/* ------------------------------------------------------------------ */

export const invalidPayloads = [
    {
        description: "null input",
        input: null,
        expectedError: "Input must be a non-null JSON object",
    },
    {
        description: "undefined input",
        input: undefined,
        expectedError: "Input must be a non-null JSON object",
    },
    {
        description: "string input",
        input: "not an object",
        expectedError: "Input must be a non-null JSON object",
    },
    {
        description: "missing version",
        input: {restaurants: [minimalRestaurant]},
        expectedError: "version",
    },
    {
        description: "wrong version number",
        input: {version: 999, restaurants: [minimalRestaurant]},
        expectedError: "Unsupported schema version",
    },
    {
        description: "missing restaurants array",
        input: {version: CURRENT_SCHEMA_VERSION},
        expectedError: "restaurants",
    },
    {
        description: "empty restaurants array",
        input: {version: CURRENT_SCHEMA_VERSION, restaurants: []},
        expectedError: "at least one entry",
    },
    {
        description: "restaurant missing name",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [{addressLine1: "1 St", city: "X", postalCode: "1"}],
        },
        expectedError: "name",
    },
    {
        description: "restaurant missing addressLine1",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [{name: "R", city: "X", postalCode: "1"}],
        },
        expectedError: "addressLine1",
    },
    {
        description: "restaurant missing city",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [{name: "R", addressLine1: "1 St", postalCode: "1"}],
        },
        expectedError: "city",
    },
    {
        description: "restaurant missing postalCode",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [{name: "R", addressLine1: "1 St", city: "X"}],
        },
        expectedError: "postalCode",
    },
    {
        description: "restaurant name exceeds max length",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [{...minimalRestaurant, name: "A".repeat(151)}],
        },
        expectedError: "150",
    },
    {
        description: "menu item with invalid currency length",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [
                {
                    ...minimalRestaurant,
                    menuCategories: [{name: "Cat", items: [{name: "Item", currency: "EURO"}]}],
                },
            ],
        },
        expectedError: "3-letter ISO 4217",
    },
    {
        description: "menu item with negative price",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [
                {
                    ...minimalRestaurant,
                    menuCategories: [{name: "Cat", items: [{name: "Item", price: -1}]}],
                },
            ],
        },
        expectedError: "price",
    },
    {
        description: "provider ref with invalid url",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [
                {
                    ...minimalRestaurant,
                    providerRefs: [{providerKey: "test", url: "not-a-url"}],
                },
            ],
        },
        expectedError: "valid URI",
    },
    {
        description: "provider ref missing providerKey",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [
                {
                    ...minimalRestaurant,
                    providerRefs: [{url: "https://example.com"}],
                },
            ],
        },
        expectedError: "providerKey",
    },
    {
        description: "provider ref missing url",
        input: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants: [
                {
                    ...minimalRestaurant,
                    providerRefs: [{providerKey: "test"}],
                },
            ],
        },
        expectedError: "url",
    },
];

/* ------------------------------------------------------------------ */
/*  Strip-unknown data                                                 */
/* ------------------------------------------------------------------ */

export const unknownFieldPayload = {
    description: "strips unknown top-level and nested fields",
    input: {
        version: CURRENT_SCHEMA_VERSION,
        extra: "should be removed",
        restaurants: [
            {
                ...minimalRestaurant,
                unknown: true,
                menuCategories: [
                    {name: "Cat", bonus: 42, items: [{name: "Item", secret: "x"}]},
                ],
            },
        ],
    },
};
