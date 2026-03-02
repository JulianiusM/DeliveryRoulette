/**
 * Test data for DietTag seed tests
 */

export const EXPECTED_DIET_TAGS = [
    {
        key: 'VEGAN',
        label: 'Vegan',
        keywordWhitelist: [
            'vegan',
            'pflanzlich',
            'plant based',
            'vegano',
            'vegana',
            'sin ingredientes animales',
        ],
        dishWhitelist: [
            'falafel',
            'hummus',
            'tofu bowl',
            'chana masala',
            'dal tadka',
            'aloo gobi',
            'veggie sushi roll',
            'vegetable ramen',
        ],
        allergenExclusions: [
            'egg', 'eggs', 'ei', 'eier',
            'milk', 'milch', 'dairy',
            'fish', 'fisch',
            'shellfish', 'crustaceans',
        ],
    },
    {
        key: 'VEGETARIAN',
        label: 'Vegetarian',
        keywordWhitelist: [
            'vegetarian',
            'vegetarisch',
            'sin carne',
            'vegetariano',
            'ovo lacto',
            'meat free',
        ],
        dishWhitelist: [
            'margherita pizza',
            'caprese salad',
            'palak paneer',
            'paneer tikka',
            'vegetable spring rolls',
            'egg fried rice',
            'miso soup',
        ],
        allergenExclusions: [
            'fish', 'fisch',
            'shellfish', 'crustaceans',
        ],
    },
    {
        key: 'GLUTEN_FREE',
        label: 'Gluten-free',
        keywordWhitelist: [
            'gluten free',
            'glutenfrei',
            'sin gluten',
            'sans gluten',
            'celiac safe',
        ],
        dishWhitelist: [
            'corn tortilla tacos',
            'rice bowl',
            'poke bowl',
            'sashimi',
            'dal chawal',
            'quinoa salad',
        ],
        allergenExclusions: [
            'gluten', 'wheat', 'weizen',
            'barley', 'gerste',
            'rye', 'roggen',
        ],
    },
    {
        key: 'LACTOSE_FREE',
        label: 'Lactose-free',
        keywordWhitelist: [
            'lactose free',
            'laktosefrei',
            'dairy free',
            'sin lactosa',
            'sans lactose',
        ],
        dishWhitelist: [
            'sorbet',
            'coconut curry',
            'tom yum soup',
            'olive oil pasta',
            'avocado salad',
            'oat milk latte',
        ],
        allergenExclusions: [
            'milk', 'milch', 'dairy',
            'lactose', 'laktose',
        ],
    },
    {
        key: 'HALAL',
        label: 'Halal',
        keywordWhitelist: [
            'halal',
            'halal certified',
            'halal zertifiziert',
            '100 halal',
        ],
        dishWhitelist: [
            'chicken biryani',
            'butter chicken halal',
            'doner kebab halal',
            'shawarma',
            'lamb tagine',
            'beef kofta',
        ],
        allergenExclusions: [
            'pork', 'schwein',
        ],
    },
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
