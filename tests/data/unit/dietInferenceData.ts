/**
 * Test data for DietInferenceService unit tests
 */

import {DEFAULT_DIET_TAGS} from '../../../src/modules/database/data/defaultDietTags';

// Helper: build a test tag in the child-table format used by inferForTag()
function buildTestTag(key: string, id: string, overrides?: {
    allergenExclusions?: Array<{value: string}>;
}) {
    const def = DEFAULT_DIET_TAGS.find((t) => t.key === key);
    return {
        id,
        key,
        parentTagKey: def?.parentTagKey ?? null,
        keywords: (def?.keywordWhitelist ?? []).map((v) => ({value: v})),
        dishes: (def?.dishWhitelist ?? []).map((v) => ({value: v})),
        allergenExclusions: overrides?.allergenExclusions ?? (def?.allergenExclusions ?? []).map((v) => ({value: v})),
        negativeKeywords: (def?.negativeKeywords ?? []).map((v) => ({value: v})),
        strongSignals: (def?.strongSignals ?? []).map((v) => ({value: v})),
        contradictionPatterns: (def?.contradictionPatterns ?? []).map((v) => ({value: v})),
        qualifiedNegExceptions: (def?.qualifiedNegExceptions ?? []).map((v) => ({value: v})),
    };
}

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
        description: 'low ratio with many items yields LOW confidence',
        matchRatio: 0.1,
        totalMenuItems: 20,
        expectedScore: 0,
        expectedConfidence: 'LOW',
    },
    {
        description: 'high ratio with many items yields HIGH confidence',
        matchRatio: 0.5,
        totalMenuItems: 10,
        expectedScore: 47,
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
        expectedScore: 43,
        expectedConfidence: 'MEDIUM',
    },
    {
        description: 'small menu with low ratio yields LOW',
        matchRatio: 0.25,
        totalMenuItems: 4,
        expectedScore: 15,
        expectedConfidence: 'LOW',
    },
    {
        description: 'threshold ratio 0.3 with many items yields MEDIUM',
        matchRatio: 0.3,
        totalMenuItems: 10,
        expectedScore: 22,
        expectedConfidence: 'MEDIUM',
    },
];

// ── inferForTag test data ──────────────────────────────────

