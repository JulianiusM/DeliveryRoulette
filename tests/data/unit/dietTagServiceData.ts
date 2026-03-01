export const ensureDefaultDietTagsData = [
    {
        description: 'detects all defaults as missing in empty repository',
        existing: [],
        expectedMissing: 5,
    },
    {
        description: 'detects partial missing defaults',
        existing: [{key: 'VEGAN'}, {key: 'HALAL'}],
        expectedMissing: 3,
    },
    {
        description: 'detects no missing defaults when all tags exist',
        existing: [
            {key: 'VEGAN'},
            {key: 'VEGETARIAN'},
            {key: 'GLUTEN_FREE'},
            {key: 'LACTOSE_FREE'},
            {key: 'HALAL'},
        ],
        expectedMissing: 0,
    },
];
