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
    {
        description: 'normalizes German text with umlauts',
        input: '  Käsespätzle  Vegetarisch  ',
        expected: 'kasespatzle vegetarisch',
    },
    {
        description: 'normalizes mixed German/English text',
        input: 'Vegan  Pflanzlich  Bowl',
        expected: 'vegan pflanzlich bowl',
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
        expectedScore: 9,
        expectedConfidence: 'MEDIUM',
    },
    {
        description: 'high ratio with many items yields HIGH confidence',
        matchRatio: 0.5,
        totalMenuItems: 10,
        expectedScore: 52,
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
        expectedScore: 48,
        expectedConfidence: 'MEDIUM',
    },
    {
        description: 'small menu with low ratio yields LOW',
        matchRatio: 0.25,
        totalMenuItems: 4,
        expectedScore: 21,
        expectedConfidence: 'LOW',
    },
    {
        description: 'threshold ratio 0.3 with many items yields HIGH',
        matchRatio: 0.3,
        totalMenuItems: 10,
        expectedScore: 31,
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
    // ── German keyword test cases ──────────────────────────────
    {
        description: 'detects German vegan keywords (pflanzlich)',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {id: 'item-1', name: 'Pflanzlich Bowl', description: 'Mit Tofu'},
            {id: 'item-2', name: 'Schnitzel', description: 'Paniert mit Semmelbröseln'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'detects German vegetarian keywords (vegetarisch, fleischlos)',
        tag: {id: 'tag-vegetarian', key: 'VEGETARIAN'},
        items: [
            {id: 'item-1', name: 'Vegetarische Gemüsepfanne', description: null},
            {id: 'item-2', name: 'Fleischlos Glücklich Teller', description: null},
            {id: 'item-3', name: 'Bratwurst', description: 'Vom Grill'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-2'],
    },
    {
        description: 'detects German gluten-free keywords (glutenfrei)',
        tag: {id: 'tag-gluten-free', key: 'GLUTEN_FREE'},
        items: [
            {id: 'item-1', name: 'Reispfanne', description: 'Glutenfrei zubereitet'},
            {id: 'item-2', name: 'Nudeln', description: 'Weizen-basiert'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'detects German lactose-free keywords (laktosefrei, milchfrei)',
        tag: {id: 'tag-lactose-free', key: 'LACTOSE_FREE'},
        items: [
            {id: 'item-1', name: 'Hafermilch Latte', description: 'Laktosefrei'},
            {id: 'item-2', name: 'Sorbet', description: 'Milchfrei und erfrischend'},
            {id: 'item-3', name: 'Käsekuchen', description: 'Mit Frischkäse'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-2'],
    },
    {
        description: 'detects German "ohne fleisch" keyword for vegetarian',
        tag: {id: 'tag-vegetarian', key: 'VEGETARIAN'},
        items: [
            {id: 'item-1', name: 'Gemüsecurry', description: 'Ohne Fleisch, mit Reis'},
            {id: 'item-2', name: 'Rindergulasch', description: null},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'detects mixed German/English keywords in same menu',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {id: 'item-1', name: 'Vegan Bowl', description: null},
            {id: 'item-2', name: 'Pflanzlich Wrap', description: null},
            {id: 'item-3', name: 'Seitan Steak', description: 'Pflanzenbasiert'},
            {id: 'item-4', name: 'Currywurst', description: null},
        ],
        expectedMatchCount: 3,
        expectedMatchedItemIds: ['item-1', 'item-2', 'item-3'],
    },
    // ── Negative-hit test cases ────────────────────────────────
    {
        description: 'negative hit: "Hamburg" does not match halal',
        tag: {id: 'tag-halal', key: 'HALAL'},
        items: [
            {id: 'item-1', name: 'Hamburger', description: 'Classic burger'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'negative hit: "Steak" does not match vegan',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {id: 'item-1', name: 'Steak', description: 'Ribeye steak with butter'},
            {id: 'item-2', name: 'Chicken Wings', description: 'Spicy buffalo'},
            {id: 'item-3', name: 'Pork Belly', description: 'Slow-roasted'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'negative hit: "Fleischkäse" does not match vegetarian despite containing "fleisch"',
        tag: {id: 'tag-vegetarian', key: 'VEGETARIAN'},
        items: [
            {id: 'item-1', name: 'Fleischkäse', description: 'Bayerischer Leberkäs'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'negative hit: "Milchreis" does not match lactose-free',
        tag: {id: 'tag-lactose-free', key: 'LACTOSE_FREE'},
        items: [
            {id: 'item-1', name: 'Milchreis', description: 'Klassisch mit Zimt'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'context disclaimer: plant-based item with dairy disclaimer is not vegan',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {id: 'item-1', name: 'Plant-Based Burger', description: 'Plant-based patty. The cheese contains dairy products.'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'cross-contamination warning does not automatically exclude vegan alternative',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {id: 'item-1', name: 'Vegan Nuggets', description: 'The beef alternatives are prepared on the same grill as the beef patties and may come into contact with them.'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'default dish whitelist detects vegan dishes without explicit vegan keyword',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {id: 'item-1', name: 'Falafel Plate', description: 'Served with tahini and salad'},
            {id: 'item-2', name: 'Chicken Schnitzel', description: 'Breaded chicken breast'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'context false positive: vegan mayo mention on whopper should not mark vegan',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {id: 'item-1', name: 'Whopper', description: 'Whopper also comes with our vegan salad mayonnaise.'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'plant-based whopper is considered vegan when title carries strong qualifier',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {
                id: 'item-1',
                name: 'Plant-based Whopper',
                description: 'The Plant-based Whopper also comes with our vegan salad mayonnaise.',
            },
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'explicit vegan claim outweighs serving-context meat words',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {
                id: 'item-1',
                name: 'Teriyaki Dip 25ml',
                description: "The Teriyaki Sauce is brand new on our menu - and it's vegan too. It's best enjoyed by dipping the new King Nuggets Chicken or the new King Nuggets Plant-based.",
            },
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    // ── Sample menu fixtures ───────────────────────────────────
    {
        description: 'fully vegan menu: all items match VEGAN tag',
        tag: {id: 'tag-vegan', key: 'VEGAN'},
        items: [
            {id: 'item-1', name: 'Vegan Pad Thai', description: 'Tofu and vegetables'},
            {id: 'item-2', name: 'Tempeh Salad', description: 'Fresh greens'},
            {id: 'item-3', name: 'Seitan Wrap', description: 'Plant-based protein'},
            {id: 'item-4', name: 'Pflanzlich Burger', description: 'Dairy-free bun'},
        ],
        expectedMatchCount: 4,
        expectedMatchedItemIds: ['item-1', 'item-2', 'item-3', 'item-4'],
    },
    {
        description: 'mixed menu: some items match VEGETARIAN tag',
        tag: {id: 'tag-vegetarian', key: 'VEGETARIAN'},
        items: [
            {id: 'item-1', name: 'Veggie Burger', description: 'Meat-free patty'},
            {id: 'item-2', name: 'Grilled Salmon', description: 'Wild-caught'},
            {id: 'item-3', name: 'Vegetarische Lasagne', description: 'Mit Gemüse'},
            {id: 'item-4', name: 'Ribeye Steak', description: '300g dry-aged'},
            {id: 'item-5', name: 'Caesar Salad', description: 'Romaine lettuce'},
            {id: 'item-6', name: 'Meatless Monday Bowl', description: 'Seasonal vegetables'},
        ],
        expectedMatchCount: 3,
        expectedMatchedItemIds: ['item-1', 'item-3', 'item-6'],
    },
    {
        description: 'ambiguous menu: items with partial keyword overlap for GLUTEN_FREE',
        tag: {id: 'tag-gluten-free', key: 'GLUTEN_FREE'},
        items: [
            {id: 'item-1', name: 'Rice Noodle Soup', description: 'Naturally gluten free'},
            {id: 'item-2', name: 'Bread Basket', description: 'Assorted wheat breads'},
            {id: 'item-3', name: 'Fries', description: 'May contain traces of gluten'},
            {id: 'item-4', name: 'Glutenfrei Pizza', description: 'Mit Reismehl'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-4'],
    },
    // ── Allergen-based exclusion test cases ─────────────────────
    {
        description: 'allergen exclusion: tofu noodles with egg allergen excluded from vegan',
        tag: {id: 'tag-vegan', key: 'VEGAN', allergenExclusionsJson: '["egg","eggs","ei","eier","milk","milch","dairy","fish","fisch","shellfish","crustaceans"]'},
        items: [
            {id: 'item-1', name: 'Asian Noodles with Tofu', description: 'Stir-fried noodles', allergens: 'Eggs, Soy'},
            {id: 'item-2', name: 'Vegan Pad Thai', description: 'Rice noodles', allergens: 'Soy, Peanuts'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-2'],
    },
    {
        description: 'allergen exclusion: milk allergen excludes from lactose-free',
        tag: {id: 'tag-lactose-free', key: 'LACTOSE_FREE', allergenExclusionsJson: '["milk","milch","dairy","lactose","laktose"]'},
        items: [
            {id: 'item-1', name: 'Oat Milk Latte', description: 'Dairy-free latte', allergens: null},
            {id: 'item-2', name: 'Lactose-Free Cheese Pizza', description: 'Special cheese', allergens: 'Milk, Gluten'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'allergen exclusion: gluten allergen excludes from gluten-free',
        tag: {id: 'tag-gluten-free', key: 'GLUTEN_FREE', allergenExclusionsJson: '["gluten","wheat","weizen","barley","gerste","rye","roggen"]'},
        items: [
            {id: 'item-1', name: 'Gluten-Free Pizza', description: 'Rice flour base', allergens: null},
            {id: 'item-2', name: 'GF Bread', description: 'Our gf option', allergens: 'Wheat'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'allergen exclusion: no allergens means no exclusion',
        tag: {id: 'tag-vegan', key: 'VEGAN', allergenExclusionsJson: '["egg","eggs","milk","dairy"]'},
        items: [
            {id: 'item-1', name: 'Tofu Curry', description: 'With coconut sauce', allergens: null},
            {id: 'item-2', name: 'Tempeh Bowl', description: 'Fresh greens'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-2'],
    },
];

// ── German keyword rules expected data ─────────────────────

export const germanKeywordExpectations = [
    {key: 'VEGAN', expectedKeywords: ['pflanzlich', 'pflanzenbasiert']},
    {key: 'VEGETARIAN', expectedKeywords: ['vegetarisch', 'fleischlos', 'ohne fleisch']},
    {key: 'GLUTEN_FREE', expectedKeywords: ['glutenfrei', 'ohne gluten']},
    {key: 'LACTOSE_FREE', expectedKeywords: ['laktosefrei', 'ohne laktose', 'milchfrei']},
];

// ── Engine versioning test data ────────────────────────────

export const engineVersionData = {
    validFormat: /^\d+\.\d+\.\d+$/,
    expectedCurrent: '4.0.0',
};

