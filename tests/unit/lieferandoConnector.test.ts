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
    fetchAvailabilityData,
    fetchAvailabilityFailureData,
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

    test('captures diet option group labels and nested variation allergens from CDN item details', async () => {
        const manifestUrl = 'https://globalmenucdn.eu-central-1.production.jet-external.com/TOKEN/namaste_de_manifest_en.json';
        const itemsUrl = 'https://globalmenucdn.eu-central-1.production.jet-external.com/TOKEN/namaste_de_items_en.json';
        const itemDetailsUrl = 'https://globalmenucdn.eu-central-1.production.jet-external.com/TOKEN/namaste_de_item-details_en.json';

        jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
            const url = String(input);
            if (url.includes('/en/menu/namaste-2')) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    text: async () => '<html><body><script>{"ManifestUrl":"\\/TOKEN\\/namaste_de_manifest_en.json"}</script>Cloudflare</body></html>',
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
                                        Name: 'Curries',
                                        ItemIds: ['item-1'],
                                    },
                                ],
                            },
                        ],
                        RestaurantInfo: {
                            Name: 'Namaste 2',
                            Location: {
                                Address: 'Sample Street 9',
                                City: 'Regensburg',
                                PostCode: '93047',
                            },
                        },
                        ItemsUrl: 'namaste_de_items_en.json',
                        ItemDetailsUrl: 'namaste_de_item-details_en.json',
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
                                Name: 'Paneer Tikka Masala',
                                Variations: [
                                    {
                                        BasePrice: 11.9,
                                        CurrencyCode: 'EUR',
                                        ModifierGroupsIds: ['group-1'],
                                    },
                                ],
                            },
                        ],
                    }),
                } as Response;
            }
            if (url === itemDetailsUrl) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        Items: [
                            {
                                Id: 'item-1',
                                Variations: [
                                    {
                                        ModifierGroupsIds: ['group-1'],
                                        AllergenInformation: [
                                            {Name: 'Milk'},
                                        ],
                                    },
                                ],
                            },
                        ],
                        ModifierGroups: [
                            {
                                Id: 'group-1',
                                Name: 'Your Special Request',
                                MinChoices: 0,
                                MaxChoices: 1,
                                Modifiers: ['modifier-1'],
                            },
                        ],
                        ModifierSets: [
                            {Id: 'modifier-1', Modifier: {Name: 'vegan prepared'}},
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

        const result = await connector.fetchMenu('https://www.lieferando.de/en/menu/namaste-2');
        expect(result.categories).toHaveLength(1);
        expect(result.categories[0].items[0].allergens).toEqual(['Milk']);
        expect(result.categories[0].items[0].dietContext).toContain('diet-preparation:Your Special Request => vegan prepared');
    });

    test('separates explicit replacement choices from optional vegan add-ons', async () => {
        const manifestUrl = 'https://globalmenucdn.eu-central-1.production.jet-external.com/TOKEN/multi-options_de_manifest_en.json';
        const itemsUrl = 'https://globalmenucdn.eu-central-1.production.jet-external.com/TOKEN/multi-options_de_items_en.json';
        const itemDetailsUrl = 'https://globalmenucdn.eu-central-1.production.jet-external.com/TOKEN/multi-options_de_item-details_en.json';

        jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
            const url = String(input);
            if (url.includes('/en/menu/mikes-pizza-burger-augsburger-strasse-regensburg')) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    text: async () => '<html><body><script>{"ManifestUrl":"\\/TOKEN\\/multi-options_de_manifest_en.json"}</script></body></html>',
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
                                        Name: 'Pizza',
                                        ItemIds: ['item-1'],
                                    },
                                ],
                            },
                        ],
                        ItemsUrl: 'multi-options_de_items_en.json',
                        ItemDetailsUrl: 'multi-options_de_item-details_en.json',
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
                                Name: 'Ham Pizza',
                                Description: 'Pizza with cheese and ham',
                                Variations: [
                                    {
                                        BasePrice: 12.9,
                                        CurrencyCode: 'EUR',
                                        ModifierGroupsIds: ['group-choice', 'group-addon'],
                                    },
                                ],
                            },
                        ],
                    }),
                } as Response;
            }
            if (url === itemDetailsUrl) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        Items: [
                            {
                                Id: 'item-1',
                                Variations: [
                                    {
                                        ModifierGroupsIds: ['group-choice', 'group-addon'],
                                        AllergenInformation: [{Name: 'Milk'}],
                                    },
                                ],
                            },
                        ],
                        ModifierGroups: [
                            {
                                Id: 'group-choice',
                                Name: 'Choose your cheese',
                                MinimumQuantity: 1,
                                MaximumQuantity: 1,
                                Modifiers: ['modifier-1', 'modifier-2'],
                            },
                            {
                                Id: 'group-addon',
                                Name: 'Choose your dip',
                                MinimumQuantity: 0,
                                MaximumQuantity: 1,
                                Modifiers: ['modifier-3', 'modifier-4'],
                            },
                        ],
                        ModifierSets: [
                            {Id: 'modifier-1', Modifier: {Name: 'Mozzarella'}},
                            {Id: 'modifier-2', Modifier: {Name: 'Vegan Cheese'}},
                            {Id: 'modifier-3', Modifier: {Name: 'Ketchup'}},
                            {Id: 'modifier-4', Modifier: {Name: 'Vegan Mayo'}},
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

        const result = await connector.fetchMenu('https://www.lieferando.de/en/menu/mikes-pizza-burger-augsburger-strasse-regensburg');
        expect(result.categories).toHaveLength(1);
        expect(result.categories[0].items[0].dietContext).toContain('diet-choice:Choose your cheese => Mozzarella | Vegan Cheese');
        expect(result.categories[0].items[0].dietContext).toContain('diet-addon:Choose your dip => Ketchup | Vegan Mayo');
    });

    test('prefers richer CDN data even when HTML parsing already found menu items', async () => {
        const manifestUrl = 'https://globalmenucdn.eu-central-1.production.jet-external.com/TOKEN/rich-menu_de_manifest_en.json';
        const itemsUrl = 'https://globalmenucdn.eu-central-1.production.jet-external.com/TOKEN/rich-menu_de_items_en.json';
        const itemDetailsUrl = 'https://globalmenucdn.eu-central-1.production.jet-external.com/TOKEN/rich-menu_de_item-details_en.json';

        jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
            const url = String(input);
            if (url.includes('/en/menu/rich-menu')) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    text: async () => '<html><body><div data-qa="item-category"></div><script>{"ManifestUrl":"\\/TOKEN\\/rich-menu_de_manifest_en.json"}</script></body></html>',
                } as Response;
            }
            if (url === manifestUrl) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        RestaurantId: '2559484',
                        Menus: [
                            {
                                Categories: [
                                    {
                                        Name: 'Curries',
                                        ItemIds: ['item-1'],
                                    },
                                ],
                            },
                        ],
                        ItemsUrl: 'rich-menu_de_items_en.json',
                        ItemDetailsUrl: 'rich-menu_de_item-details_en.json',
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
                                Name: 'Palak Paneer',
                                Description: 'Spinach curry with paneer',
                                Variations: [
                                    {
                                        Id: 'variation-1',
                                        BasePrice: 12.9,
                                        CurrencyCode: 'EUR',
                                        ModifierGroupsIds: ['group-1'],
                                    },
                                ],
                            },
                        ],
                    }),
                } as Response;
            }
            if (url === itemDetailsUrl) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        ModifierGroups: [
                            {
                                Id: 'group-1',
                                Name: 'vegan zubereitet',
                                Modifiers: ['modifier-1'],
                            },
                        ],
                        ModifierSets: [
                            {Id: 'modifier-1', Modifier: {Name: 'Yes'}},
                        ],
                    }),
                } as Response;
            }
            if (url.includes('/restaurants/de/2559484/products/item-1/information')) {
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        allergens: {
                            provided: true,
                            allergenSets: [
                                {level: 'contains', type: 'milkLactose', subTypes: []},
                            ],
                        },
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

        const result = await connector.fetchMenu('https://www.lieferando.de/en/menu/rich-menu');
        expect(result.categories).toHaveLength(1);
        expect(result.categories[0].items[0].name).toBe('Palak Paneer');
        expect(result.categories[0].items[0].dietContext).toContain('diet-preparation:vegan zubereitet => Yes');
        expect(result.categories[0].items[0].dietContext).toContain('customizations:vegan zubereitet');
        expect(result.categories[0].items[0].allergens).toEqual(['Milk']);
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

        const result = await connector.listRestaurants({query});
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

        await expect(connector.listRestaurants({query})).rejects.toThrow(expectedError);
    });
});

