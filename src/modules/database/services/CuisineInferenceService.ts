import {Restaurant} from '../entities/restaurant/Restaurant';
import * as restaurantService from './RestaurantService';
import {AppDataSource} from '../dataSource';
import {MenuCategory} from '../entities/menu/MenuCategory';

export const CUISINE_ENGINE_VERSION = '1.0.0';

export type CuisineConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CuisineInferenceEntry {
    key: string;
    label: string;
    score: number;
    confidence: CuisineConfidence;
    source: 'provider' | 'heuristic';
    evidence: {
        matchedKeywords: string[];
        matchedDishes: string[];
        providerHits: string[];
        ratioScore: number;
        confidenceMultiplier: number;
    };
}

export interface CuisineInferenceProfile {
    engineVersion: string;
    inferredAt: string;
    providerCuisines: string[];
    cuisines: CuisineInferenceEntry[];
}

interface InferenceMenuItem {
    id: string;
    name: string;
    description?: string | null;
    dietContext?: string | null;
    categoryName?: string | null;
}

interface CuisineDefinition {
    key: string;
    label: string;
    aliases: string[];
    keywords: string[];
    dishes: string[];
}

const CUISINE_DEFINITIONS: CuisineDefinition[] = [
    {
        key: 'INDIAN',
        label: 'Indian',
        aliases: ['indian', 'indisch', 'hindustani'],
        keywords: ['masala', 'tandoori', 'biryani', 'naan', 'paneer', 'dal', 'curry'],
        dishes: ['chicken tikka masala', 'palak paneer', 'chana masala', 'dal makhani', 'samosa'],
    },
    {
        key: 'CHINESE',
        label: 'Chinese',
        aliases: ['chinese', 'chinesisch'],
        keywords: ['szechuan', 'sichuan', 'dim sum', 'wok', 'fried rice', 'chow mein'],
        dishes: ['mapo tofu', 'kung pao chicken', 'sweet and sour', 'dumplings', 'hot pot'],
    },
    {
        key: 'JAPANESE',
        label: 'Japanese',
        aliases: ['japanese', 'japanisch'],
        keywords: ['sushi', 'ramen', 'udon', 'miso', 'tempura', 'teriyaki'],
        dishes: ['sashimi', 'tonkotsu ramen', 'yakitori', 'okonomiyaki', 'maki roll'],
    },
    {
        key: 'KOREAN',
        label: 'Korean',
        aliases: ['korean', 'koreanisch'],
        keywords: ['kimchi', 'gochujang', 'bibimbap', 'bulgogi', 'tteokbokki'],
        dishes: ['japchae', 'kimchi fried rice', 'korean fried chicken', 'samgyeopsal'],
    },
    {
        key: 'THAI',
        label: 'Thai',
        aliases: ['thai', 'thailandisch'],
        keywords: ['pad thai', 'tom yum', 'green curry', 'massaman', 'satay'],
        dishes: ['pad kra pao', 'som tam', 'tom kha', 'red curry'],
    },
    {
        key: 'VIETNAMESE',
        label: 'Vietnamese',
        aliases: ['vietnamese', 'vietnamesisch'],
        keywords: ['pho', 'banh mi', 'bun', 'nuoc cham', 'lemongrass'],
        dishes: ['pho bo', 'banh xeo', 'bun cha', 'goi cuon'],
    },
    {
        key: 'AFRICAN',
        label: 'African',
        aliases: ['african', 'afrikanisch', 'west african', 'east african', 'north african'],
        keywords: ['injera', 'jollof', 'tagine', 'suya', 'berbere', 'harissa'],
        dishes: ['jollof rice', 'ethiopian platter', 'lamb tagine', 'couscous royal'],
    },
    {
        key: 'SOUTH_AMERICAN',
        label: 'South American',
        aliases: ['south american', 'sudamerikanisch', 'latin american', 'latino', 'peruvian', 'argentinian', 'brazilian'],
        keywords: ['ceviche', 'chimichurri', 'arepa', 'empanada', 'feijoada', 'lomo saltado'],
        dishes: ['ceviche mixto', 'pao de queijo', 'asado', 'arroz chaufa'],
    },
    {
        key: 'MEXICAN',
        label: 'Mexican',
        aliases: ['mexican', 'mexikanisch'],
        keywords: ['taco', 'quesadilla', 'burrito', 'enchilada', 'guacamole', 'salsa roja'],
        dishes: ['al pastor tacos', 'chilaquiles', 'pozole', 'mole poblano'],
    },
    {
        key: 'MIDDLE_EASTERN',
        label: 'Middle Eastern',
        aliases: ['middle eastern', 'nahost', 'arabic', 'levantine', 'oriental'],
        keywords: ['shawarma', 'falafel', 'hummus', 'kebab', 'tabbouleh', 'zaatar'],
        dishes: ['shawarma plate', 'mixed mezze', 'manakish', 'kofta'],
    },
    {
        key: 'TURKISH',
        label: 'Turkish',
        aliases: ['turkish', 'turkisch'],
        keywords: ['doner', 'iskender', 'lahmacun', 'pide', 'kofte'],
        dishes: ['adana kebab', 'mercimek corbasi', 'borek', 'baklava'],
    },
    {
        key: 'ITALIAN',
        label: 'Italian',
        aliases: ['italian', 'italienisch'],
        keywords: ['pasta', 'risotto', 'pizza', 'gnocchi', 'lasagna', 'antipasti'],
        dishes: ['margherita pizza', 'spaghetti carbonara', 'osso buco', 'tiramisu'],
    },
];

