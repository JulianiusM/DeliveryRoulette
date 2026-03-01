/**
 * Lieferando HTML parsing module.
 *
 * Parses listing pages (restaurant discovery) and menu pages
 * using cheerio for DOM traversal. Designed for resilience:
 * missing elements degrade gracefully rather than failing.
 */
import * as cheerio from 'cheerio';
import type {AnyNode, Element} from 'domhandler';
import {
    DiscoveredRestaurant,
    ParsedMenu,
    ParsedMenuCategory,
    ParsedMenuItem,
} from './lieferandoTypes';

const BASE_URL = 'https://www.lieferando.de';
const RESTAURANT_PATH_SEGMENTS = ['menu', 'restaurant', 'chain'];

// Ã¢â€â‚¬Ã¢â€â‚¬ Listing page parsing Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/**
 * Parse a Lieferando listing page HTML to discover restaurants.
 *
 * Extraction strategy (ordered by priority):
 * 1. `data-qa="restaurant-card"` blocks and their primary restaurant links
 * 2. Global restaurant-like links (`/menu/`, `/restaurant/`, `/chain/`)
 * 3. Embedded JSON payloads (e.g. `__NEXT_DATA__`) as fallback
 *
 * @param html  Raw HTML string of the listing page
 * @param pageUrl  The URL used to fetch this page (for resolving relative URLs)
 * @returns Array of discovered restaurants, deduplicated by URL
 */
export function parseListingHtml(html: string, pageUrl?: string): DiscoveredRestaurant[] {
    const $ = cheerio.load(html);
    const seen = new Map<string, DiscoveredRestaurant>();

    extractFromNextDataListing($, pageUrl, seen);
    extractFromRestaurantCards($, pageUrl, seen);
    if (seen.size === 0) {
        extractFromGlobalLinks($, pageUrl, seen);
    }
    if (seen.size === 0) {
        extractFromEmbeddedJsonScripts($, pageUrl, seen);
    }

    return [...seen.values()];
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Menu page parsing Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/**
 * Parse a Lieferando restaurant menu page HTML.
 *
 * Uses a tiered approach:
 *   Tier 1: Look for JSON-LD or embedded preloaded state JSON
 *   Tier 2: HTML heuristics (headings + item blocks)
 *
 * Always produces rawText for diet heuristics.
 *
 * @param html  Raw HTML string of the menu page
 * @returns Parsed menu result with categories, rawText, and parseOk status
 */
export function parseMenuHtml(html: string): ParsedMenu {
    const $ = cheerio.load(html);
    const warnings: string[] = [];

    // Extract restaurant name (best-effort)
    const restaurantName = extractRestaurantName($);
    const restaurantDetails = extractRestaurantDetailsFromNextData($);

    // Tier 0: Parse Next.js preloaded menu payload (most complete source)
    let categories = tryNextDataMenu($);
    if (categories.length > 0) {
        const rawText = buildRawText(categories);
        return {restaurantName, restaurantDetails, categories, rawText, parseOk: true, warnings};
    }

    // Tier 1: Try JSON-LD
    categories = tryJsonLd($);
    if (categories.length > 0) {
        const rawText = buildRawText(categories);
        return {restaurantName, restaurantDetails, categories, rawText, parseOk: true, warnings};
    }

    // Tier 1b: Try embedded preloaded state
    categories = tryPreloadedState($);
    if (categories.length > 0) {
        const rawText = buildRawText(categories);
        return {restaurantName, restaurantDetails, categories, rawText, parseOk: true, warnings};
    }

    // Tier 2: HTML heuristics
    categories = parseMenuFromHtml($, warnings);
    const rawText = categories.length > 0
        ? buildRawText(categories)
        : extractBodyText($);

    return {
        restaurantName,
        restaurantDetails,
        categories,
        rawText,
        parseOk: categories.length > 0 && categories.some(c => c.items.length > 0),
        warnings,
    };
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Tier 1: JSON-LD parsing Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function tryJsonLd($: cheerio.CheerioAPI): ParsedMenuCategory[] {
    const categories: ParsedMenuCategory[] = [];

    $('script[type="application/ld+json"]').each((_i, el) => {
        try {
            const json = JSON.parse($(el).text());
            extractFromJsonLd(json, categories);
        } catch {
            // Ignore malformed JSON-LD
        }
    });

    return categories;
}

function extractFromJsonLd(obj: unknown, categories: ParsedMenuCategory[]): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
        for (const item of obj) {
            extractFromJsonLd(item, categories);
        }
        return;
    }

    const record = obj as Record<string, unknown>;

    // Look for Menu-like structures
    if (record.hasMenuSection && Array.isArray(record.hasMenuSection)) {
        for (const section of record.hasMenuSection) {
            const sec = section as Record<string, unknown>;
            const categoryName = String(sec.name || 'Menu');
            const items: ParsedMenuItem[] = [];

            if (sec.hasMenuItem && Array.isArray(sec.hasMenuItem)) {
                for (const mi of sec.hasMenuItem) {
                    const menuItem = mi as Record<string, unknown>;
                    items.push({
                        name: String(menuItem.name || ''),
                        description: menuItem.description ? String(menuItem.description) : null,
                        price: parseJsonLdPrice(menuItem.offers),
                        currency: parseJsonLdCurrency(menuItem.offers),
                    });
                }
            }

            if (items.length > 0) {
                categories.push({name: categoryName, items});
            }
        }
    }
}