export const inferForTagData = [
    {
        description: 'detects vegan items in menu',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Vegan Burger', description: 'Plant-based patty'},
            {id: 'item-2', name: 'Caesar Salad', description: 'Fresh romaine'},
            {id: 'item-3', name: 'Pflanzlich Bowl', description: 'Fresh vegetables'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-3'],
    },
    {
        description: 'detects vegetarian items in menu',
        tag: buildTestTag('VEGETARIAN', 'tag-vegetarian'),
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
        tag: buildTestTag('GLUTEN_FREE', 'tag-gluten-free'),
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
        tag: buildTestTag('HALAL', 'tag-halal'),
        items: [
            {id: 'item-1', name: 'Halal Chicken', description: 'Certified halal'},
            {id: 'item-2', name: 'Pork Ribs', description: null},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'returns zero matches when no keywords found',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Steak', description: 'Grilled beef'},
            {id: 'item-2', name: 'Chicken Wings', description: null},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'handles empty menu',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'handles unknown diet tag key gracefully',
        tag: {id: 'tag-unknown', key: 'UNKNOWN_DIET', keywords: [], dishes: [], allergenExclusions: [], negativeKeywords: [], strongSignals: [], contradictionPatterns: [], qualifiedNegExceptions: []},
        items: [
            {id: 'item-1', name: 'Anything', description: 'Something'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'matches keywords in description only',
        tag: buildTestTag('LACTOSE_FREE', 'tag-lactose-free'),
        items: [
            {id: 'item-1', name: 'Veggie Bowl', description: 'Dairy-free with herb sauce'},
            {id: 'item-2', name: 'Creamy Pasta', description: 'Whole milk'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'matching is case-insensitive',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
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
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Pflanzlich Bowl', description: 'Mit Tofu'},
            {id: 'item-2', name: 'Schnitzel', description: 'Paniert mit Semmelbröseln'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'detects German vegetarian keywords (vegetarisch, fleischlos)',
        tag: buildTestTag('VEGETARIAN', 'tag-vegetarian'),
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
        tag: buildTestTag('GLUTEN_FREE', 'tag-gluten-free'),
        items: [
            {id: 'item-1', name: 'Reispfanne', description: 'Glutenfrei zubereitet'},
            {id: 'item-2', name: 'Nudeln', description: 'Weizen-basiert'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'detects German lactose-free keywords (laktosefrei, milchfrei)',
        tag: buildTestTag('LACTOSE_FREE', 'tag-lactose-free'),
        items: [
            {id: 'item-1', name: 'Kartoffelpfanne', description: 'Laktosefrei'},
            {id: 'item-2', name: 'Sorbet', description: 'Milchfrei und erfrischend'},
            {id: 'item-3', name: 'Käsekuchen', description: 'Mit Frischkäse'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-2'],
    },
    {
        description: 'detects German "ohne fleisch" keyword for vegetarian',
        tag: buildTestTag('VEGETARIAN', 'tag-vegetarian'),
        items: [
            {id: 'item-1', name: 'Gemüsecurry', description: 'Ohne Fleisch, mit Reis'},
            {id: 'item-2', name: 'Rindergulasch', description: null},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'detects mixed German/English keywords in same menu',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Vegan Bowl', description: null},
            {id: 'item-2', name: 'Pflanzlich Wrap', description: null},
            {id: 'item-3', name: 'Plant-Based Steak', description: 'Pflanzenbasiert'},
            {id: 'item-4', name: 'Currywurst', description: null},
        ],
        expectedMatchCount: 3,
        expectedMatchedItemIds: ['item-1', 'item-2', 'item-3'],
    },
    // ── Negative-hit test cases ────────────────────────────────
    {
        description: 'negative hit: "Hamburg" does not match halal',
        tag: buildTestTag('HALAL', 'tag-halal'),
        items: [
            {id: 'item-1', name: 'Hamburger', description: 'Classic burger'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'negative hit: "Steak" does not match vegan',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
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
        tag: buildTestTag('VEGETARIAN', 'tag-vegetarian'),
        items: [
            {id: 'item-1', name: 'Fleischkäse', description: 'Bayerischer Leberkäs'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'negative hit: "Milchreis" does not match lactose-free',
        tag: buildTestTag('LACTOSE_FREE', 'tag-lactose-free'),
        items: [
            {id: 'item-1', name: 'Milchreis', description: 'Klassisch mit Zimt'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'context disclaimer: plant-based item with dairy disclaimer is not vegan',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Plant-Based Burger', description: 'Plant-based patty. The cheese contains dairy products.'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'cross-contamination warning does not automatically exclude vegan alternative',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Vegan Nuggets', description: 'The beef alternatives are prepared on the same grill as the beef patties and may come into contact with them.'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'default dish whitelist detects vegan dishes without explicit vegan keyword',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Falafel Plate', description: 'Served with tahini and salad'},
            {id: 'item-2', name: 'Chicken Schnitzel', description: 'Breaded chicken breast'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'context false positive: vegan mayo mention on whopper should not mark vegan',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Whopper', description: 'Whopper also comes with our vegan salad mayonnaise.'},
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'plant-based whopper is considered vegan when title carries strong qualifier',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
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
        description: 'german same-grill beef warning does not exclude plant-based nuggets',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'King Nuggets Plant-based',
                description: "Der moderne Klassiker unter den King Snacks hat eine neue Rezeptur bekommen. Durch die neue Panade sind unsere King Nuggets Plant-based jetzt noch mehr Geschmack und noch mehr Crunch. Probier's aus! Unsere Plant-based Pattys sind auf Soja- und Weizenbasis. Die Beef-Alternativen werden auf demselben Grill zubereitet wie die Beef-Pattys und konnten mit diesen in Kontakt kommen.",
            },
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'strong vegan title does not override cheese mentioned in supporting text',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Plant-based Chili Cheese Tortilla Menu',
                description: 'VeganVegetarian. Our Green Deal: As green as the jalapenos, this Plant-based Tortilla also packs a punch. Featuring a delicious Plant-based Whopper Patty surrounded by Chili Cheese Nuggets, Chili Cheese Sauce, and tasty cheese, all wrapped in a crispy tortilla shell. Our Plant-based Patties are made from a soy and wheat base. The beef alternatives are cooked on the same grill as the beef patties and may come into contact with them.',
            },
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'plant-based cheeseburger with german milk disclaimer is not vegan even without allergen import',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Plant-based Double Cheeseburger Menu',
                description: 'VeganVegetarian. Unsere Plant-based Pattys sind auf Soja- und Weizenbasis. Die Beef-Alternativen werden auf demselben Grill zubereitet wie die Beef-Pattys und konnten mit diesen in Kontakt kommen. Käse enthält Milchprodukte. Preis zzgl. Pfand',
            },
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'ingredient keyword in plant-based item name still excludes vegan match',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Plant-based Cheeseburger',
                description: 'Unsere Plant-based Pattys sind auf Soja- und Weizenbasis.',
            },
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'explicit vegan item name overrides description negatives',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Vegano-Burger (vegan)',
                description: 'Gemüseburger mit veganem Käse, Tomaten, Zwiebeln, Salat und veganer Mayonnaise-Ketchup-Senfsauce',
                allergens: 'Gluten, Wheat, Mustard',
            },
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'explicit vegan item name overrides allergen signal',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Vegane Bambinis mit Broccoli',
                description: '-',
                allergens: 'Gluten, Wheat, Milk',
            },
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'explicit vegan category overrides allergen signal',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Bambinis mit Broccoli',
                categoryName: 'Vegane Gerichte',
                description: '-',
                allergens: 'Gluten, Wheat, Milk',
            },
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'explicit vegan claim outweighs serving-context meat words',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
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
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Vegan Pad Thai', description: 'Rice noodles and vegetables'},
            {id: 'item-2', name: 'Plant-Based Salad', description: 'Fresh greens'},
            {id: 'item-3', name: 'Pflanzlich Wrap', description: 'No animal products'},
            {id: 'item-4', name: 'Pflanzlich Burger', description: 'Dairy-free bun'},
        ],
        expectedMatchCount: 4,
        expectedMatchedItemIds: ['item-1', 'item-2', 'item-3', 'item-4'],
    },
    {
        description: 'mixed menu: some items match VEGETARIAN tag',
        tag: buildTestTag('VEGETARIAN', 'tag-vegetarian'),
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
        tag: buildTestTag('GLUTEN_FREE', 'tag-gluten-free'),
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
        description: 'explicit vegan item names override egg allergen signal',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Vegan Noodles', description: 'Stir-fried noodles', allergens: 'Eggs, Soy'},
            {id: 'item-2', name: 'Vegan Pad Thai', description: 'Rice noodles', allergens: 'Soy, Peanuts'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-2'],
    },
    {
        description: 'explicit lactose-free item names override milk allergen signal',
        tag: buildTestTag('LACTOSE_FREE', 'tag-lactose-free'),
        items: [
            {id: 'item-1', name: 'Dairy-Free Flatbread', description: 'Made with oat cream', allergens: 'Milk'},
            {id: 'item-2', name: 'Lactose-Free Cheese Pizza', description: 'Special cheese', allergens: 'Milk, Gluten'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-2'],
    },
    {
        description: 'allergen exclusion: gluten allergen excludes from gluten-free',
        tag: buildTestTag('GLUTEN_FREE', 'tag-gluten-free'),
        items: [
            {id: 'item-1', name: 'Gluten-Free Pizza', description: 'Rice flour base', allergens: null},
            {id: 'item-2', name: 'GF Bread', description: 'Our gf option', allergens: 'Wheat'},
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'allergen exclusion: no allergens means no exclusion',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Vegan Curry', description: 'With coconut sauce', allergens: null},
            {id: 'item-2', name: 'Plant-Based Bowl', description: 'Fresh greens'},
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-2'],
    },
    {
        description: 'preparation option marked vegan overrides default allergen signal',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Palak Paneer',
                description: 'Spinach curry with paneer',
                dietContext: 'diet-preparation:vegan zubereitet => Ja | Nein\ncustomizations:Ihr Sonderwunsch',
                allergens: 'Milk',
            },
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'explicit lactose-free category overrides allergen signal',
        tag: buildTestTag('LACTOSE_FREE', 'tag-lactose-free'),
        items: [
            {
                id: 'item-1',
                name: 'Fruit Bowl',
                categoryName: 'Laktosefrei',
                description: '-',
                allergens: 'Milk',
            },
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'plant-based preparation option does not override vegan allergen exclusion',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Plant-based Big King',
                description: 'Plant-based burger with sauce',
                dietContext: 'diet-options:plant-based zubereitet\ncustomizations:prepare as plant-based',
                allergens: 'Eggs, Milk',
            },
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'optional vegan add-ons do not make a ham pizza vegan',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Ham Pizza',
                description: 'Pizza with cheese and ham',
                dietContext: 'diet-addon:Choose your dip => Ketchup | Vegan Mayo\ncustomizations:Choose your dip',
                allergens: 'Milk',
            },
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'required vegan replacement choice can override default dairy allergen',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Pizza',
                description: 'Pizza with tomato sauce and cheese',
                dietContext: 'diet-choice:Choose your cheese => Mozzarella | Vegan Cheese\ncustomizations:Choose your cheese',
                allergens: 'Milk',
            },
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'replacement choice only covers the ingredients it can actually replace',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Ham Pizza',
                description: 'Pizza with cheese and ham',
                dietContext: 'diet-choice:Choose your cheese => Mozzarella | Vegan Cheese\ncustomizations:Choose your cheese',
                allergens: 'Milk',
            },
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'german explicit vegan dip claim outweighs pairing meat words',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Teriyaki Dip 25ml',
                description: 'Die Teriyaki Sauce ist ganz neu bei uns auf der Karte - und dann auch noch in vegan. Am besten kommt sie beim Dippen der neuen King Nuggets Chicken oder der neuen King Nuggets Plant-based.',
                allergens: 'Gluten, Wheat, soybean, Sesame',
            },
        ],
        expectedMatchCount: 1,
        expectedMatchedItemIds: ['item-1'],
    },
    {
        description: 'vegan dish whitelist detects potato side dishes without explicit vegan keyword',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'King Pommes',
                description: '-',
            },
            {
                id: 'item-2',
                name: 'Gitterkartoffeln',
                description: 'Außen crunchy, innen soft. Genau wie Pommes sein sollten, doch jetzt in Gitterform zum besseren dippen und snacken.',
                allergens: 'Gluten, Wheat',
            },
            {
                id: 'item-3',
                name: 'Churros Zimt & Zucker',
                description: 'Außen knusprig, innen herrlich lecker und bestäubt mit Zimt und Zucker sind sie unwiderstehlich.',
                allergens: 'Gluten, Wheat',
            },
        ],
        expectedMatchCount: 2,
        expectedMatchedItemIds: ['item-1', 'item-2'],
    },
    {
        description: 'side-dish wording in descriptions does not make non-vegan mains vegan',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: 'Calamari',
                description: 'mit Pommes frites, Ketchup und Salat',
            },
            {
                id: 'item-2',
                name: '2 Arabische Schawarma',
                description: 'Pommes und Salat',
            },
            {
                id: 'item-3',
                name: 'Putenschnitzel',
                description: 'mit Pommes frites, Salat und einer Sauce nach Wahl',
            },
            {
                id: 'item-4',
                name: 'Schawarma Döner Teller',
                description: 'mit Dönerfleisch, Pommes frites, Eisbergsalat, Zwiebeln, Weißkraut, Blaukraut, Tomaten und Gurken',
            },
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'side-dish wording in descriptions does not make non-vegetarian mains vegetarian',
        tag: buildTestTag('VEGETARIAN', 'tag-vegetarian'),
        items: [
            {
                id: 'item-1',
                name: 'Calamari',
                description: 'mit Pommes frites, Ketchup und Salat',
            },
            {
                id: 'item-2',
                name: '2 Arabische Schawarma',
                description: 'Pommes und Salat',
            },
            {
                id: 'item-3',
                name: 'Putenschnitzel',
                description: 'mit Pommes frites, Salat und einer Sauce nach Wahl',
            },
            {
                id: 'item-4',
                name: 'Schawarma Döner Teller',
                description: 'mit Dönerfleisch, Pommes frites, Eisbergsalat, Zwiebeln, Weißkraut, Blaukraut, Tomaten und Gurken',
            },
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'whitelisted side dishes in mixed titles do not make non-vegan mains vegan',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {
                id: 'item-1',
                name: '8 Knusprige Fischnuggets mit Pommes und Remulade',
                description: 'Knusprige Fischnuggets mit Pommes Frites und Remulade 8 Stück',
            },
            {
                id: 'item-2',
                name: 'Döner teller mit pommes und salat',
                description: '-',
            },
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
    {
        description: 'whitelisted side dishes in mixed titles do not make non-vegetarian mains vegetarian',
        tag: buildTestTag('VEGETARIAN', 'tag-vegetarian'),
        items: [
            {
                id: 'item-1',
                name: '8 Knusprige Fischnuggets mit Pommes und Remulade',
                description: 'Knusprige Fischnuggets mit Pommes Frites und Remulade 8 Stück',
            },
            {
                id: 'item-2',
                name: 'Döner teller mit pommes und salat',
                description: '-',
            },
        ],
        expectedMatchCount: 0,
        expectedMatchedItemIds: [],
    },
];

export const heuristicCoverageCases = [
    {
        description: 'dedupes identical menu rows when computing coverage stats',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Pommes', description: '-', categoryName: 'Sides'},
            {id: 'item-2', name: 'Pommes', description: '-', categoryName: 'Snacks'},
            {id: 'item-3', name: 'Vegan Salad', description: 'Fresh greens', categoryName: 'Salads'},
            {id: 'item-4', name: 'Beef Burger', description: 'Classic burger', categoryName: 'Mains'},
        ],
        expected: {
            matchedUniqueItems: 2,
            totalUniqueItems: 3,
            duplicateItemsFiltered: 1,
            matchedDuplicateItemsFiltered: 1,
            sharePercent: 67,
        },
    },
    {
        description: 'penalizes low-variety support on large menus',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Pommes', description: '-', categoryName: 'Sides'},
            {id: 'item-2', name: 'Vegan Salad', description: 'Fresh greens', categoryName: 'Salads'},
            {id: 'item-3', name: 'Beef Burger', description: 'Classic burger', categoryName: 'Mains'},
            {id: 'item-4', name: 'Chicken Wrap', description: 'Spicy', categoryName: 'Mains'},
            {id: 'item-5', name: 'Fish Tacos', description: 'Fresh fish', categoryName: 'Mains'},
            {id: 'item-6', name: 'Cheese Pizza', description: 'Mozzarella', categoryName: 'Pizza'},
            {id: 'item-7', name: 'Pork Ribs', description: 'BBQ', categoryName: 'Grill'},
            {id: 'item-8', name: 'Turkey Club', description: 'Bacon and turkey', categoryName: 'Sandwiches'},
            {id: 'item-9', name: 'Shrimp Pasta', description: 'Seafood', categoryName: 'Pasta'},
            {id: 'item-10', name: 'Steak Frites', description: 'Butter sauce', categoryName: 'Grill'},
        ],
        expected: {
            matchedUniqueItems: 2,
            totalUniqueItems: 10,
            score: 23,
            confidence: 'MEDIUM',
            varietyPercent: 33,
        },
    },
    {
        description: 'collapses size variants into one comparable choice for scoring and evidence',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: '6 Vegan Nuggets', description: '-', categoryName: 'Sides'},
            {id: 'item-2', name: '9 Vegan Nuggets', description: '-', categoryName: 'Sides'},
            {id: 'item-3', name: '20 Vegan Nuggets', description: '-', categoryName: 'Combos'},
            {id: 'item-4', name: 'Fries Small', description: '-', categoryName: 'Sides'},
            {id: 'item-5', name: 'Fries Large', description: '-', categoryName: 'Snacks'},
            {id: 'item-6', name: 'Beef Burger', description: 'Classic burger', categoryName: 'Mains'},
        ],
        expected: {
            matchedUniqueItems: 2,
            totalUniqueItems: 3,
            duplicateItemsFiltered: 3,
            matchedDuplicateItemsFiltered: 3,
            sharePercent: 67,
            varietyPercent: 33,
            dedupedMatchedNames: ['Vegan Nuggets', 'Fries'],
        },
    },
    {
        description: 'groups parenthesized quantities and menu variants into one comparable choice',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'King Nuggets\u00ae Plant-based (9 St\u00fcck)', description: '-', categoryName: 'Nuggets'},
            {id: 'item-2', name: 'Plant-based* Long Chicken', description: '-', categoryName: 'Burgers'},
            {id: 'item-3', name: 'King Nuggets\u00ae Plant-based (20 St\u00fcck)', description: '-', categoryName: 'Nuggets'},
            {id: 'item-4', name: 'Plant-based* Hamburger', description: '-', categoryName: 'Burgers'},
            {id: 'item-5', name: 'Plant-based* Long Chicken Men\u00fc', description: '-', categoryName: 'Menus'},
            {id: 'item-6', name: 'King Nuggets\u00ae Plant-based (6 St\u00fcck)', description: '-', categoryName: 'Nuggets'},
        ],
        expected: {
            matchedUniqueItems: 3,
            totalUniqueItems: 3,
            duplicateItemsFiltered: 3,
            matchedDuplicateItemsFiltered: 3,
            sharePercent: 100,
            varietyPercent: 50,
            dedupedMatchedNames: [
                'King Nuggets\u00ae Plant-based',
                'Plant-based* Long Chicken',
                'Plant-based* Hamburger',
            ],
        },
    },
    {
        description: 'groups size variants for fries while keeping distinct side families separate',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Curly Fries', description: '-', categoryName: 'Sides'},
            {id: 'item-2', name: 'McPlant\u00ae Nuggets', description: 'plant-based', categoryName: 'Sides'},
            {id: 'item-3', name: 'Pommes Frites Gro\u00df', description: '-', categoryName: 'Sides'},
            {id: 'item-4', name: 'Pommes Frites', description: '-', categoryName: 'Snacks'},
        ],
        expected: {
            matchedUniqueItems: 3,
            totalUniqueItems: 3,
            duplicateItemsFiltered: 1,
            matchedDuplicateItemsFiltered: 1,
            sharePercent: 100,
            varietyPercent: 50,
            dedupedMatchedNames: ['Curly Fries', 'McPlant\u00ae Nuggets', 'Pommes Frites'],
        },
    },
    {
        description: 'ignores drinks when building comparable menu counts',
        tag: buildTestTag('VEGAN', 'tag-vegan'),
        items: [
            {id: 'item-1', name: 'Vegan Burger', description: 'Plant-based patty', categoryName: 'Mains'},
            {id: 'item-2', name: 'Coca-Cola', description: '0.33l', categoryName: 'Drinks'},
            {id: 'item-3', name: 'Still Water', description: '0.5l', categoryName: 'Drinks'},
        ],
        expected: {
            matchedUniqueItems: 1,
            totalUniqueItems: 1,
            score: 71,
            confidence: 'MEDIUM',
            varietyPercent: 17,
        },
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
    expectedCurrent: '8.2.0',
};



