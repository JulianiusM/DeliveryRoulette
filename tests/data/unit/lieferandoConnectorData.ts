/**
 * Test data for LieferandoConnector unit tests.
 */

export const validImportUrls = [
    {
        description: 'accepts standard HTTPS menu URL',
        url: 'https://www.lieferando.de/en/menu/pizza-palast',
    },
    {
        description: 'accepts HTTPS menu URL without www',
        url: 'https://lieferando.de/en/menu/green-bowl',
    },
    {
        description: 'accepts HTTPS menu URL with trailing slash',
        url: 'https://www.lieferando.de/en/menu/sushi-bar/',
    },
];

export const invalidImportUrls = [
    {
        description: 'rejects HTTP (non-HTTPS) URL',
        url: 'http://www.lieferando.de/en/menu/pizza-palast',
        expectedError: 'URL must use HTTPS protocol',
    },
    {
        description: 'rejects non-lieferando.de domain',
        url: 'https://www.example.com/en/menu/pizza-palast',
        expectedError: 'URL must be from lieferando.de',
    },
    {
        description: 'rejects URL without /menu/ path',
        url: 'https://www.lieferando.de/en/delivery/food/berlin',
        expectedError: 'URL must contain /menu/ path',
    },
    {
        description: 'rejects completely invalid URL',
        url: 'not-a-url',
        expectedError: 'Invalid URL format',
    },
];

export const validListingUrls = [
    {
        description: 'accepts standard HTTPS listing URL',
        url: 'https://www.lieferando.de/en/delivery/food/berlin',
    },
    {
        description: 'accepts HTTPS listing URL without www',
        url: 'https://lieferando.de/en/delivery/food/munich',
    },
];

export const invalidListingUrls = [
    {
        description: 'rejects HTTP listing URL',
        url: 'http://www.lieferando.de/en/delivery/food/berlin',
        expectedError: 'URL must use HTTPS protocol',
    },
    {
        description: 'rejects invalid domain for listing',
        url: 'https://www.uber-eats.com/en/delivery/food/berlin',
        expectedError: 'URL must be from lieferando.de',
    },
    {
        description: 'rejects completely invalid listing URL',
        url: 'garbage',
        expectedError: 'Invalid URL format',
    },
];

export const fetchMenuData = [
    {
        description: 'returns parsed menu from full URL',
        externalId: 'https://www.lieferando.de/en/menu/pizza-palast',
        html: '<html><body><script type="application/ld+json">{"@type":"Menu","hasMenuSection":[{"name":"Starters","hasMenuItem":[{"name":"Bruschetta","offers":{"price":4.5,"priceCurrency":"EUR"}}]}]}</script></body></html>',
        expectCategories: 1,
    },
    {
        description: 'returns empty categories on fetch failure',
        externalId: 'pizza-palast',
        html: null,
        expectCategories: 0,
    },
];

export const listRestaurantsData = [
    {
        description: 'returns empty array for empty query',
        query: '',
        html: null,
        expectCount: 0,
    },
    {
        description: 'returns empty array on fetch failure',
        query: 'https://www.lieferando.de/en/delivery/food/berlin',
        html: null,
        expectCount: 0,
    },
];
