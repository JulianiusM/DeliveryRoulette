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

export const fetchAvailabilityData = [
    {
        description: 'maps the dynamic menu endpoint into delivery and collection availability snapshots',
        providerRestaurantId: '1590874',
        locationContext: {
            providerKey: 'lieferando',
            providerAreaId: '93073',
            providerLocationSlug: 'neutraubling-93073',
            latitude: 48.9889211,
            longitude: 12.1984299,
        },
        orderTime: new Date('2026-03-01T15:42:25.146Z'),
        response: {
            RestaurantId: '1590874',
            DeliveryAdjustment: {
                ETAMinutes: 45,
                IsBusy: false,
                ETA: {
                    UpperBoundMinutes: 60,
                    LowerBoundMinutes: 35,
                },
            },
            IsTemporaryOffline: false,
            IsThrottled: false,
            TempOffline: [
                {ServiceType: 'Collection', IsTempOffline: false},
                {ServiceType: 'Delivery', IsTempOffline: false},
            ],
            DeliveryFees: {
                MinimumOrderValue: 3000,
                Currency: 'EUR',
                Bands: [
                    {
                        MinimumAmount: 3000,
                        Fee: 150,
                    },
                ],
            },
            RestaurantFees: {
                BagFee: null,
                ServiceFee: null,
                SmallOrderFee: null,
            },
        },
        expectedUrl: 'https://rest.api.eu-central-1.production.jet-external.com/restaurant/de/1590874/menu/dynamic?latLong=48.9889211%2C12.1984299&areaId=93073&orderTime=2026-03-01T15%3A42%3A25.146Z',
        expected: [
            {
                serviceType: 'delivery',
                isAvailable: true,
                isTemporaryOffline: false,
                isThrottled: false,
                etaMin: 35,
                etaMax: 60,
                minOrderAmountMinor: 3000,
                currency: 'EUR',
                feeBands: [
                    {
                        minOrderAmountMinor: 3000,
                        feeMinor: 150,
                    },
                ],
            },
            {
                serviceType: 'collection',
                isAvailable: true,
                isTemporaryOffline: false,
                isThrottled: false,
                etaMin: null,
                etaMax: null,
                minOrderAmountMinor: null,
                currency: null,
                feeBands: null,
            },
        ],
    },
    {
        description: 'marks delivery unavailable when the provider reports service-specific temporary offline state',
        providerRestaurantId: '1590874',
        locationContext: {
            providerKey: 'lieferando',
            providerAreaId: '93073',
            providerLocationSlug: 'neutraubling-93073',
            latitude: 48.9889211,
            longitude: 12.1984299,
        },
        orderTime: new Date('2026-03-01T15:42:25.146Z'),
        response: {
            RestaurantId: '1590874',
            IsTemporaryOffline: false,
            IsThrottled: true,
            TempOffline: [
                {ServiceType: 'Collection', IsTempOffline: false},
                {ServiceType: 'Delivery', IsTempOffline: true},
            ],
        },
        expectedUrl: 'https://rest.api.eu-central-1.production.jet-external.com/restaurant/de/1590874/menu/dynamic?latLong=48.9889211%2C12.1984299&areaId=93073&orderTime=2026-03-01T15%3A42%3A25.146Z',
        expected: [
            {
                serviceType: 'collection',
                isAvailable: true,
                isTemporaryOffline: false,
                isThrottled: true,
            },
            {
                serviceType: 'delivery',
                isAvailable: false,
                isTemporaryOffline: true,
                isThrottled: true,
            },
        ],
    },
];

export const fetchAvailabilityFailureData = [
    {
        description: 'requires full location context before calling the dynamic endpoint',
        providerRestaurantId: '1590874',
        locationContext: {
            providerKey: 'lieferando',
            providerAreaId: null,
            providerLocationSlug: 'neutraubling-93073',
            latitude: null,
            longitude: 12.1984299,
        },
        orderTime: new Date('2026-03-01T15:42:25.146Z'),
        expectedError: 'Lieferando availability fetch requires latitude, longitude, and provider area ID',
    },
];
