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
 *
 * Multi-language: All keywords, negative keywords, dish whitelists, strong
 * signals, contradiction patterns, and qualified negative exceptions include
 * both English and German terms (the two main languages on lieferando.de).
 * Additional languages can be added by extending the arrays.
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
            // EN
            'vegan', 'plant-based', 'plant based',
            'dairy-free', 'dairy free', 'without dairy', 'no dairy',
            'animal-free', 'animal free',
            // DE
            'pflanzlich', 'pflanzenbasiert', 'veganes', 'rein pflanzlich',
        ],
        dishWhitelist: [
            // EN
            'falafel', 'hummus', 'chana masala', 'aloo gobi',
            'fries', 'french fries',
            // DE
            'linseneintopf', 'kartoffelpuffer', 'pommes', 'fritten', 'gitterkartoffeln',
        ],
        allergenExclusions: [
            'egg', 'eggs', 'ei', 'eier',
            'milk', 'milch', 'dairy',
            'fish', 'fisch',
            'shellfish', 'crustaceans',
        ],
        negativeKeywords: [
            // EN
            'beef', 'chicken', 'pork', 'ham', 'bacon', 'fish', 'salmon', 'tuna',
            'shrimp', 'prawn', 'seafood', 'lamb', 'duck', 'turkey',
            'calamari', 'squid', 'doner', 'doener', 'shawarma', 'schawarma',
            'egg', 'eggs', 'cheese', 'milk', 'dairy', 'butter', 'cream',
            'yoghurt', 'yogurt', 'mayonnaise', 'mayo', 'honey',
            // DE
            'rind', 'rindfleisch', 'huhn', 'hähnchen', 'schwein', 'schweinefleisch',
            'speck', 'schinken', 'fisch', 'lachs', 'thunfisch',
            'garnelen', 'meeresfrüchte', 'lamm', 'ente', 'pute', 'truthahn',
            'ei', 'eier', 'käse', 'milch', 'sahne', 'butter', 'joghurt',
            'honig', 'quark',
        ],
        strongSignals: [
            'vegan', 'plant-based', 'plant based',
            'pflanzlich', 'pflanzenbasiert', 'rein pflanzlich',
        ],
        contradictionPatterns: [
            '\\b(contains|enthält) (dairy|milk|cheese|egg|eggs|milch|käse|ei|eier)\\b',
            '\\b(cheese|käse)\\b[^.!?]{0,40}\\b(contains|enthält)\\b[^.!?]{0,40}\\b(dairy|milk|milk products|milch|milchprodukte)\\b',
            '\\b(not|nicht|kein|keine) vegan\\b',
        ],
        qualifiedNegExceptions: [
            // EN
            'burger', 'patty', 'chicken', 'beef', 'pork', 'fish',
            'steak', 'nugget', 'nuggets', 'sausage', 'mince',
            'mayonnaise', 'mayo',
            // DE
            'huhn', 'hähnchen', 'rind', 'schwein', 'fisch',
            'schnitzel', 'wurst', 'bratwurst', 'hackfleisch',
            'soße', 'sosse',
        ],
    },
    {
        key: 'VEGETARIAN',
        label: 'Vegetarian',
        keywordWhitelist: [
            // EN
            'vegetarian', 'veggie', 'vegan', 'meat-free',
            'meat free', 'meatless', 'ovo-lacto', 'ovo lacto',
            // DE
            'vegetarisch', 'vegetarische', 'vegetarischer', 'vegetarisches',
            'fleischlos', 'ohne fleisch', 'fleischfrei',
        ],
        dishWhitelist: [
            // EN
            'margherita', 'caprese', 'palak paneer',
            'paneer tikka', 'egg fried rice',
            // DE
            'kartoffelpuffer', 'kaiserschmarrn',
            'käsespätzle', 'spinatknödel', 'gemüsestrudel',
        ],
        allergenExclusions: [
            'fish', 'fisch',
            'shellfish', 'crustaceans',
        ],
        negativeKeywords: [
            // EN
            'beef', 'chicken', 'pork', 'ham', 'bacon', 'fish', 'salmon', 'tuna',
            'shrimp', 'prawn', 'seafood', 'lamb', 'duck', 'turkey',
            'calamari', 'squid', 'doner', 'doener', 'shawarma', 'schawarma',
            // DE
            'rind', 'rindfleisch', 'huhn', 'hähnchen', 'schwein', 'schweinefleisch',
            'speck', 'schinken', 'fisch', 'lachs', 'thunfisch',
            'garnelen', 'meeresfrüchte', 'lamm', 'ente', 'pute', 'truthahn',
        ],
        strongSignals: [
            'vegetarian', 'veggie', 'meat-free', 'meat free',
            'vegetarisch', 'fleischlos', 'fleischfrei',
        ],
        contradictionPatterns: [
            '\\b(contains|enthält) (beef|chicken|pork|fish|seafood|rind|huhn|schwein|fisch)\\b',
            '\\b(not|nicht|kein|keine) vegetari(an|sch)\\b',
        ],
        qualifiedNegExceptions: [
            // EN
            'burger', 'patty', 'chicken', 'beef', 'pork', 'fish',
            'steak', 'nugget', 'nuggets', 'sausage', 'mince',
            // DE
            'huhn', 'hähnchen', 'rind', 'schwein', 'fisch',
            'schnitzel', 'wurst', 'bratwurst', 'hackfleisch',
        ],
    },
    {
        key: 'GLUTEN_FREE',
        label: 'Gluten-free',
        keywordWhitelist: [
            // EN
            'gluten-free', 'gluten free', 'gf', 'celiac',
            'coeliac', 'no gluten', 'without gluten',
            // DE
            'glutenfrei', 'ohne gluten', 'zöliakiefrei',
        ],
        dishWhitelist: [
            // EN
            'rice bowl', 'poke bowl', 'sashimi', 'quinoa salad',
            // DE
            'reispfanne', 'kartoffelsuppe',
        ],
        allergenExclusions: [
            'gluten', 'wheat', 'weizen',
            'barley', 'gerste',
            'rye', 'roggen',
        ],
        negativeKeywords: [
            // EN — only specific gluten-containing grains, not derived products
            // (rice noodles, GF bread etc. exist — use allergen exclusion for product-level detection)
            'wheat', 'barley', 'rye', 'breaded', 'breadcrumbs',
            // DE
            'weizen', 'gerste', 'roggen', 'paniert', 'semmelbrösel',
        ],
        strongSignals: [
            'gluten-free', 'gluten free', 'glutenfrei', 'ohne gluten',
        ],
        contradictionPatterns: [
            '\\b(contains|enthält) gluten\\b',
            '\\b(not|nicht|kein|keine) glutenfrei\\b',
            '\\bnot gluten[- ]?free\\b',
        ],
        qualifiedNegExceptions: [],
    },
    {
        key: 'LACTOSE_FREE',
        label: 'Lactose-free',
        keywordWhitelist: [
            // EN
            'lactose-free', 'lactose free', 'dairy-free',
            'dairy free', 'no dairy', 'no lactose',
            // DE
            'laktosefrei', 'ohne laktose', 'milchfrei', 'ohne milch',
        ],
        dishWhitelist: [
            // EN
            'sorbet', 'coconut curry', 'tom yum',
            // DE
            'fruchtsorbet',
        ],
        allergenExclusions: [
            'milk', 'milch', 'dairy',
            'lactose', 'laktose',
        ],
        negativeKeywords: [
            // EN
            'milk', 'dairy', 'cheese', 'cream', 'butter', 'yoghurt', 'yogurt',
            'whey', 'casein',
            // DE
            'milch', 'käse', 'sahne', 'butter', 'joghurt',
            'quark', 'molke',
        ],
        strongSignals: [
            'lactose-free', 'lactose free', 'dairy-free', 'dairy free',
            'laktosefrei', 'milchfrei', 'ohne laktose',
        ],
        contradictionPatterns: [
            '\\b(contains|enthält) (dairy|milk|cheese|cream|lactose|milch|käse|sahne|laktose)\\b',
            '\\b(cheese|käse)\\b[^.!?]{0,40}\\b(contains|enthält)\\b[^.!?]{0,40}\\b(dairy|milk|milk products|milch|milchprodukte|lactose|laktose)\\b',
            '\\b(not|nicht|kein|keine) laktosefrei\\b',
            '\\bnot lactose[- ]?free\\b',
        ],
        qualifiedNegExceptions: [],
    },
    {
        key: 'HALAL',
        label: 'Halal',
        keywordWhitelist: [
            'halal', 'halal certified',
            'halal-zertifiziert', 'halal zertifiziert',
        ],
        dishWhitelist: [
            // EN
            'shawarma', 'halal doner', 'beef kofta',
            // DE
            'halal doner',
        ],
        allergenExclusions: [
            'pork', 'schwein',
        ],
        negativeKeywords: [
            // EN
            'pork', 'ham', 'bacon', 'lard', 'gelatin',
            // DE
            'schwein', 'schweinefleisch', 'speck', 'schinken', 'schmalz', 'gelatine',
        ],
        strongSignals: [
            'halal',
        ],
        contradictionPatterns: [
            '\\b(not|nicht|kein|keine) halal\\b',
        ],
        qualifiedNegExceptions: [],
    },
];