describe('listRestaurants externalId mapping', () => {
    test.each(listRestaurantsExternalIdData)('$description', async ({query, discovered, expected}) => {
        parseListingHtmlMock.mockReturnValueOnce(discovered);
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            text: async () => '<html></html>',
        } as Response);

        const result = await connector.listRestaurants({query});
        expect(result).toHaveLength(expected.length);
        result.forEach((restaurant, idx) => {
            expect(restaurant).toMatchObject(expected[idx]);
        });
    });
});

// ── rateLimitPolicy / capabilities ──────────────────────────

describe('fetchAvailability', () => {
    test.each(fetchAvailabilityData)('$description', async ({
        providerRestaurantId,
        locationContext,
        orderTime,
        response,
        expectedUrl,
        expected,
    }) => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => response,
        } as Response);

        const result = await connector.fetchAvailability(providerRestaurantId, locationContext as any, orderTime);
        const normalized = [...result].sort((a, b) => a.serviceType.localeCompare(b.serviceType));
        const expectedSorted = [...expected].sort((a, b) => a.serviceType.localeCompare(b.serviceType));

        expect(global.fetch).toHaveBeenCalledWith(
            expectedUrl,
            expect.objectContaining({
                headers: expect.objectContaining({
                    Origin: 'https://www.lieferando.de',
                }),
            }),
        );
        normalized.forEach((entry, idx) => {
            expect(entry).toMatchObject(expectedSorted[idx]);
            expect(entry.providerRestaurantId).toBe(providerRestaurantId);
            expect(entry.providerNativeId).toBe(providerRestaurantId);
            expect(entry.observedAt).toEqual(orderTime);
        });
    });
});

describe('fetchAvailability failures', () => {
    test.each(fetchAvailabilityFailureData)('$description', async ({
        providerRestaurantId,
        locationContext,
        orderTime,
        expectedError,
    }) => {
        await expect(
            connector.fetchAvailability(providerRestaurantId, locationContext as any, orderTime),
        ).rejects.toThrow(expectedError);
    });
});

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
