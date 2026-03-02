/**
 * Test data for DietTag seed tests
 */

import {DEFAULT_DIET_TAGS} from '../../../src/modules/database/data/defaultDietTags';

/**
 * Expected diet tags for structural verification.
 * Derived directly from DEFAULT_DIET_TAGS to avoid duplication (DRY).
 */
export const EXPECTED_DIET_TAGS = DEFAULT_DIET_TAGS;

export const dietTagSeedData = [
    {
        description: 'seeds all tags into empty repository',
        existing: [],
        expectedInserted: 5,
    },
    {
        description: 'skips already-existing tags (idempotent)',
        existing: [{key: 'VEGAN', label: 'Vegan'}],
        expectedInserted: 4,
    },
    {
        description: 'inserts nothing when all tags exist',
        existing: [
            {key: 'VEGAN', label: 'Vegan'},
            {key: 'VEGETARIAN', label: 'Vegetarian'},
            {key: 'GLUTEN_FREE', label: 'Gluten-free'},
            {key: 'LACTOSE_FREE', label: 'Lactose-free'},
            {key: 'HALAL', label: 'Halal'},
        ],
        expectedInserted: 0,
    },
];