function parseJsonLdPrice(offers: unknown): number | null {
    if (!offers || typeof offers !== 'object') return null;
    const o = offers as Record<string, unknown>;
    const price = Number(o.price);
    return isFinite(price) ? price : null;
}

function parseJsonLdCurrency(offers: unknown): string | null {
    if (!offers || typeof offers !== 'object') return null;
    const o = offers as Record<string, unknown>;
    return typeof o.priceCurrency === 'string' ? o.priceCurrency : null;
}

function tryNextDataMenu($: cheerio.CheerioAPI): ParsedMenuCategory[] {
    const nextDataJson = readNextDataJson($);
    if (!nextDataJson || typeof nextDataJson !== 'object') return [];

    const props = (nextDataJson as Record<string, unknown>).props as Record<string, unknown> | undefined;
    const appProps = props?.appProps as Record<string, unknown> | undefined;
    const preloadedState = appProps?.preloadedState as Record<string, unknown> | undefined;
    const menuState = preloadedState?.menu as Record<string, unknown> | undefined;
    const restaurantState = menuState?.restaurant as Record<string, unknown> | undefined;
    const cdn = restaurantState?.cdn as Record<string, unknown> | undefined;
    const restaurant = cdn?.restaurant as Record<string, unknown> | undefined;
    const menus = Array.isArray(restaurant?.menus) ? restaurant.menus : [];
    if (menus.length === 0) return [];

    const itemMap = buildNextDataItemMap(cdn);
    if (Object.keys(itemMap).length === 0) return [];

    const categories: ParsedMenuCategory[] = [];
    for (const rawMenu of menus) {
        if (!rawMenu || typeof rawMenu !== 'object') continue;
        const menuRecord = rawMenu as Record<string, unknown>;
        const rawCategories = Array.isArray(menuRecord.categories) ? menuRecord.categories : [];
        for (const rawCategory of rawCategories) {
            const parsed = parseNextDataCategory(rawCategory, itemMap);
            if (parsed && parsed.items.length > 0) {
                categories.push(parsed);
            }
        }
    }

    return categories;
}

function buildNextDataItemMap(cdn: Record<string, unknown> | undefined): Record<string, Record<string, unknown>> {
    if (!cdn) return {};

    const itemMap: Record<string, Record<string, unknown>> = {};

    const addItem = (item: unknown, fallbackId?: string): void => {
        if (!item || typeof item !== 'object') return;
        const itemRecord = item as Record<string, unknown>;
        const id = typeof itemRecord.id === 'string'
            ? itemRecord.id.trim()
            : (fallbackId?.trim() || '');
        if (!id) return;
        itemMap[id] = itemRecord;
    };

    const itemContainers = [cdn.items, cdn.menuItems, cdn.products, cdn.truncatedItems];
    for (const container of itemContainers) {
        if (!container || typeof container !== 'object') continue;

        if (Array.isArray(container)) {
            for (const rawItem of container) {
                addItem(rawItem);
            }
            continue;
        }

        for (const [key, value] of Object.entries(container)) {
            addItem(value, key);
        }
    }

    return itemMap;
}

function parseNextDataCategory(
    rawCategory: unknown,
    itemMap: Record<string, Record<string, unknown>>,
): ParsedMenuCategory | null {
    if (!rawCategory || typeof rawCategory !== 'object') return null;
    const categoryRecord = rawCategory as Record<string, unknown>;
    const categoryName = typeof categoryRecord.name === 'string' && categoryRecord.name.trim()
        ? categoryRecord.name.trim()
        : 'Menu';
    const categoryDescription = typeof categoryRecord.description === 'string' && categoryRecord.description.trim()
        ? categoryRecord.description.trim()
        : null;

    const items: ParsedMenuItem[] = [];
    const seenItemIds = new Set<string>();

    const itemIds = Array.isArray(categoryRecord.itemIds)
        ? categoryRecord.itemIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : [];

    for (const itemId of itemIds) {
        const resolved = resolveNextDataItem(itemId.trim(), itemMap);
        if (!resolved || seenItemIds.has(resolved.id)) continue;
        const parsedItem = parseNextDataItem(resolved.item, {
            categoryName,
            categoryDescription,
        });
        if (!parsedItem) continue;
        seenItemIds.add(resolved.id);
        items.push(parsedItem);
    }

    const embeddedItems = Array.isArray(categoryRecord.items) ? categoryRecord.items : [];
    for (const rawItem of embeddedItems) {
        const parsedItem = parseNextDataItem(rawItem, {
            categoryName,
            categoryDescription,
        });
        if (!parsedItem) continue;
        const uniqueKey = parsedItem.name.toLowerCase();
        if (seenItemIds.has(uniqueKey)) continue;
        seenItemIds.add(uniqueKey);
        items.push(parsedItem);
    }

    if (items.length === 0) return null;
    return {name: categoryName, items};
}

function resolveNextDataItem(
    itemId: string,
    itemMap: Record<string, Record<string, unknown>>,
): {id: string; item: Record<string, unknown>} | null {
    const direct = itemMap[itemId];
    if (direct) {
        return {id: itemId, item: direct};
    }

    const baseId = itemId.includes('|')
        ? itemId.split('|')[0]?.trim()
        : itemId;
    if (!baseId) return null;

    const baseItem = itemMap[baseId];
    if (baseItem) {
        return {id: baseId, item: baseItem};
    }

    const composedKey = Object.keys(itemMap).find((key) => key.startsWith(`${baseId}|`));
    if (!composedKey) return null;

    return {id: composedKey, item: itemMap[composedKey]};
}

