/**
 * Unit tests for LieferandoConnector.
 * Tests URL validation for import and listing URLs,
 * and fetch behavior with mocked global fetch.
 */

import {LieferandoConnector} from '../../src/providers/lieferando/LieferandoConnector';
import {
    validImportUrls,
    invalidImportUrls,
    validListingUrls,
    invalidListingUrls,
    fetchMenuData,
    listRestaurantsData,
} from '../data/unit/lieferandoConnectorData';

// ── Mock lieferando parsing ─────────────────────────────────
jest.mock('../../src/providers/lieferando/lieferandoParsing', () => ({
    parseMenuHtml: jest.fn().mockReturnValue({
        categories: [{name: 'Starters', items: [{name: 'Bruschetta', description: '', price: 4.5, currency: 'EUR'}]}],
    }),
    parseListingHtml: jest.fn().mockReturnValue([]),
}));

let connector: LieferandoConnector;

beforeEach(() => {
    connector = new LieferandoConnector();
    jest.restoreAllMocks();
});

// ── validateImportUrl ───────────────────────────────────────

describe('validateImportUrl', () => {
    test.each(validImportUrls)('$description', ({url}) => {
        expect(() => connector.validateImportUrl(url)).not.toThrow();
    });

    test.each(invalidImportUrls)('$description', ({url, expectedError}) => {
        expect(() => connector.validateImportUrl(url)).toThrow(expectedError);
    });
});

// ── validateListingUrl ──────────────────────────────────────

describe('validateListingUrl', () => {
    test.each(validListingUrls)('$description', ({url}) => {
        expect(() => connector.validateListingUrl(url)).not.toThrow();
    });

    test.each(invalidListingUrls)('$description', ({url, expectedError}) => {
        expect(() => connector.validateListingUrl(url)).toThrow(expectedError);
    });
});

// ── fetchMenu ───────────────────────────────────────────────

describe('fetchMenu', () => {
    test.each(fetchMenuData)('$description', async ({externalId, html, expectCategories}) => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: html !== null,
            text: async () => html ?? '',
        } as Response);

        const result = await connector.fetchMenu(externalId);
        expect(result.categories).toHaveLength(expectCategories);
    });
});

// ── listRestaurants ─────────────────────────────────────────

describe('listRestaurants', () => {
    test.each(listRestaurantsData)('$description', async ({query, html, expectCount}) => {
        if (html !== null) {
            jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                text: async () => html,
            } as Response);
        } else {
            jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
        }

        const result = await connector.listRestaurants(query);
        expect(result).toHaveLength(expectCount);
    });
});

// ── rateLimitPolicy / capabilities ──────────────────────────

describe('rateLimitPolicy', () => {
    test('returns expected rate limit', () => {
        const policy = connector.rateLimitPolicy();
        expect(policy).toEqual({maxRequests: 10, windowMs: 60_000});
    });
});

describe('capabilities', () => {
    test('reports discovery and import support', () => {
        const caps = connector.capabilities();
        expect(caps.canDiscoverFromListingUrl).toBe(true);
        expect(caps.canImportFromUrl).toBe(true);
        expect(caps.importUrlHostPattern).toBe('lieferando.de');
    });
});
