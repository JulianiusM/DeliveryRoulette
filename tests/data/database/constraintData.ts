/**
 * Test data for database constraint tests.
 * Each entry describes a unique constraint and the duplicate data that should violate it.
 */
import {v4 as uuidv4} from 'uuid';

/* ------------------------------------------------------------------ */
/*  Helper: deterministic UUIDs for FK references                     */
/* ------------------------------------------------------------------ */
export const ids = {
    restaurant1: uuidv4(),
    restaurant2: uuidv4(),
    dietTag1: uuidv4(),
    dietTag2: uuidv4(),
};

/* ------------------------------------------------------------------ */
/*  Seed data needed before constraint tests                          */
/* ------------------------------------------------------------------ */

export const seedUser = {
    username: 'constraintuser',
    name: 'Constraint User',
    email: 'constraint@test.com',
    is_active: 1,
};

export const seedUser2 = {
    username: 'constraintuser2',
    name: 'Constraint User 2',
    email: 'constraint2@test.com',
    is_active: 1,
};

export const seedRestaurant = (id: string) => ({
    id,
    name: 'Test Restaurant',
    address_line1: '123 Main St',
    city: 'Springfield',
    postal_code: '12345',
    country: 'USA',
    is_active: 1,
});

export const seedDietTag = (id: string, key: string) => ({
    id,
    key,
    label: `Label for ${key}`,
});

/* ------------------------------------------------------------------ */
/*  User unique constraint data                                       */
/* ------------------------------------------------------------------ */

export const userEmailDuplicateData = [
    {
        description: 'rejects duplicate email',
        first: {username: 'user_a', name: 'A', email: 'dupe@test.com', is_active: 1},
        second: {username: 'user_b', name: 'B', email: 'dupe@test.com', is_active: 1},
    },
];

export const userUsernameDuplicateData = [
    {
        description: 'rejects duplicate username',
        first: {username: 'dupeuser', name: 'A', email: 'a@test.com', is_active: 1},
        second: {username: 'dupeuser', name: 'B', email: 'b@test.com', is_active: 1},
    },
];

/* ------------------------------------------------------------------ */
/*  DietTag unique key constraint data                                */
/* ------------------------------------------------------------------ */

export const dietTagDuplicateData = [
    {
        description: 'rejects duplicate diet tag key',
        first: {id: uuidv4(), key: 'test_duplicate_key', label: 'Test Diet'},
        second: {id: uuidv4(), key: 'test_duplicate_key', label: 'Test Diet Duplicate'},
    },
];

/* ------------------------------------------------------------------ */
/*  RestaurantProviderRef unique (provider_key, external_id) data     */
/* ------------------------------------------------------------------ */

export const providerRefDuplicateData = [
    {
        description: 'rejects duplicate (provider_key, external_id) pair',
        first: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            provider_key: 'uber_eats',
            external_id: 'ext-123',
            url: 'https://example.com/1',
            status: 'active',
        },
        second: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            provider_key: 'uber_eats',
            external_id: 'ext-123',
            url: 'https://example.com/2',
            status: 'active',
        },
    },
];

export const providerRefAllowedData = [
    {
        description: 'allows same provider_key with different external_id',
        first: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            provider_key: 'uber_eats',
            external_id: 'ext-aaa',
            url: 'https://example.com/a',
            status: 'active',
        },
        second: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            provider_key: 'uber_eats',
            external_id: 'ext-bbb',
            url: 'https://example.com/b',
            status: 'active',
        },
    },
    {
        description: 'allows same external_id with different provider_key',
        first: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            provider_key: 'uber_eats',
            external_id: 'ext-same',
            url: 'https://example.com/c',
            status: 'active',
        },
        second: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            provider_key: 'doordash',
            external_id: 'ext-same',
            url: 'https://example.com/d',
            status: 'active',
        },
    },
];

/* ------------------------------------------------------------------ */
/*  DietInferenceResult unique (restaurant, tag, version) data        */
/* ------------------------------------------------------------------ */

export const dietInferenceDuplicateData = [
    {
        description: 'rejects duplicate (restaurant_id, diet_tag_id, engine_version)',
        first: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            diet_tag_id: ids.dietTag1,
            score: 80,
            confidence: 'HIGH',
            reasons_json: '[]',
            engine_version: 'v1.0',
        },
        second: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            diet_tag_id: ids.dietTag1,
            score: 50,
            confidence: 'LOW',
            reasons_json: '[]',
            engine_version: 'v1.0',
        },
    },
];

export const dietInferenceAllowedData = [
    {
        description: 'allows same restaurant+tag with different engine version',
        first: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            diet_tag_id: ids.dietTag1,
            score: 80,
            confidence: 'HIGH',
            reasons_json: '[]',
            engine_version: 'v1.0',
        },
        second: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            diet_tag_id: ids.dietTag1,
            score: 90,
            confidence: 'HIGH',
            reasons_json: '[]',
            engine_version: 'v2.0',
        },
    },
];

/* ------------------------------------------------------------------ */
/*  DietManualOverride unique (restaurant, tag) data                  */
/* ------------------------------------------------------------------ */

export const dietOverrideDuplicateData = [
    {
        description: 'rejects duplicate (restaurant_id, diet_tag_id)',
        first: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            diet_tag_id: ids.dietTag1,
            supported: 1,
            notes: null,
        },
        second: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            diet_tag_id: ids.dietTag1,
            supported: 0,
            notes: 'different',
        },
    },
];

/* ------------------------------------------------------------------ */
/*  UserDietPreference unique (user, tag) data                        */
/* ------------------------------------------------------------------ */

export const userDietPrefDuplicateData = [
    {
        description: 'rejects duplicate (user_id, diet_tag_id)',
        first: {
            id: uuidv4(),
            diet_tag_id: ids.dietTag1,
        },
        second: {
            id: uuidv4(),
            diet_tag_id: ids.dietTag1,
        },
    },
];

/* ------------------------------------------------------------------ */
/*  UserRestaurantPreference unique (user, restaurant) data           */
/* ------------------------------------------------------------------ */

export const userRestaurantPrefDuplicateData = [
    {
        description: 'rejects duplicate (user_id, restaurant_id)',
        first: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            is_favorite: 1,
            do_not_suggest: 0,
        },
        second: {
            id: uuidv4(),
            restaurant_id: ids.restaurant1,
            is_favorite: 0,
            do_not_suggest: 1,
        },
    },
];

/* ------------------------------------------------------------------ */
/*  Expected tables created by migrations                             */
/* ------------------------------------------------------------------ */

export const expectedMigrationTables = [
    'diet_inference_results',
    'diet_manual_overrides',
    'diet_tag_allergen_exclusions',
    'diet_tag_dishes',
    'diet_tag_keywords',
    'diet_tags',
    'menu_categories',
    'menu_item_diet_overrides',
    'menu_items',
    'provider_credentials',
    'provider_fetch_cache',
    'provider_source_configs',
    'restaurant_cuisines',
    'restaurant_provider_refs',
    'restaurants',
    'suggestion_history',
    'sync_alerts',
    'sync_jobs',
    'user_diet_preferences',
    'user_preferences',
    'user_restaurant_preferences',
].sort();
