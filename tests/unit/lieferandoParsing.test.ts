/**
 * Unit tests for Lieferando HTML parsing module.
 *
 * Tests use deterministic fixture HTML files.
 * No live HTTP calls are made.
 */
import {parseListingHtml, parseMenuHtml} from '../../src/providers/lieferando/lieferandoParsing';
import {
    listingHtml,
    menuHtml,
    listingRealHtml,
    menuRealHtml,
    expectedListingRestaurants,
    expectedRealListingRestaurants,
    listingRestaurantPathHtml,
    expectedRestaurantPathListingRestaurants,
    listingEmbeddedJsonHtml,
    expectedEmbeddedJsonListingRestaurants,
    listingNextDataHtml,
    expectedNextDataListingRestaurants,
    menuNextDataDetailsHtml,
    menuNextDataCategoriesHtml,
    expectedNextDataMenuCategories,
    expectedMenuCategories,
    expectedRealMenuCategories,
    expectedRawTextContents,
} from '../data/unit/lieferandoParsingData';

// ── Listing page parsing ──────────────────────────────────────

describe('parseListingHtml', () => {
    it('returns 2 restaurants from listing fixture', () => {
        const result = parseListingHtml(listingHtml, 'https://www.lieferando.de/en/delivery/food/93086');
        expect(result).toHaveLength(2);
    });

    it.each(expectedListingRestaurants)('$description', (expected) => {
        const result = parseListingHtml(listingHtml, 'https://www.lieferando.de/en/delivery/food/93086');
        const restaurant = result.find(r => r.name === expected.name);
        expect(restaurant).toBeDefined();
        expect(restaurant!.menuUrl).toContain(expected.menuUrlSuffix);
        if (expected.cuisines) {
            expect(restaurant!.cuisines).toBe(expected.cuisines);
        }
    });

    it('each restaurant has an absolute menu URL', () => {
        const result = parseListingHtml(listingHtml, 'https://www.lieferando.de/en/delivery/food/93086');
        for (const r of result) {
            expect(r.menuUrl).toMatch(/^https?:\/\//);
        }
    });

    it('deduplicates by URL', () => {
        const duplicatedHtml = listingHtml + listingHtml;
        const result = parseListingHtml(duplicatedHtml, 'https://www.lieferando.de');
        expect(result).toHaveLength(2);
    });

    it('returns empty array for HTML without menu links', () => {
        const result = parseListingHtml('<html><body>No restaurants</body></html>');
        expect(result).toHaveLength(0);
    });
});

// ── Menu page parsing ─────────────────────────────────────────

describe('parseMenuHtml', () => {
    it('returns categories Vegan and Salate', () => {
        const result = parseMenuHtml(menuHtml);
        expect(result.categories).toHaveLength(2);
        expect(result.categories.map(c => c.name)).toEqual(['Vegan', 'Salate']);
    });

    it('returns 2 items total', () => {
        const result = parseMenuHtml(menuHtml);
        const totalItems = result.categories.reduce((sum, c) => sum + c.items.length, 0);
        expect(totalItems).toBe(2);
    });

    it.each(expectedMenuCategories)('$description', (expected) => {
        const result = parseMenuHtml(menuHtml);
        const category = result.categories.find(c => c.name === expected.name);
        expect(category).toBeDefined();
        expect(category!.items).toHaveLength(expected.itemCount);
        expect(category!.items[0].name).toBe(expected.firstItem.name);
        expect(category!.items[0].description).toBe(expected.firstItem.description);
        expect(category!.items[0].price).toBeCloseTo(expected.firstItem.price, 2);
        expect(category!.items[0].currency).toBe(expected.firstItem.currency);
    });

    it('parseOk is true when items are found', () => {
        const result = parseMenuHtml(menuHtml);
        expect(result.parseOk).toBe(true);
    });

    it('rawText contains concatenated names and descriptions', () => {
        const result = parseMenuHtml(menuHtml);
        for (const expected of expectedRawTextContents) {
            expect(result.rawText).toContain(expected);
        }
    });

    it('parseOk is false when no items are found', () => {
        const result = parseMenuHtml('<html><body><p>Empty page</p></body></html>');
        expect(result.parseOk).toBe(false);
    });

    it('rawText is populated even when parsing fails', () => {
        const result = parseMenuHtml('<html><body><p>Some text content</p></body></html>');
        expect(result.rawText).toContain('Some text content');
    });
});

// ── Real-world listing page parsing ───────────────────────────

describe('parseListingHtml (real Lieferando structure)', () => {
    it('returns 3 restaurants from real listing fixture', () => {
        const result = parseListingHtml(listingRealHtml, 'https://www.lieferando.de/en/delivery/food/93086');
        expect(result).toHaveLength(3);
    });

    it.each(expectedRealListingRestaurants)('$description', (expected) => {
        const result = parseListingHtml(listingRealHtml, 'https://www.lieferando.de/en/delivery/food/93086');
        const restaurant = result.find(r => r.name === expected.name);
        expect(restaurant).toBeDefined();
        expect(restaurant!.menuUrl).toContain(expected.menuUrlSuffix);
        if (expected.cuisines) {
            expect(restaurant!.cuisines).toBe(expected.cuisines);
        }
    });
});

describe('parseListingHtml (restaurant-path links)', () => {
    it('returns 2 restaurants from restaurant-path listing fixture', () => {
        const result = parseListingHtml(listingRestaurantPathHtml, 'https://www.lieferando.de/en/delivery/food/neutraubling-93073');
        expect(result).toHaveLength(2);
    });

    it.each(expectedRestaurantPathListingRestaurants)('$description', (expected) => {
        const result = parseListingHtml(listingRestaurantPathHtml, 'https://www.lieferando.de/en/delivery/food/neutraubling-93073');
        const restaurant = result.find(r => r.name === expected.name);
        expect(restaurant).toBeDefined();
        expect(restaurant!.menuUrl).toContain(expected.menuUrlSuffix);
        if (expected.cuisines) {
            expect(restaurant!.cuisines).toBe(expected.cuisines);
        }
    });
});

describe('parseListingHtml (embedded JSON fallback)', () => {
    it('returns 2 restaurants from embedded JSON when links are not in the DOM', () => {
        const result = parseListingHtml(listingEmbeddedJsonHtml, 'https://www.lieferando.de/en/delivery/food/neutraubling-93073');
        expect(result).toHaveLength(2);
    });

    it.each(expectedEmbeddedJsonListingRestaurants)('$description', (expected) => {
        const result = parseListingHtml(listingEmbeddedJsonHtml, 'https://www.lieferando.de/en/delivery/food/neutraubling-93073');
        const restaurant = result.find(r => r.name === expected.name);
        expect(restaurant).toBeDefined();
        expect(restaurant!.menuUrl).toContain(expected.menuUrlSuffix);
    });
});

describe('parseListingHtml (Next.js preloaded state)', () => {
    it('returns all restaurants from preloaded state instead of only visible cards', () => {
        const result = parseListingHtml(listingNextDataHtml, 'https://www.lieferando.de/en/delivery/food/neutraubling-93073');
        expect(result).toHaveLength(3);
    });

    it.each(expectedNextDataListingRestaurants)('$description', (expected) => {
        const result = parseListingHtml(listingNextDataHtml, 'https://www.lieferando.de/en/delivery/food/neutraubling-93073');
        const restaurant = result.find(r => r.name === expected.name);
        expect(restaurant).toBeDefined();
        expect(restaurant!.menuUrl).toContain(expected.menuUrlSuffix);
        expect(restaurant!.address).toBe(expected.address);
        expect(restaurant!.city).toBe(expected.city);
        expect(restaurant!.postalCode).toBe(expected.postalCode);
        expect(restaurant!.cuisines).toBe(expected.cuisines);
    });
});

// ── Real-world menu page parsing ──────────────────────────────

describe('parseMenuHtml (real Lieferando structure)', () => {
    it('returns categories Salads and Pizza', () => {
        const result = parseMenuHtml(menuRealHtml);
        expect(result.categories).toHaveLength(2);
        expect(result.categories.map(c => c.name)).toEqual(['Salads', 'Pizza']);
    });

    it('returns 3 items total', () => {
        const result = parseMenuHtml(menuRealHtml);
        const totalItems = result.categories.reduce((sum, c) => sum + c.items.length, 0);
        expect(totalItems).toBe(3);
    });

    it.each(expectedRealMenuCategories)('$description', (expected) => {
        const result = parseMenuHtml(menuRealHtml);
        const category = result.categories.find(c => c.name === expected.name);
        expect(category).toBeDefined();
        expect(category!.items).toHaveLength(expected.itemCount);
        expect(category!.items[0].name).toBe(expected.firstItem.name);
        expect(category!.items[0].description).toBe(expected.firstItem.description);
        expect(category!.items[0].price).toBeCloseTo(expected.firstItem.price, 2);
        expect(category!.items[0].currency).toBe(expected.firstItem.currency);
    });

    it('extracts restaurant name from h1', () => {
        const result = parseMenuHtml(menuRealHtml);
        expect(result.restaurantName).toBe('Pizza La Scalla');
    });

    it('parseOk is true when items are found', () => {
        const result = parseMenuHtml(menuRealHtml);
        expect(result.parseOk).toBe(true);
    });

    it('rawText contains item names and descriptions', () => {
        const result = parseMenuHtml(menuRealHtml);
        expect(result.rawText).toContain('Rocket Salad');
        expect(result.rawText).toContain('Margherita');
        expect(result.rawText).toContain('with tomato sauce and mozzarella');
    });

    it('handles "from" prefix in prices', () => {
        const result = parseMenuHtml(menuRealHtml);
        const salads = result.categories.find(c => c.name === 'Salads');
        expect(salads).toBeDefined();
        expect(salads!.items[0].price).toBeCloseTo(8.80, 2);
    });

    it('extracts opening details and address from __NEXT_DATA__', () => {
        const result = parseMenuHtml(menuNextDataDetailsHtml);
        expect(result.restaurantDetails).toBeDefined();
        expect(result.restaurantDetails!.address).toBe('Sample Street 9');
        expect(result.restaurantDetails!.city).toBe('Neutraubling');
        expect(result.restaurantDetails!.postalCode).toBe('93073');
        expect(result.restaurantDetails!.openingDays).toContain('Monday');
        expect(result.restaurantDetails!.openingHours).toContain('delivery:');
    });

    it('extracts complete menu categories and items from __NEXT_DATA__', () => {
        const result = parseMenuHtml(menuNextDataCategoriesHtml);
        expect(result.parseOk).toBe(true);
        expect(result.categories).toHaveLength(2);
        expect(result.categories.map((c) => c.name)).toEqual(['Burgers', 'Sides']);
    });

    it.each(expectedNextDataMenuCategories)('$description', (expected) => {
        const result = parseMenuHtml(menuNextDataCategoriesHtml);
        const category = result.categories.find((c) => c.name === expected.name);
        expect(category).toBeDefined();
        expect(category!.items).toHaveLength(expected.itemCount);
        expect(category!.items[0].name).toBe(expected.firstItem.name);
        expect(category!.items[0].description).toBe(expected.firstItem.description);
        expect(category!.items[0].price).toBeCloseTo(expected.firstItem.price, 2);
        expect(category!.items[0].currency).toBe(expected.firstItem.currency);
    });
});
