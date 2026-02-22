/**
 * Database constraint tests – verify unique constraints are enforced
 * by the real MariaDB schema.
 *
 * Uses the full DataSource (synchronize + migrations) so we get the
 * complete schema from entities, then tests that duplicate inserts fail.
 */

import {DataSource} from 'typeorm';
import {
    createFullDataSource,
    dropAllTables,
    insertRow,
    truncateTable,
    expectDuplicateInsertToFail,
} from '../keywords/database/dbKeywords';
import {
    ids,
    seedUser,
    seedUser2,
    seedRestaurant,
    seedDietTag,
    userEmailDuplicateData,
    userUsernameDuplicateData,
    dietTagDuplicateData,
    providerRefDuplicateData,
    providerRefAllowedData,
    dietInferenceDuplicateData,
    dietInferenceAllowedData,
    dietOverrideDuplicateData,
    userDietPrefDuplicateData,
    userRestaurantPrefDuplicateData,
} from '../data/database/constraintData';

let ds: DataSource;
let userId = 0;

beforeAll(async () => {
    ds = createFullDataSource();
    await ds.initialize();
    await ds.runMigrations();

    // Seed shared reference data
    const userResult = await insertRow(ds, 'users', seedUser);
    userId = userResult.insertId;
    await insertRow(ds, 'users', seedUser2);
    await insertRow(ds, 'restaurants', seedRestaurant(ids.restaurant1));
    await insertRow(ds, 'restaurants', seedRestaurant(ids.restaurant2));
    await insertRow(ds, 'diet_tags', seedDietTag(ids.dietTag1, 'gluten_free'));
    await insertRow(ds, 'diet_tags', seedDietTag(ids.dietTag2, 'halal'));
});

afterAll(async () => {
    if (ds?.isInitialized) {
        await dropAllTables(ds);
        await ds.destroy();
    }
});

/* ------------------------------------------------------------------ */
/*  User constraints                                                  */
/* ------------------------------------------------------------------ */

describe('User unique constraints', () => {
    afterEach(async () => {
        // Clean up test-specific users (keep the seeded ones)
        await ds.query(
            `DELETE FROM users WHERE email LIKE '%dupe%' OR username LIKE 'dupe%' OR username LIKE 'user_%'`,
        );
    });

    test.each(userEmailDuplicateData)('$description', async ({first, second}) => {
        await insertRow(ds, 'users', first);
        await expectDuplicateInsertToFail(ds, 'users', second);
    });

    test.each(userUsernameDuplicateData)('$description', async ({first, second}) => {
        await insertRow(ds, 'users', first);
        await expectDuplicateInsertToFail(ds, 'users', second);
    });
});

/* ------------------------------------------------------------------ */
/*  DietTag constraints                                               */
/* ------------------------------------------------------------------ */

describe('DietTag unique constraints', () => {
    afterEach(async () => {
        await ds.query(`DELETE FROM diet_tags WHERE \`key\` = 'vegan'`);
    });

    test.each(dietTagDuplicateData)('$description', async ({first, second}) => {
        await insertRow(ds, 'diet_tags', first);
        await expectDuplicateInsertToFail(ds, 'diet_tags', second);
    });
});

/* ------------------------------------------------------------------ */
/*  RestaurantProviderRef constraints                                 */
/* ------------------------------------------------------------------ */

describe('RestaurantProviderRef unique constraints', () => {
    afterEach(async () => {
        await truncateTable(ds, 'restaurant_provider_refs');
    });

    test.each(providerRefDuplicateData)('$description', async ({first, second}) => {
        await insertRow(ds, 'restaurant_provider_refs', first);
        await expectDuplicateInsertToFail(ds, 'restaurant_provider_refs', second);
    });

    test.each(providerRefAllowedData)('$description', async ({first, second}) => {
        await insertRow(ds, 'restaurant_provider_refs', first);
        // Should NOT throw – different key combinations are allowed
        await expect(insertRow(ds, 'restaurant_provider_refs', second)).resolves.toBeDefined();
    });
});

/* ------------------------------------------------------------------ */
/*  DietInferenceResult constraints                                   */
/* ------------------------------------------------------------------ */

describe('DietInferenceResult unique constraints', () => {
    afterEach(async () => {
        await truncateTable(ds, 'diet_inference_results');
    });

    test.each(dietInferenceDuplicateData)('$description', async ({first, second}) => {
        await insertRow(ds, 'diet_inference_results', first);
        await expectDuplicateInsertToFail(ds, 'diet_inference_results', second);
    });

    test.each(dietInferenceAllowedData)('$description', async ({first, second}) => {
        await insertRow(ds, 'diet_inference_results', first);
        await expect(insertRow(ds, 'diet_inference_results', second)).resolves.toBeDefined();
    });
});

/* ------------------------------------------------------------------ */
/*  DietManualOverride constraints                                    */
/* ------------------------------------------------------------------ */

describe('DietManualOverride unique constraints', () => {
    afterEach(async () => {
        await truncateTable(ds, 'diet_manual_overrides');
    });

    test.each(dietOverrideDuplicateData)('$description', async ({first, second}) => {
        await insertRow(ds, 'diet_manual_overrides', {
            ...first,
            user_id: userId,
        });
        await expectDuplicateInsertToFail(ds, 'diet_manual_overrides', {
            ...second,
            user_id: userId,
        });
    });
});

/* ------------------------------------------------------------------ */
/*  UserDietPreference constraints                                    */
/* ------------------------------------------------------------------ */

describe('UserDietPreference unique constraints', () => {
    afterEach(async () => {
        await truncateTable(ds, 'user_diet_preferences');
    });

    test.each(userDietPrefDuplicateData)('$description', async ({first, second}) => {
        await insertRow(ds, 'user_diet_preferences', {
            ...first,
            user_id: userId,
        });
        await expectDuplicateInsertToFail(ds, 'user_diet_preferences', {
            ...second,
            user_id: userId,
        });
    });
});

/* ------------------------------------------------------------------ */
/*  UserRestaurantPreference constraints                              */
/* ------------------------------------------------------------------ */

describe('UserRestaurantPreference unique constraints', () => {
    afterEach(async () => {
        await truncateTable(ds, 'user_restaurant_preferences');
    });

    test.each(userRestaurantPrefDuplicateData)('$description', async ({first, second}) => {
        await insertRow(ds, 'user_restaurant_preferences', {
            ...first,
            user_id: userId,
        });
        await expectDuplicateInsertToFail(ds, 'user_restaurant_preferences', {
            ...second,
            user_id: userId,
        });
    });
});