const CUISINE_BY_KEY = new Map(CUISINE_DEFINITIONS.map((definition) => [definition.key, definition]));
const CUISINE_ALIAS_MAP = buildCuisineAliasMap();

export async function recomputeForRestaurant(restaurantId: string): Promise<CuisineInferenceProfile | null> {
    const restaurant = await restaurantService.getRestaurantById(restaurantId);
    if (!restaurant) return null;

    const menuItems = await getActiveMenuItemsForCuisine(restaurantId);
    const providerCuisines = (restaurant.providerCuisines ?? []).map((c) => c.value);
    const profile = inferCuisineProfile({
        restaurantName: restaurant.name,
        providerCuisines,
        menuItems,
    });

    await restaurantService.updateRestaurant(restaurantId, {
        cuisineInferenceJson: JSON.stringify(profile),
    });

    return profile;
}

export function inferCuisineProfile(input: {
    restaurantName: string;
    providerCuisines?: string[];
    menuItems: InferenceMenuItem[];
}): CuisineInferenceProfile {
    const providerCuisines = normalizeCuisineList(input.providerCuisines ?? []);
    const providerCuisineKeys = new Set(providerCuisines.map((entry) => canonicalCuisineKey(entry)).filter(Boolean) as string[]);
    const providerHitsByKey = new Map<string, string[]>();

    for (const providerCuisine of providerCuisines) {
        const canonical = canonicalCuisineKey(providerCuisine);
        if (!canonical) continue;
        const hits = providerHitsByKey.get(canonical) ?? [];
        hits.push(providerCuisine);
        providerHitsByKey.set(canonical, hits);
    }

    const normalizedRestaurantName = normalizeText(input.restaurantName);
    const corpus = normalizeText([
        input.restaurantName,
        ...input.menuItems.map((item) => [
            item.categoryName ?? '',
            item.name,
            item.description ?? '',
            item.dietContext ?? '',
        ].join(' ')),
    ].join(' '));

    const cuisines: CuisineInferenceEntry[] = [];

    for (const definition of CUISINE_DEFINITIONS) {
        const providerHits = providerHitsByKey.get(definition.key) ?? [];
        if (providerCuisineKeys.has(definition.key)) {
            cuisines.push({
                key: definition.key,
                label: definition.label,
                score: 100,
                confidence: 'HIGH',
                source: 'provider',
                evidence: {
                    matchedKeywords: [],
                    matchedDishes: [],
                    providerHits,
                    ratioScore: 100,
                    confidenceMultiplier: 1,
                },
            });
            continue;
        }

        const matchedKeywords = findHits(corpus, definition.keywords);
        const matchedDishes = findHits(corpus, definition.dishes);
        const aliasHitsInName = findHits(normalizedRestaurantName, definition.aliases);
        const evidenceHitCount = matchedKeywords.length + (matchedDishes.length * 2) + (aliasHitsInName.length * 2);
        if (evidenceHitCount === 0) {
            continue;
        }

        const menuSize = Math.max(1, input.menuItems.length);
        const ratioScore = Math.min(100, Math.round((evidenceHitCount / Math.max(menuSize, 3)) * 100));
        const rawScore = Math.min(
            96,
            Math.round(
                (matchedKeywords.length * 11)
                + (matchedDishes.length * 15)
                + (aliasHitsInName.length * 18)
                + (ratioScore * 0.2),
            ),
        );
        const confidence: CuisineConfidence = rawScore >= 75 || aliasHitsInName.length > 0
            ? 'HIGH'
            : rawScore >= 45
                ? 'MEDIUM'
                : 'LOW';
        const confidenceMultiplier = confidence === 'HIGH'
            ? 1
            : confidence === 'MEDIUM'
                ? 0.9
                : 0.8;
        const score = Math.max(0, Math.min(100, Math.round(rawScore * confidenceMultiplier)));
        if (score < 25) {
            continue;
        }

        cuisines.push({
            key: definition.key,
            label: definition.label,
            score,
            confidence,
            source: 'heuristic',
            evidence: {
                matchedKeywords: mergeUnique([...matchedKeywords, ...aliasHitsInName]),
                matchedDishes,
                providerHits: [],
                ratioScore,
                confidenceMultiplier,
            },
        });
    }

    cuisines.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

    return {
        engineVersion: CUISINE_ENGINE_VERSION,
        inferredAt: new Date().toISOString(),
        providerCuisines,
        cuisines,
    };
}

