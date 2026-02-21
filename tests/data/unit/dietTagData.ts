/**
 * Test data for DietTag seed tests
 */

export const EXPECTED_DIET_TAGS = [
    {key: 'VEGAN', label: 'Vegan'},
    {key: 'VEGETARIAN', label: 'Vegetarian'},
    {key: 'GLUTEN_FREE', label: 'Gluten-free'},
    {key: 'LACTOSE_FREE', label: 'Lactose-free'},
    {key: 'HALAL', label: 'Halal'},
];

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
