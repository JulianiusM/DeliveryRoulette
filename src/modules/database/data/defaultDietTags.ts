/**
 * Canonical default diet-tag seed data.
 *
 * This file is a **data definition only** — no DBAL or service logic.
 * It is consumed by DietTagService to seed/upsert the diet_tags table
 * and its associated child tables.
 *
 * All inference rules, keywords, signals, and exclusions are defined here
 * to keep the inference engine fully data-driven and agnostic to concrete
 * diet tag implementations.
 */

export interface DefaultDietTag {
    key: string;
    label: string;
    /** Key of the parent diet tag for subdiet inheritance (e.g. VEGAN inherits from VEGETARIAN). */
    parentTagKey?: string | null;
    keywordWhitelist: string[];
    dishWhitelist: string[];
    /**
     * Allergen tokens that disqualify a menu item from this diet.
     * Each token is matched case-insensitively against the item's allergen list.
     */
    allergenExclusions: string[];
    /** Negative keywords — if found in item text, penalize the match. */
    negativeKeywords: string[];
    /** Strong name signals — keywords that strongly indicate diet suitability when in item name. */
    strongSignals: string[];
    /** Contradiction patterns (regex strings) — if matched, item is contradicted. */
    contradictionPatterns: string[];
    /** Qualified negative exceptions — negative keywords to allow when a diet qualifier is present in the name. */
    qualifiedNegExceptions: string[];
}

