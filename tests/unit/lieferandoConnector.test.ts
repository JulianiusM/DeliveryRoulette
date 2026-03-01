/**
 * Unit tests for LieferandoConnector.
 * Tests URL validation for import and listing URLs,
 * and fetch behavior with mocked global fetch.
 */

import {LieferandoConnector} from '../../src/providers/lieferando/LieferandoConnector';
import {parseListingHtml} from '../../src/providers/lieferando/lieferandoParsing';
import {
    validImportUrls,
    invalidImportUrls,
    validListingUrls,
    invalidListingUrls,
    fetchMenuData,
    listRestaurantsData,
    listRestaurantsFailureData,
    listRestaurantsExternalIdData,
} from '../data/unit/lieferandoConnectorData';

// ── Mock lieferando parsing ─────────────────────────────────
jest.mock('../../src/providers/lieferando/lieferandoParsing', () => ({
    parseMenuHtml: jest.fn().mockReturnValue({
        categories: [{name: 'Starters', items: [{name: 'Bruschetta', description: '', price: 4.5, currency: 'EUR'}]}],
    }),
    parseListingHtml: jest.fn().mockReturnValue([]),
}));

let connector: LieferandoConnector;
const parseListingHtmlMock = parseListingHtml as jest.MockedFunction<typeof parseListingHtml>;

beforeEach(() => {
    connector = new LieferandoConnector();
    jest.restoreAllMocks();
    parseListingHtmlMock.mockReset();
    parseListingHtmlMock.mockReturnValue([]);
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

    test('falls back to CDN manifest from HTML and resolves tokenized relative item URL', async () => {
        const manifestUrl = 'https://globalmenucdn.eu-central-1.production.jet-external.com/TOKEN/bella-bollywood_de_manifest_en.json';
        const itemsUrl = 'https://globalmenucdn.eu-central-1.production.jet-external.com/TOKEN/bella-bollywood_de_items_en.json';

        jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
            const url = String(input);
            if (url.includes('/en/menu/bella-bollywood')) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    text: async () => '<html><body><script>{"ManifestUrl":"\\/TOKEN\\/bella-bollywood_de_manifest_en.json"}</script>Cloudflare</body></html>',
                } as Response;
            }
            if (url === manifestUrl) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        Menus: [
                            {
                                Categories: [
                                    {
                                        Name: 'Vegan Specials',
                                        ItemIds: ['item-1'],
                                    },
                                ],
                            },
                        ],
                        RestaurantInfo: {
                            Name: 'Bella Bollywood',
                            Location: {
                                Address: 'Main Street 1',
                                City: 'Regensburg',
                                PostCode: '93047',
                            },
                            RestaurantOpeningTimes: [],
                        },
                        ItemsUrl: 'bella-bollywood_de_items_en.json',
                    }),
                } as Response;
            }
            if (url === itemsUrl) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        Items: [
                            {
                                Id: 'item-1',
                                Name: 'Plant-based Bowl',
                                Description: 'A vegan bowl',
                                Labels: ['vegan'],
                                Variations: [
                                    {
                                        BasePrice: 9.9,
                                        CurrencyCode: 'EUR',
                                    },
                                ],
                            },
                        ],
                    }),
                } as Response;
            }

            return {
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: async () => ({}),
                text: async () => '',
            } as Response;
        });

        const result = await connector.fetchMenu('https://www.lieferando.de/en/menu/bella-bollywood');
        expect(result.categories).toHaveLength(1);
        expect(result.categories[0].name).toBe('Vegan Specials');
        expect(result.categories[0].items[0].name).toBe('Plant-based Bowl');
        expect(result.categories[0].items[0].dietContext).toContain('category:Vegan Specials');
    });
});

// ── listRestaurants ─────────────────────────────────────────

describe('listRestaurants', () => {
    test.each(listRestaurantsData)('$description', async ({query, html, expectCount}) => {
        if (html !== null) {
            jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                text: async () => html,
            } as Response);
        } else {
            jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
        }

        const result = await connector.listRestaurants(query);
        expect(result).toHaveLength(expectCount);
    });
});

describe('listRestaurants failures', () => {
    test.each(listRestaurantsFailureData)('$description', async ({query, response, expectedError}) => {
        if (response === null) {
            jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
        } else {
            jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                text: async () => response.html,
            } as Response);
        }

        await expect(connector.listRestaurants(query)).rejects.toThrow(expectedError);
    });
});

describe('listRestaurants externalId mapping', () => {
    test.each(listRestaurantsExternalIdData)('$description', async ({query, discovered, expected}) => {
        parseListingHtmlMock.mockReturnValueOnce(discovered);
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            text: async () => '<html></html>',
        } as Response);

        const result = await connector.listRestaurants(query);
        expect(result).toHaveLength(expected.length);
        result.forEach((restaurant, idx) => {
            expect(restaurant).toMatchObject(expected[idx]);
        });
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
