/**
 * Canonical default diet-tag seed data.
 *
 * This file is a **data definition only** — no DBAL or service logic.
 * It is consumed by DietTagService to seed/upsert the diet_tags table
 * and its associated child tables.
 */

export interface DefaultDietTag {
    key: string;
    label: string;
    keywordWhitelist: string[];
    dishWhitelist: string[];
    /**
     * Allergen tokens that disqualify a menu item from this diet.
     * Each token is matched case-insensitively against the item's allergen list.
     * E.g., "egg" in a VEGAN tag means items with egg allergens are not vegan.
     */
    allergenExclusions: string[];
}

export const DEFAULT_DIET_TAGS: readonly DefaultDietTag[] = [
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