function parseNextDataItem(
    rawItem: unknown,
    context?: {
        categoryName?: string | null;
        categoryDescription?: string | null;
    },
): ParsedMenuItem | null {
    if (!rawItem || typeof rawItem !== 'object') return null;
    const item = rawItem as Record<string, unknown>;

    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name) return null;

    const description = typeof item.description === 'string' && item.description.trim().length > 0
        ? item.description.trim()
        : null;

    const variations = Array.isArray(item.variations) ? item.variations : [];
    const firstVariation = variations.find((v): v is Record<string, unknown> => Boolean(v && typeof v === 'object')) ?? null;

    const price = firstFiniteNumber(
        firstVariation,
        ['basePrice', 'price', 'value', 'amount', 'displayPrice'],
    ) ?? firstFiniteNumber(item, ['basePrice', 'price', 'value', 'amount']);

    const variationCurrency = firstString(firstVariation ?? {}, ['currencyCode', 'currency', 'priceCurrency']);
    const itemCurrency = firstString(item, ['currencyCode', 'currency', 'priceCurrency']);
    const currency = normalizeCurrency(variationCurrency ?? itemCurrency ?? null);

    const allergens = extractAllergenValues([
        item.allergens,
        item.allergyInformation,
        item.allergenInformation,
        item.allergenLabel,
        firstVariation?.allergens,
        firstVariation?.allergyInformation,
        firstVariation?.allergenInformation,
    ]);
    const dietContext = buildNextDataDietContext(item, firstVariation, context, allergens);

    return {
        name,
        description,
        dietContext,
        allergens,
        price,
        currency,
    };
}

function buildNextDataDietContext(
    item: Record<string, unknown>,
    variation: Record<string, unknown> | null,
    context?: {
        categoryName?: string | null;
        categoryDescription?: string | null;
    },
    allergens?: string[] | null,
): string | null {
    const parts: string[] = [];

    if (context?.categoryName?.trim()) {
        parts.push(`category:${context.categoryName.trim()}`);
    }
    if (context?.categoryDescription?.trim()) {
        parts.push(`category-description:${context.categoryDescription.trim()}`);
    }

    const labelValues = extractLabelValues(item.labels);
    if (labelValues.length > 0) {
        parts.push(`labels:${labelValues.join(', ')}`);
    }

    const nutritionValues = extractStringValues(item.nutritionalInfo ?? item.energyContent);
    if (nutritionValues.length > 0) {
        parts.push(`nutrition:${nutritionValues.join(' | ')}`);
    }

    const itemProductInfo = extractStringValues(item.initialProductInformation);
    if (itemProductInfo.length > 0) {
        parts.push(`item-info:${itemProductInfo.join(' | ')}`);
    }

    const variationNutrition = extractStringValues(variation?.nutritionalInfo ?? null);
    if (variationNutrition.length > 0) {
        parts.push(`variation-nutrition:${variationNutrition.join(' | ')}`);
    }

    const variationProductInfo = extractStringValues(variation?.initialProductInformation ?? null);
    if (variationProductInfo.length > 0) {
        parts.push(`variation-info:${variationProductInfo.join(' | ')}`);
    }

    const variationRestrictions = extractStringValues(variation?.restrictions ?? item.restrictions);
    if (variationRestrictions.length > 0) {
        parts.push(`restrictions:${variationRestrictions.join(' | ')}`);
    }

    if (allergens && allergens.length > 0) {
        parts.push(`allergens:${allergens.join(' | ')}`);
    }

    if (parts.length === 0) return null;
    return parts.join('\n');
}

function extractLabelValues(rawLabels: unknown): string[] {
    if (!Array.isArray(rawLabels)) return [];

    return rawLabels
        .flatMap((label) => {
            if (typeof label === 'string') {
                return [label.trim()];
            }
            if (!label || typeof label !== 'object') {
                return [];
            }

            const record = label as Record<string, unknown>;
            return [
                firstString(record, ['label', 'name', 'text', 'value']) ?? '',
            ];
        })
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
}

function extractStringValues(value: unknown, depth = 0): string[] {
    if (depth > 6 || value == null) return [];

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? [trimmed] : [];
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return [String(value)];
    }

    if (Array.isArray(value)) {
        return value.flatMap((entry) => extractStringValues(entry, depth + 1));
    }

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return Object.values(record).flatMap((entry) => extractStringValues(entry, depth + 1));
    }

    return [];
}

function extractAllergenValues(sources: unknown[]): string[] | null {
    const values = sources
        .flatMap((source) => extractStringValues(source))
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    if (values.length === 0) return null;
    return dedupeCaseInsensitive(values);
}

function dedupeCaseInsensitive(values: string[]): string[] {
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const value of values) {
        const key = value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(value);
    }
    return deduped;
}

function firstFiniteNumber(record: Record<string, unknown> | null, keys: string[]): number | null {
    if (!record) return null;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string' && value.trim()) {
            const parsed = Number.parseFloat(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }
    return null;
}

