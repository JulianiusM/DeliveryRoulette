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

// ── Listing page parsing ──────────────────────────────────────

/**
 * Parse a Lieferando listing page HTML to discover restaurants.
 *
 * Extraction strategy (ordered by priority):
 * 1. Links with href containing `/menu/` (primary signal)
 * 2. data-qa="restaurant-name" attributes (structured pages)
 *
 * @param html  Raw HTML string of the listing page
 * @param pageUrl  The URL used to fetch this page (for resolving relative URLs)
 * @returns Array of discovered restaurants, deduplicated by URL
 */
export function parseListingHtml(html: string, pageUrl?: string): DiscoveredRestaurant[] {
    const $ = cheerio.load(html);
    const seen = new Map<string, DiscoveredRestaurant>();

    // Strategy: find all anchors whose href contains /menu/
    $('a[href*="/menu/"]').each((_i, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        const absoluteUrl = resolveUrl(href, pageUrl);
        if (seen.has(absoluteUrl)) return;

        const card = $(el).closest('[data-qa="restaurant-card"]');

        // Determine restaurant name (real Lieferando uses restaurant-info-name; spec uses restaurant-name)
        let name = card.find('[data-qa="restaurant-info-name"]').text().trim()
            || card.find('[data-qa="restaurant-name"]').text().trim()
            || $(el).text().trim();

        if (!name) {
            // Fallback: extract from URL slug
            name = slugToName(href);
        }

        // Optional: extract cuisines (real Lieferando uses restaurant-cuisine; spec uses cuisines)
        const cuisines = card.find('[data-qa="restaurant-cuisine"]').text().trim()
            || card.find('[data-qa="cuisines"]').text().trim()
            || null;

        seen.set(absoluteUrl, {
            name,
            menuUrl: absoluteUrl,
            cuisines,
        });
    });

    return [...seen.values()];
}

// ── Menu page parsing ─────────────────────────────────────────

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

    // Tier 1: Try JSON-LD
    let categories = tryJsonLd($);
    if (categories.length > 0) {
        const rawText = buildRawText(categories);
        return {restaurantName, categories, rawText, parseOk: true, warnings};
    }

    // Tier 1b: Try embedded preloaded state
    categories = tryPreloadedState($);
    if (categories.length > 0) {
        const rawText = buildRawText(categories);
        return {restaurantName, categories, rawText, parseOk: true, warnings};
    }

    // Tier 2: HTML heuristics
    categories = parseMenuFromHtml($, warnings);
    const rawText = categories.length > 0
        ? buildRawText(categories)
        : extractBodyText($);

    return {
        restaurantName,
        categories,
        rawText,
        parseOk: categories.length > 0 && categories.some(c => c.items.length > 0),
        warnings,
    };
}

// ── Tier 1: JSON-LD parsing ───────────────────────────────────

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

// ── Tier 1b: Preloaded state ──────────────────────────────────

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

// ── Tier 2: HTML heuristics ───────────────────────────────────

function parseMenuFromHtml($: cheerio.CheerioAPI, warnings: string[]): ParsedMenuCategory[] {
    // Strategy 1: Real Lieferando structure — data-qa="item-category" sections with data-qa="item" blocks
    const categorySections = $('[data-qa="item-category"]');
    if (categorySections.length > 0) {
        return parseRealLieferandoMenu($, categorySections, warnings);
    }

    // Strategy 2: Spec fixture structure — data-qa="menu-item" blocks grouped under headings
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

            // Price from data-qa="item-price" — may contain "from" prefix and &nbsp;
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
            // Look for price pattern (e.g., "9,90 €" or "€9.90")
            if (/\d+[,\.]\d{2}\s*€|€\s*\d+[,\.]\d{2}/.test(text)) {
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

// ── Utility functions ─────────────────────────────────────────

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
            .replace(/\s*[\|–\-]\s*(Lieferando|Order online|Delivery).*$/i, '')
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

    // Match European price format: "9,90 €" or "12,50€"
    const euroMatch = normalized.match(/(\d+)[,.](\d{2})\s*€/);
    if (euroMatch) {
        return {
            price: parseFloat(`${euroMatch[1]}.${euroMatch[2]}`),
            currency: 'EUR',
        };
    }

    // Match "€9.90" format
    const euroPrefix = normalized.match(/€\s*(\d+)[,.](\d{2})/);
    if (euroPrefix) {
        return {
            price: parseFloat(`${euroPrefix[1]}.${euroPrefix[2]}`),
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
    const match = href.match(/\/menu\/([^/?#]+)/);
    if (!match) return 'Unknown Restaurant';
    return match[1]
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