export const DEFAULT_DIET_TAGS: readonly DefaultDietTag[] = [
    {
        key: 'VEGAN',
        label: 'Vegan',
        parentTagKey: 'VEGETARIAN',
        keywordWhitelist: [
            'vegan', 'plant-based', 'plant based', 'tofu',
            'tempeh', 'seitan', 'dairy-free', 'dairy free',
            'without dairy', 'no dairy', 'animal-free', 'animal free',
            'pflanzlich', 'pflanzenbasiert', 'veganes',
            'vegano', 'vegana', 'sin ingredientes animales',
        ],
        dishWhitelist: [
            'falafel', 'hummus', 'chana masala', 'aloo gobi',
            'tofu bowl', 'vegan sushi', 'vegetable ramen',
        ],
        allergenExclusions: [
            'egg', 'eggs', 'ei', 'eier',
            'milk', 'milch', 'dairy',
            'fish', 'fisch',
            'shellfish', 'crustaceans',
        ],
        negativeKeywords: [
            'beef', 'chicken', 'pork', 'ham', 'bacon', 'fish', 'salmon', 'tuna',
            'shrimp', 'egg', 'eggs', 'cheese', 'milk', 'dairy', 'butter', 'cream',
            'yoghurt', 'yogurt', 'mayonnaise', 'mayo', 'whopper',
            'rind', 'huhn', 'schwein', 'speck', 'fisch', 'ei', 'eier',
            'kase', 'milch', 'sahne', 'butter',
        ],
        strongSignals: [
            'vegan', 'plant-based', 'plant based', 'pflanzlich', 'pflanzenbasiert',
        ],
        contradictionPatterns: [
            '\\bcontains (dairy|milk|cheese|egg|eggs)\\b',
            '\\bnot vegan\\b',
        ],
        qualifiedNegExceptions: [
            'whopper', 'burger', 'patty', 'chicken', 'beef', 'pork', 'fish',
            'huhn', 'rind', 'schwein', 'fisch',
            'mayonnaise', 'mayo',
        ],
    },
    {
        key: 'VEGETARIAN',
        label: 'Vegetarian',
        keywordWhitelist: [
            'vegetarian', 'veggie', 'vegan', 'meat-free',
            'meat free', 'meatless', 'ovo-lacto', 'ovo lacto',
            'vegetarisch', 'vegetarische', 'vegetarischer', 'vegetarisches',
            'fleischlos', 'ohne fleisch', 'vegetariano', 'vegetariana', 'sin carne',
        ],
        dishWhitelist: [
            'margherita pizza', 'caprese', 'palak paneer',
            'paneer tikka', 'vegetable spring rolls', 'egg fried rice',
        ],
        allergenExclusions: [
            'fish', 'fisch',
            'shellfish', 'crustaceans',
        ],
        negativeKeywords: [
            'beef', 'chicken', 'pork', 'ham', 'bacon', 'fish', 'salmon', 'tuna',
            'shrimp', 'seafood', 'whopper',
            'rind', 'huhn', 'schwein', 'speck', 'fisch', 'garnelen',
        ],
        strongSignals: [
            'vegetarian', 'veggie', 'vegetarisch', 'fleischlos', 'meat-free', 'meat free',
        ],
        contradictionPatterns: [
            '\\bcontains (beef|chicken|pork|fish|seafood)\\b',
            '\\bnot vegetarian\\b',
        ],
        qualifiedNegExceptions: [
            'whopper', 'burger', 'patty', 'chicken', 'beef', 'pork', 'fish',
            'huhn', 'rind', 'schwein', 'fisch',
        ],
    },
    {
        key: 'GLUTEN_FREE',
        label: 'Gluten-free',
        keywordWhitelist: [
            'gluten-free', 'gluten free', 'gf', 'celiac',
            'coeliac', 'no gluten',
            'glutenfrei', 'ohne gluten', 'sin gluten', 'sans gluten',
        ],
        dishWhitelist: [
            'corn tortilla tacos', 'rice bowl', 'poke bowl',
            'sashimi', 'quinoa salad',
        ],
        allergenExclusions: [
            'gluten', 'wheat', 'weizen',
            'barley', 'gerste',
            'rye', 'roggen',
        ],
        negativeKeywords: [
            'wheat', 'barley', 'rye', 'breaded', 'breadcrumbs',
            'weizen', 'gerste', 'roggen',
        ],
        strongSignals: [
            'gluten-free', 'gluten free', 'glutenfrei', 'ohne gluten',
        ],
        contradictionPatterns: [
            '\\bcontains gluten\\b',
            '\\bnot gluten[- ]?free\\b',
        ],
        qualifiedNegExceptions: [],
    },
    {
        key: 'LACTOSE_FREE',
        label: 'Lactose-free',
        keywordWhitelist: [
            'lactose-free', 'lactose free', 'dairy-free',
            'dairy free', 'no dairy', 'no lactose',
            'laktosefrei', 'ohne laktose', 'milchfrei', 'sin lactosa', 'sans lactose',
        ],
        dishWhitelist: [
            'sorbet', 'coconut curry', 'tom yum',
            'olive oil pasta', 'oat milk latte',
        ],
        allergenExclusions: [
            'milk', 'milch', 'dairy',
            'lactose', 'laktose',
        ],
        negativeKeywords: [
            'milk', 'dairy', 'cheese', 'cream', 'butter', 'yoghurt', 'yogurt',
            'milch', 'kase', 'sahne', 'butter', 'joghurt',
        ],
        strongSignals: [
            'lactose-free', 'lactose free', 'laktosefrei', 'milchfrei', 'dairy-free', 'dairy free',
        ],
        contradictionPatterns: [
            '\\bcontains (dairy|milk|cheese|cream|lactose)\\b',
            '\\bnot lactose[- ]?free\\b',
        ],
        qualifiedNegExceptions: [],
    },
    {
        key: 'HALAL',
        label: 'Halal',
        keywordWhitelist: [
            'halal', 'halal certified', 'halal-zertifiziert', 'halal zertifiziert',
        ],
        dishWhitelist: [
            'chicken biryani', 'shawarma', 'halal doner', 'beef kofta',
        ],
        allergenExclusions: [
            'pork', 'schwein',
        ],
        negativeKeywords: [
            'pork', 'ham', 'bacon',
            'schwein', 'speck', 'schinken',
        ],
        strongSignals: [
            'halal',
        ],
        contradictionPatterns: [
            '\\bnot halal\\b',
        ],
        qualifiedNegExceptions: [],
    },
];