function normalizeCurrency(value: string | null): string | null {
    if (!value) return 'EUR';

    const trimmed = value.trim();
    if (!trimmed) return 'EUR';
    if (trimmed === '€' || trimmed === 'â‚¬' || trimmed === 'Ã¢â€šÂ¬') return 'EUR';
    return trimmed.toUpperCase();
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Tier 1b: Preloaded state Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function tryPreloadedState($: cheerio.CheerioAPI): ParsedMenuCategory[] {
    const categories: ParsedMenuCategory[] = [];
    const patterns = ['__NEXT_DATA__', '__NUXT__', '__PRELOADED_STATE__'];

    $('script').each((_i, el) => {
        const text = $(el).text();
        for (const pattern of patterns) {
            if (text.includes(pattern)) {
                try {
                    // For __NEXT_DATA__ with type="application/json", parse the full text
                    const type = $(el).attr('type');
                    if (type === 'application/json') {
                        const json = JSON.parse(text);
                        searchForMenuData(json, categories, 0);
                    } else {
                        // Try to extract first top-level JSON object from assignment
                        const assignMatch = text.match(/=\s*(\{[\s\S]*\})\s*;?\s*$/);
                        if (assignMatch) {
                            const json = JSON.parse(assignMatch[1]);
                            searchForMenuData(json, categories, 0);
                        }
                    }
                } catch {
                    // Ignore parse errors
                }
            }
        }
    });

    return categories;
}

const MAX_JSON_SEARCH_DEPTH = 10;

function searchForMenuData(obj: unknown, categories: ParsedMenuCategory[], depth: number): void {
    if (depth > MAX_JSON_SEARCH_DEPTH || !obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
        // Check if this is an array of menu-like items
        if (obj.length > 0 && isMenuItemLike(obj[0])) {
            const items: ParsedMenuItem[] = obj
                .filter(isMenuItemLike)
                .map(item => ({
                    name: String(item.name),
                    description: item.description ? String(item.description) : null,
                    price: typeof item.price === 'number' ? item.price : null,
                    currency: typeof item.currency === 'string' ? item.currency : null,
                }));
            if (items.length > 0) {
                categories.push({name: 'Menu', items});
            }
            return;
        }
        for (const item of obj) {
            searchForMenuData(item, categories, depth + 1);
        }
        return;
    }

    const record = obj as Record<string, unknown>;
    for (const value of Object.values(record)) {
        searchForMenuData(value, categories, depth + 1);
    }
}

function isMenuItemLike(obj: unknown): obj is Record<string, unknown> {
    if (!obj || typeof obj !== 'object') return false;
    const record = obj as Record<string, unknown>;
    return typeof record.name === 'string' && record.name.length > 0;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Tier 2: HTML heuristics Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function parseMenuFromHtml($: cheerio.CheerioAPI, warnings: string[]): ParsedMenuCategory[] {
    // Strategy 1: Real Lieferando structure Ã¢â‚¬â€ data-qa="item-category" sections with data-qa="item" blocks
    const categorySections = $('[data-qa="item-category"]');
    if (categorySections.length > 0) {
        return parseRealLieferandoMenu($, categorySections, warnings);
    }

    // Strategy 2: Spec fixture structure Ã¢â‚¬â€ data-qa="menu-item" blocks grouped under headings
    const menuItems = $('[data-qa="menu-item"]');
    if (menuItems.length > 0) {
        return parseDataQaMenu($, menuItems, warnings);
    }

    // Strategy 3: Generic heading + item patterns
    return parseHeadingBasedMenu($, warnings);
}

/**
 * Parse the real Lieferando menu structure.
 *
 * Structure: `[data-qa="item-category"]` sections, each containing:
 *   - `h2[data-qa="heading"]` for category name
 *   - `[data-qa="item"]` blocks with:
 *     - `h3[data-qa="heading"]` for item name
 *     - `[data-qa="item-price"]` for price (contains `formatted-currency-style` spans)
 *     - `.list-item-content-style_item-description` or nested `[data-qa="text"]` for description
 */
function parseRealLieferandoMenu(
    $: cheerio.CheerioAPI,
    categorySections: cheerio.Cheerio<AnyNode>,
    warnings: string[],
): ParsedMenuCategory[] {
    const categories: ParsedMenuCategory[] = [];

    categorySections.each((_i, sectionEl) => {
        const $section = $(sectionEl);

        // Category name from the direct h2 child heading (not item h3 headings)
        const categoryHeading = $section.find('> h2[data-qa="heading"]').first();
        const categoryName = categoryHeading.text().trim()
            || $section.find('> h2').first().text().trim()
            || 'Menu';

        const items: ParsedMenuItem[] = [];
        $section.find('[data-qa="item"]').each((_j, itemEl) => {
            const $item = $(itemEl);

            // Item name is in h3[data-qa="heading"] inside the item
            const itemName = $item.find('h3[data-qa="heading"]').text().trim()
                || $item.find('[data-qa="heading"]').first().text().trim();
            if (!itemName || itemName === categoryName) return;

            // Price from data-qa="item-price" Ã¢â‚¬â€ may contain "from" prefix and &nbsp;
            const priceText = $item.find('[data-qa="item-price"]').text().trim();
            const {price, currency} = parsePrice(priceText);

            // Description from item-description class or second data-qa="text" element
            let description: string | null = null;
            const descEl = $item.find('[class*="item-description"]');
            if (descEl.length > 0) {
                description = descEl.text().trim() || null;
            }
            if (!description) {
                // Fallback: look for data-qa="item-desc"
                description = $item.find('[data-qa="item-desc"]').text().trim() || null;
            }

            items.push({name: itemName, description, price, currency});
        });

        if (items.length > 0) {
            categories.push({name: categoryName, items});
        }
    });

    if (categories.length === 0) {
        warnings.push(`Found ${categorySections.length} item-category sections but could not extract items`);
    }

    return categories;
}

function parseDataQaMenu(
    $: cheerio.CheerioAPI,
    menuItems: cheerio.Cheerio<AnyNode>,
    warnings: string[],
): ParsedMenuCategory[] {
    const categories: ParsedMenuCategory[] = [];
    let currentCategory: ParsedMenuCategory = {name: 'Menu', items: []};

    // Walk through the DOM in order, looking for headings and items
    const body = $('body');
    const allElements = body.find('h2, h3, [data-qa="menu-item"], [role="heading"]');

    allElements.each((_i, el) => {
        const $el = $(el);
        const tagName = (el as Element).tagName?.toLowerCase();
        const isHeading = tagName === 'h2' || tagName === 'h3' || $el.attr('role') === 'heading';

        if (isHeading) {
            const headingText = $el.text().trim();
            if (headingText) {
                // Save previous category if it has items
                if (currentCategory.items.length > 0) {
                    categories.push(currentCategory);
                }
                currentCategory = {name: headingText, items: []};
            }
        } else if ($el.attr('data-qa') === 'menu-item') {
            const item = parseMenuItem($, $el);
            if (item) {
                currentCategory.items.push(item);
            }
        }
    });

    // Don't forget the last category
    if (currentCategory.items.length > 0) {
        categories.push(currentCategory);
    }

    if (categories.length === 0 && menuItems.length > 0) {
        warnings.push(`Found ${menuItems.length} menu-item elements but could not extract item data`);
    }

    return categories;
}

function parseMenuItem($: cheerio.CheerioAPI, $el: cheerio.Cheerio<AnyNode>): ParsedMenuItem | null {
    const name = $el.find('[data-qa="item-name"]').text().trim()
        || $el.find('.item-name').text().trim()
        || $el.children().first().text().trim();

    if (!name) return null;

    const description = $el.find('[data-qa="item-desc"]').text().trim()
        || $el.find('.item-description').text().trim()
        || null;

    const priceText = $el.find('[data-qa="item-price"]').text().trim()
        || $el.find('.item-price').text().trim()
        || '';

    const {price, currency} = parsePrice(priceText);

    return {name, description: description || null, price, currency};
}

function parseHeadingBasedMenu($: cheerio.CheerioAPI, warnings: string[]): ParsedMenuCategory[] {
    const categories: ParsedMenuCategory[] = [];
    let currentCategory: ParsedMenuCategory = {name: 'Menu', items: []};

    // Look for headings followed by price-containing blocks
    $('h2, h3').each((_i, el) => {
        const headingText = $(el).text().trim();
        if (!headingText) return;

        if (currentCategory.items.length > 0) {
            categories.push(currentCategory);
        }
        currentCategory = {name: headingText, items: []};

        // Find sibling elements until next heading
        let sibling = $(el).next();
        while (sibling.length && !sibling.is('h2, h3')) {
            const text = sibling.text().trim();
            // Look for price pattern (e.g., "9,90 Ã¢â€šÂ¬" or "Ã¢â€šÂ¬9.90")
            if (/\d+[,.]\d{2}\s*â‚¬|â‚¬\s*\d+[,.]\d{2}/.test(text)) {
                const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                if (lines.length > 0) {
                    const name = lines[0];
                    const description = lines.length > 1 ? lines.slice(1, -1).join(' ') : null;
                    const priceLine = lines[lines.length - 1];
                    const {price, currency} = parsePrice(priceLine);
                    currentCategory.items.push({name, description: description || null, price, currency});
                }
            }
            sibling = sibling.next();
        }
    });

    if (currentCategory.items.length > 0) {
        categories.push(currentCategory);
    }

    if (categories.length === 0) {
        warnings.push('No menu items found using heading-based parsing');
    }

    return categories;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Utility functions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function extractRestaurantName($: cheerio.CheerioAPI): string | null {
    // Try h1 first (real Lieferando pages have a clean restaurant name in h1)
    const h1 = $('h1').first().text().trim();
    if (h1) return h1;

    // Try og:title meta
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
    if (ogTitle) return ogTitle;

    // Try <title> tag (strip common suffixes)
    const title = $('title').text().trim();
    if (title) {
        const cleaned = title
            .replace(/\s*[\|Ã¢â‚¬â€œ\-]\s*(Lieferando|Order online|Delivery).*$/i, '')
            .replace(/\s+Delivery\s*$/i, '')
            .trim();
        if (cleaned) return cleaned;
    }

    return null;
}

function parsePrice(text: string): {price: number | null; currency: string | null} {
    if (!text) return {price: null, currency: null};

    // Normalize whitespace (including &nbsp; / \u00a0) and strip "from" prefix
    const normalized = text.replace(/\s+/g, ' ').replace(/^from\s+/i, '').trim();

    // Match any decimal amount and assume EUR for Lieferando.
    const numericMatch = normalized.match(/(\d+)[,.](\d{2})/);
    if (numericMatch) {
        return {
            price: parseFloat(`${numericMatch[1]}.${numericMatch[2]}`),
            currency: 'EUR',
        };
    }

    return {price: null, currency: null};
}

function resolveUrl(href: string, pageUrl?: string): string {
    if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
    }
    const base = pageUrl || BASE_URL;
    try {
        return new URL(href, base).href;
    } catch {
        return `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
    }
}

function slugToName(href: string): string {
    const slug = extractRestaurantSlug(href);
    if (!slug) return 'Unknown Restaurant';
    return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function buildRawText(categories: ParsedMenuCategory[]): string {
    const parts: string[] = [];
    for (const cat of categories) {
        parts.push(cat.name);
        for (const item of cat.items) {
            parts.push(item.name);
            if (item.description) {
                parts.push(item.description);
            }
        }
    }
    return parts.join('\n');
}

function extractBodyText($: cheerio.CheerioAPI): string {
    // Remove script and style tags, then get text
    $('script, style').remove();
    return $('body').text().replace(/\s+/g, ' ').trim();
}

function extractFromNextDataListing(
    $: cheerio.CheerioAPI,
    pageUrl: string | undefined,
    seen: Map<string, DiscoveredRestaurant>,
): void {
    const nextDataJson = readNextDataJson($);
    if (!nextDataJson || typeof nextDataJson !== 'object') return;

    const props = (nextDataJson as Record<string, unknown>).props as Record<string, unknown> | undefined;
    const appProps = props?.appProps as Record<string, unknown> | undefined;
    const preloadedState = appProps?.preloadedState as Record<string, unknown> | undefined;
    const discovery = preloadedState?.discovery as Record<string, unknown> | undefined;
    const restaurantList = discovery?.restaurantList as Record<string, unknown> | undefined;
    const restaurantData = restaurantList?.restaurantData as Record<string, unknown> | undefined;
    if (!restaurantList || !restaurantData) return;

    const ids = coerceStringArray(restaurantList.filteredRestaurantIds)
        ?? coerceStringArray(restaurantList.restaurantIds)
        ?? Object.keys(restaurantData);

    const localePrefix = extractLocalePrefix(pageUrl);

    for (const id of ids) {
        const entry = restaurantData[id] as Record<string, unknown> | undefined;
        if (!entry || typeof entry !== 'object') continue;

        const href = listingHrefFromEntry(entry, localePrefix);
        if (!href) continue;

        const name = firstString(entry, ['name', 'displayName']) || slugToName(href);
        const location = entry.address as Record<string, unknown> | undefined;
        const address = typeof location?.firstLine === 'string' ? location.firstLine.trim() : null;
        const city = typeof location?.city === 'string' ? location.city.trim() : null;
        const postalCode = typeof location?.postalCode === 'string' ? location.postalCode.trim() : null;
        const cuisines = extractCuisineLabel(entry.cuisines);
        const openingHours = formatOpeningHours(entry.restaurantOpeningTimes ?? entry.availability ?? null);
        const openingDays = extractOpeningDays(entry.restaurantOpeningTimes ?? entry.availability ?? null);

        addDiscoveredRestaurant(
            seen,
            href,
            pageUrl,
            name,
            cuisines,
            {
                address,
                city,
                postalCode,
                country: 'DE',
                openingHours,
                openingDays,
            },
        );
    }
}

function extractFromRestaurantCards(
    $: cheerio.CheerioAPI,
    pageUrl: string | undefined,
    seen: Map<string, DiscoveredRestaurant>,
): void {
    $('[data-qa="restaurant-card"]').each((_i, cardEl) => {
        const $card = $(cardEl);
        const href = selectRestaurantHref($, $card);
        if (!href) return;

        const name = $card.find('[data-qa="restaurant-info-name"]').text().trim()
            || $card.find('[data-qa="restaurant-name"]').text().trim()
            || $card.find('a[href]').first().text().trim()
            || slugToName(href);

        const cuisines = $card.find('[data-qa="restaurant-cuisine"]').text().trim()
            || $card.find('[data-qa="cuisines"]').text().trim()
            || null;

        addDiscoveredRestaurant(seen, href, pageUrl, name, cuisines);
    });
}

function extractFromGlobalLinks(
    $: cheerio.CheerioAPI,
    pageUrl: string | undefined,
    seen: Map<string, DiscoveredRestaurant>,
): void {
    $('a[href]').each((_i, el) => {
        const href = $(el).attr('href');
        if (!href || !isLikelyRestaurantHref(href)) return;

        const name = $(el).find('[data-qa="restaurant-info-name"]').text().trim()
            || $(el).attr('title')?.trim()
            || $(el).text().trim()
            || slugToName(href);

        addDiscoveredRestaurant(seen, href, pageUrl, name, null);
    });
}

function extractFromEmbeddedJsonScripts(
    $: cheerio.CheerioAPI,
    pageUrl: string | undefined,
    seen: Map<string, DiscoveredRestaurant>,
): void {
    $('script').each((_i, el) => {
        const scriptText = $(el).html()?.trim() || '';
        if (!scriptText) return;
        if (!scriptText.includes('menu') && !scriptText.includes('restaurant') && !scriptText.includes('chain')) {
            return;
        }

        const parsed = parseLikelyJson(scriptText);
        if (parsed) {
            const candidates: Array<{name: string; url: string}> = [];
            collectRestaurantCandidates(parsed, candidates, 0);
            for (const candidate of candidates) {
                addDiscoveredRestaurant(seen, candidate.url, pageUrl, candidate.name, null);
            }
            if (candidates.length > 0) return;
        }

        const rawUrls = scriptText.match(/(?:https?:\/\/[^"'\s<>]+|\/(?:[a-z]{2}\/)?(?:menu|restaurant|chain)\/[^"'\s<>]+)/gi) || [];
        for (const rawUrl of rawUrls) {
            if (!isLikelyRestaurantHref(rawUrl)) continue;
            addDiscoveredRestaurant(seen, rawUrl, pageUrl, slugToName(rawUrl), null);
        }
    });
}

function selectRestaurantHref($: cheerio.CheerioAPI, $card: cheerio.Cheerio<AnyNode>): string | null {
    const anchors = $card.find('a[href]');
    if (anchors.length === 0) return null;

    const preferred = anchors
        .toArray()
        .map((el) => $(el).attr('href'))
        .find((href): href is string => Boolean(href && isLikelyRestaurantHref(href)));

    if (preferred) return preferred;
    return anchors.first().attr('href') || null;
}

function addDiscoveredRestaurant(
    seen: Map<string, DiscoveredRestaurant>,
    href: string,
    pageUrl: string | undefined,
    name: string,
    cuisines: string | null,
    details?: {
        address?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: string | null;
        openingHours?: string | null;
        openingDays?: string | null;
    },
): void {
    const absoluteUrl = resolveUrl(href, pageUrl);
    const existing = seen.get(absoluteUrl);
    if (existing) {
        seen.set(absoluteUrl, {
            ...existing,
            name: existing.name || name.trim() || slugToName(href),
            cuisines: existing.cuisines ?? cuisines,
            address: existing.address ?? details?.address ?? null,
            city: existing.city ?? details?.city ?? null,
            postalCode: existing.postalCode ?? details?.postalCode ?? null,
            country: existing.country ?? details?.country ?? null,
            openingHours: existing.openingHours ?? details?.openingHours ?? null,
            openingDays: existing.openingDays ?? details?.openingDays ?? null,
        });
        return;
    }

    seen.set(absoluteUrl, {
        name: name.trim() || slugToName(href),
        menuUrl: absoluteUrl,
        cuisines,
        address: details?.address ?? null,
        city: details?.city ?? null,
        postalCode: details?.postalCode ?? null,
        country: details?.country ?? null,
        openingHours: details?.openingHours ?? null,
        openingDays: details?.openingDays ?? null,
    });
}

function readNextDataJson($: cheerio.CheerioAPI): unknown | null {
    const nextDataRaw = $('#__NEXT_DATA__').html()?.trim();
    if (!nextDataRaw) return null;
    try {
        return JSON.parse(nextDataRaw);
    } catch {
        return null;
    }
}

function coerceStringArray(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;
    const result = value
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .map((v) => v.trim());
    return result.length > 0 ? result : null;
}

function extractLocalePrefix(pageUrl?: string): string {
    if (!pageUrl) return '/en';
    try {
        const pathSegments = new URL(pageUrl).pathname.split('/').filter(Boolean);
        if (pathSegments.length > 0 && /^[a-z]{2}$/i.test(pathSegments[0])) {
            return `/${pathSegments[0].toLowerCase()}`;
        }
    } catch {
        return '/en';
    }
    return '/en';
}

function listingHrefFromEntry(entry: Record<string, unknown>, localePrefix: string): string | null {
    const explicitUrl = firstString(entry, ['menuUrl', 'url', 'href', 'link', 'canonicalUrl']);
    if (explicitUrl && isLikelyRestaurantHref(explicitUrl)) {
        return explicitUrl;
    }

    const uniqueName = firstString(entry, ['uniqueName', 'seoName', 'slug']);
    if (uniqueName) {
        return `${localePrefix}/menu/${encodeURIComponent(uniqueName)}`;
    }
    return null;
}

function formatOpeningHours(openingData: unknown): string | null {
    if (!openingData) return null;

    const sections: string[] = [];

    if (Array.isArray(openingData)) {
        for (const service of openingData) {
            if (!service || typeof service !== 'object') continue;
            const serviceRecord = service as Record<string, unknown>;
            const serviceType = typeof serviceRecord.serviceType === 'string'
                ? serviceRecord.serviceType
                : 'service';
            const dayLines = formatDayRanges(serviceRecord.timesPerDay);
            if (dayLines.length > 0) {
                sections.push(`${serviceType}: ${dayLines.join('; ')}`);
            }
        }
    } else if (typeof openingData === 'object') {
        const availability = openingData as Record<string, unknown>;
        const serviceSections: string[] = [];

        for (const [serviceType, serviceInfo] of Object.entries(availability)) {
            if (!serviceInfo || typeof serviceInfo !== 'object') continue;
            const serviceRecord = serviceInfo as Record<string, unknown>;
            const isOpen = serviceRecord.isOpen === true ? 'open' : 'closed';
            const nextFrom = (serviceRecord.nextAvailability as Record<string, unknown> | undefined)?.from;
            const nextLabel = typeof nextFrom === 'string' ? `, next: ${nextFrom}` : '';
            serviceSections.push(`${serviceType}: ${isOpen}${nextLabel}`);
        }

        if (serviceSections.length > 0) {
            sections.push(serviceSections.join('; '));
        }
    }

    if (sections.length === 0) return null;
    return sections.join('\n');
}

function extractOpeningDays(openingData: unknown): string | null {
    if (!Array.isArray(openingData)) return null;

    const days = new Set<string>();
    for (const service of openingData) {
        if (!service || typeof service !== 'object') continue;
        const timesPerDay = (service as Record<string, unknown>).timesPerDay;
        if (!Array.isArray(timesPerDay)) continue;

        for (const day of timesPerDay) {
            if (!day || typeof day !== 'object') continue;
            const dayRecord = day as Record<string, unknown>;
            const times = dayRecord.times;
            if (!Array.isArray(times) || times.length === 0) continue;
            if (typeof dayRecord.dayOfWeek === 'string' && dayRecord.dayOfWeek.trim()) {
                days.add(dayRecord.dayOfWeek.trim());
            }
        }
    }

    if (days.size === 0) return null;
    return [...days].join(', ');
}

function formatDayRanges(timesPerDay: unknown): string[] {
    if (!Array.isArray(timesPerDay)) return [];

    const lines: string[] = [];
    for (const day of timesPerDay) {
        if (!day || typeof day !== 'object') continue;
        const dayRecord = day as Record<string, unknown>;
        const dayName = typeof dayRecord.dayOfWeek === 'string' ? dayRecord.dayOfWeek : null;
        if (!dayName) continue;

        const times = dayRecord.times;
        if (!Array.isArray(times) || times.length === 0) {
            lines.push(`${dayName} closed`);
            continue;
        }

        const ranges = times
            .filter((range): range is Record<string, unknown> => Boolean(range && typeof range === 'object'))
            .map((range) => {
                const from = typeof range.fromLocalTime === 'string' ? range.fromLocalTime : null;
                const to = typeof range.toLocalTime === 'string' ? range.toLocalTime : null;
                if (from && to) return `${from}-${to}`;
                return null;
            })
            .filter((range): range is string => Boolean(range));

        lines.push(`${dayName} ${ranges.length > 0 ? ranges.join(', ') : 'closed'}`);
    }

    return lines;
}

function extractCuisineLabel(cuisines: unknown): string | null {
    if (!Array.isArray(cuisines)) return null;
    const names = cuisines
        .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
        .map((c) => (typeof c.name === 'string' ? c.name.trim() : null))
        .filter((name): name is string => Boolean(name));
    return names.length > 0 ? names.join(', ') : null;
}

function isLikelyRestaurantHref(href: string): boolean {
    const normalized = href.toLowerCase();
    return RESTAURANT_PATH_SEGMENTS.some((segment) => normalized.includes(`/${segment}/`));
}

function parseLikelyJson(text: string): unknown | null {
    const trimmed = text.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return null;
        }
    }

    const assignMatch = trimmed.match(/=\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*;?\s*$/);
    if (assignMatch) {
        try {
            return JSON.parse(assignMatch[1]);
        } catch {
            return null;
        }
    }

    return null;
}

function extractRestaurantDetailsFromNextData($: cheerio.CheerioAPI): ParsedMenu['restaurantDetails'] {
    const nextDataJson = readNextDataJson($);
    if (!nextDataJson || typeof nextDataJson !== 'object') return null;

    const props = (nextDataJson as Record<string, unknown>).props as Record<string, unknown> | undefined;
    const appProps = props?.appProps as Record<string, unknown> | undefined;
    const preloadedState = appProps?.preloadedState as Record<string, unknown> | undefined;
    const menuState = preloadedState?.menu as Record<string, unknown> | undefined;
    const restaurantState = menuState?.restaurant as Record<string, unknown> | undefined;
    const cdn = restaurantState?.cdn as Record<string, unknown> | undefined;
    const restaurant = cdn?.restaurant as Record<string, unknown> | undefined;
    const details = restaurant?.restaurantInfo as Record<string, unknown> | undefined;
    if (!details) return null;

    const location = details.location as Record<string, unknown> | undefined;
    const address = typeof location?.address === 'string' ? location.address : null;
    const city = typeof location?.city === 'string' ? location.city : null;
    const postalCode = typeof location?.postCode === 'string' ? location.postCode : null;

    const openingTimes = details.restaurantOpeningTimes;
    const openingHours = formatOpeningHours(openingTimes);
    const openingDays = extractOpeningDays(openingTimes);

    if (!address && !city && !postalCode && !openingHours && !openingDays) {
        return null;
    }

    return {
        address,
        city,
        postalCode,
        country: 'DE',
        openingHours,
        openingDays,
    };
}

const MAX_LISTING_JSON_SEARCH_DEPTH = 12;

function collectRestaurantCandidates(
    obj: unknown,
    candidates: Array<{name: string; url: string}>,
    depth: number,
): void {
    if (depth > MAX_LISTING_JSON_SEARCH_DEPTH || !obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
        for (const item of obj) {
            collectRestaurantCandidates(item, candidates, depth + 1);
        }
        return;
    }

    const record = obj as Record<string, unknown>;
    const url = firstString(record, ['menuUrl', 'url', 'href', 'link', 'canonicalUrl']);
    if (url && isLikelyRestaurantHref(url)) {
        const name = firstString(record, ['name', 'displayName', 'restaurantName', 'title']) || slugToName(url);
        candidates.push({name, url});
    }

    for (const value of Object.values(record)) {
        collectRestaurantCandidates(value, candidates, depth + 1);
    }
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return null;
}

function extractRestaurantSlug(urlOrPath: string): string | null {
    const fromRegex = urlOrPath.match(/\/(?:menu|restaurant|chain)\/([^/?#]+)/i);
    if (fromRegex?.[1]) return decodeURIComponent(fromRegex[1]);

    try {
        const parsed = new URL(urlOrPath, BASE_URL);
        const segments = parsed.pathname.split('/').filter(Boolean);
        if (segments.length === 0) return null;

        for (let i = 0; i < segments.length - 1; i++) {
            if (RESTAURANT_PATH_SEGMENTS.includes(segments[i].toLowerCase())) {
                return decodeURIComponent(segments[i + 1]);
            }
        }
    } catch {
        return null;
    }

    return null;
}


