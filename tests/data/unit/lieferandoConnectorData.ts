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
        description: 'returns parsed restaurants for a reachable listing',
        query: 'https://www.lieferando.de/en/delivery/food/berlin',
        html: '<html><body><a href="/en/menu/pizza-palast">Pizza Palast</a></body></html>',
        expectCount: 0,
    },
];

export const listRestaurantsFailureData = [
    {
        description: 'throws when listing request fails with HTTP 403',
        query: 'https://www.lieferando.de/en/delivery/food/neutraubling-93073',
        response: {
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            html: '<html><body>Forbidden</body></html>',
        },
        expectedError: 'listing request failed: HTTP 403 Forbidden',
    },
    {
        description: 'throws when network request fails',
        query: 'https://www.lieferando.de/en/delivery/food/neutraubling-93073',
        response: null,
        expectedError: 'Network error',
    },
    {
        description: 'throws when bot-protection page is returned with HTTP 200',
        query: 'https://www.lieferando.de/en/delivery/food/neutraubling-93073',
        response: {
            ok: true,
            status: 200,
            statusText: 'OK',
            html: '<html><title>Just a moment...</title><body>Cloudflare</body></html>',
        },
        expectedError: 'bot-protection page',
    },
];

export const listRestaurantsExternalIdData = [
    {
        description: 'maps /menu/ URLs to slug external IDs',
        query: 'https://www.lieferando.de/en/delivery/food/berlin',
        discovered: [
            {name: 'Pizza Palast', menuUrl: 'https://www.lieferando.de/en/menu/pizza-palast', cuisines: null},
        ],
        expected: [
            {externalId: 'pizza-palast', name: 'Pizza Palast', url: 'https://www.lieferando.de/en/menu/pizza-palast'},
        ],
    },
    {
        description: 'maps /restaurant/ URLs to slug external IDs',
        query: 'https://www.lieferando.de/en/delivery/food/neutraubling-93073',
        discovered: [
            {
                name: 'Burger Point',
                menuUrl: 'https://www.lieferando.de/en/restaurant/burger-point-neutraubling?cid=abc123',
                cuisines: null,
            },
        ],
        expected: [
            {
                externalId: 'burger-point-neutraubling',
                name: 'Burger Point',
                url: 'https://www.lieferando.de/en/restaurant/burger-point-neutraubling?cid=abc123',
            },
        ],
    },
    {
        description: 'falls back to stable URL without query/hash when no slug can be derived',
        query: 'https://www.lieferando.de/en/delivery/food/neutraubling-93073',
        discovered: [
            {
                name: 'Fallback Restaurant',
                menuUrl: 'https://www.lieferando.de/en/delivery/food/neutraubling-93073?foo=bar#section',
                cuisines: null,
            },
        ],
        expected: [
            {
                externalId: 'https://www.lieferando.de/en/delivery/food/neutraubling-93073',
                name: 'Fallback Restaurant',
                url: 'https://www.lieferando.de/en/delivery/food/neutraubling-93073?foo=bar#section',
            },
        ],
    },
];
