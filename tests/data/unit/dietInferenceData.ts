/**
 * Test data for DietInferenceService unit tests
 */

// ── Sample diet tags ────────────────────────────────────────

export const sampleDietTags = [
    {id: 'tag-vegan', key: 'VEGAN', label: 'Vegan'},
    {id: 'tag-vegetarian', key: 'VEGETARIAN', label: 'Vegetarian'},
    {id: 'tag-gluten-free', key: 'GLUTEN_FREE', label: 'Gluten-free'},
    {id: 'tag-lactose-free', key: 'LACTOSE_FREE', label: 'Lactose-free'},
    {id: 'tag-halal', key: 'HALAL', label: 'Halal'},
];

// ── normalizeText test data ────────────────────────────────

export const normalizeTextData = [
    {
        description: 'trims whitespace',
        input: '  hello world  ',
        expected: 'hello world',
    },
    {
        description: 'collapses multiple spaces',
        input: 'hello    world',
        expected: 'hello world',
    },
    {
        description: 'converts to lowercase',
        input: 'Hello WORLD',
        expected: 'hello world',
    },
    {
        description: 'handles combined normalization',
        input: '  VEGAN  Friendly   Menu  ',
        expected: 'vegan friendly menu',
    },
    {
        description: 'handles empty string',
        input: '',
        expected: '',
    },
    {
        description: 'handles tabs and newlines',
        input: 'hello\t\nworld',
        expected: 'hello world',
    },
];

// ── computeScoreAndConfidence test data ────────────────────

export const scoreAndConfidenceData = [
    {
        description: 'zero items yields score 0 and LOW confidence',
        matchRatio: 0,
        totalMenuItems: 0,
        expectedScore: 0,
        expectedConfidence: 'LOW',
    },
    {
        description: 'no matches with items yields score 0 and LOW confidence',
        matchRatio: 0,
        totalMenuItems: 10,
        expectedScore: 0,
        expectedConfidence: 'LOW',
    },
    {
        description: 'low ratio with many items yields MEDIUM confidence',
        matchRatio: 0.1,
        totalMenuItems: 20,
        expectedScore: 10,
        expectedConfidence: 'MEDIUM',
    },
    {
        description: 'high ratio with many items yields HIGH confidence',
        matchRatio: 0.5,
        totalMenuItems: 10,
        expectedScore: 50,
        expectedConfidence: 'HIGH',
    },
    {
        description: 'full match yields score 100 and HIGH confidence',
        matchRatio: 1.0,
        totalMenuItems: 5,
        expectedScore: 100,
        expectedConfidence: 'HIGH',
    },
    {
        description: 'small menu with half matches yields MEDIUM',
        matchRatio: 0.5,
        totalMenuItems: 4,
        expectedScore: 50,
        expectedConfidence: 'MEDIUM',
    },
    {
        description: 'small menu with low ratio yields LOW',
        matchRatio: 0.25,
        totalMenuItems: 4,
        expectedScore: 25,
        expectedConfidence: 'LOW',
    },
    {
        description: 'threshold ratio 0.3 with many items yields HIGH',
        matchRatio: 0.3,
        totalMenuItems: 10,
        expectedScore: 30,
        expectedConfidence: 'HIGH',
    },
];

// ── inferForTag test data ──────────────────────────────────

export const inferForTagData = [
    {
        description: 'detects vegan items in menu',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {id: 'item-1', name: 'Vegan Burger', description: 'Plant-based patty'},
            {id: 'item-2', name: 'Caesar Salad', description: 'Fresh romaine'},
            {id: 'item-3', name: 'Tofu Bowl', description: 'Crispy tofu'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-3'],
    },
    {
        description: 'detects vegetarian items in menu',
        tag: {id: 'tag-vegetarian', key: 'VEGETARIAN'},
        items: [
            {id: 'item-1', name: 'Vegetarian Pizza', description: null},
            {id: 'item-2', name: 'Steak', description: 'Grilled beef'},
            {id: 'item-3', name: 'Veggie Wrap', description: 'Fresh vegetables'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-3'],
    },
    {
        description: 'detects gluten-free items in menu',
        tag: {id: 'tag-gluten-free', key: 'GLUTEN_FREE'},
        items: [
            {id: 'item-1', name: 'Rice Bowl', description: 'Gluten-free option'},
            {id: 'item-2', name: 'Pasta', description: 'Wheat-based'},
            {id: 'item-3', name: 'GF Pizza', description: 'Our gf crust'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-3'],
    },
    {
        description: 'detects halal items in menu',
        tag: {id: 'tag-halal', key: 'HALAL'},
        items: [
            {id: 'item-1', name: 'Halal Chicken', description: 'Certified halal'},
            {id: 'item-2', name: 'Pork Ribs', description: null},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'returns zero matches when no keywords found',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {id: 'item-1', name: 'Steak', description: 'Grilled beef'},
            {id: 'item-2', name: 'Chicken Wings', description: null},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'handles empty menu',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'handles unknown diet tag key gracefully',
        tag: {id: 'tag-unknown', key: 'UNKNOWN_DIET'},
        items: [
            {id: 'item-1', name: 'Anything', description: 'Something'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'matches keywords in description only',
        tag: {id: 'tag-lactose-free', key: 'LACTOSE_FREE'},
        items: [
            {id: 'item-1', name: 'Smoothie', description: 'Made with dairy-free milk'},
            {id: 'item-2', name: 'Regular Latte', description: 'Whole milk'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'matching is case-insensitive',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {id: 'item-1', name: 'VEGAN BOWL', description: null},
            {id: 'item-2', name: 'Vegan Wrap', description: 'PLANT-BASED'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-2'],
    },
];