export function parseCuisineInference(raw: string | null | undefined): CuisineInferenceProfile | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as CuisineInferenceProfile;
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.cuisines)) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function parseProviderCuisineList(raw: string | null | undefined): string[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return normalizeCuisineList(parsed.filter((entry): entry is string => typeof entry === 'string'));
    } catch {
        return [];
    }
}

export function getRestaurantCuisineTokens(restaurant: Pick<Restaurant, 'providerCuisines' | 'cuisineInferenceJson'>): Set<string> {
    const tokens = new Set<string>();
    const providerCuisines = (restaurant.providerCuisines ?? []).map((c) => c.value);
    const profile = parseCuisineInference(restaurant.cuisineInferenceJson);

    for (const cuisine of providerCuisines) {
        addCuisineToken(tokens, cuisine);
    }

    if (profile) {
        for (const inferred of profile.cuisines) {
            addCuisineToken(tokens, inferred.key);
            addCuisineToken(tokens, inferred.label);
            const definition = CUISINE_BY_KEY.get(inferred.key);
            if (definition) {
                for (const alias of definition.aliases) {
                    addCuisineToken(tokens, alias);
                }
            }
        }
    }

    return tokens;
}

export function matchesCuisineFilter(tokens: Set<string>, rawQuery: string): boolean {
    const normalizedQuery = normalizeCuisineToken(rawQuery);
    if (!normalizedQuery) return false;

    const canonical = canonicalCuisineKey(normalizedQuery);
    if (canonical) {
        const definition = CUISINE_BY_KEY.get(canonical);
        if (!definition) return false;
        return definition.aliases.some((alias) => tokens.has(normalizeCuisineToken(alias)))
            || tokens.has(normalizeCuisineToken(canonical))
            || tokens.has(normalizeCuisineToken(definition.label));
    }

    if (tokens.has(normalizedQuery)) {
        return true;
    }

    return [...tokens].some((token) => token.includes(normalizedQuery) || normalizedQuery.includes(token));
}

function buildCuisineAliasMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const definition of CUISINE_DEFINITIONS) {
        map.set(normalizeCuisineToken(definition.key), definition.key);
        map.set(normalizeCuisineToken(definition.label), definition.key);
        for (const alias of definition.aliases) {
            map.set(normalizeCuisineToken(alias), definition.key);
        }
    }
    return map;
}

function canonicalCuisineKey(raw: string): string | null {
    const normalized = normalizeCuisineToken(raw);
    if (!normalized) return null;
    return CUISINE_ALIAS_MAP.get(normalized) ?? null;
}

function normalizeCuisineToken(value: string): string {
    return normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim();
}

function addCuisineToken(tokens: Set<string>, value: string): void {
    const normalized = normalizeCuisineToken(value);
    if (!normalized) return;
    tokens.add(normalized);
}

function normalizeCuisineList(values: string[]): string[] {
    const normalized = values
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    return mergeUnique(normalized);
}

function mergeUnique(values: string[]): string[] {
    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const value of values) {
        const key = normalizeCuisineToken(value);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(value);
    }
    return deduped;
}

function findHits(text: string, candidates: string[]): string[] {
    return candidates.filter((candidate) => {
        const normalized = normalizeText(candidate);
        if (!normalized) return false;
        const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
    });
}

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function getActiveMenuItemsForCuisine(restaurantId: string): Promise<InferenceMenuItem[]> {
    const catRepo = AppDataSource.getRepository(MenuCategory);
    const categories = await catRepo.find({
        where: {restaurantId, isActive: true},
        relations: ['items'],
    });

    const items: InferenceMenuItem[] = [];
    for (const category of categories) {
        for (const item of category.items) {
            if (!item.isActive) continue;
            items.push({
                id: item.id,
                name: item.name,
                description: item.description ?? null,
                dietContext: item.dietContext ?? null,
                categoryName: category.name,
            });
        }
    }
    return items;
}
