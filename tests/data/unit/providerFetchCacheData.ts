/**
 * Test data for ProviderFetchCacheService unit tests.
 */

export const cacheHitData = [
    {
        description: 'returns cached HTML when entry is not expired',
        providerKey: 'lieferando',
        url: 'https://www.lieferando.de/en/menu/pizza-palast',
        ttlSeconds: 3600,
        cachedBody: '<html>cached menu</html>',
        cachedStatusCode: 200,
        expiresInMs: 60_000,
    },
];

export const cacheMissData = [
    {
        description: 'fetches and caches when no entry exists',
        providerKey: 'lieferando',
        url: 'https://www.lieferando.de/en/menu/new-restaurant',
        ttlSeconds: 3600,
        fetchBody: '<html>fresh menu</html>',
        fetchStatus: 200,
    },
];

export const cacheExpiredData = [
    {
        description: 're-fetches and updates when cache is expired',
        providerKey: 'lieferando',
        url: 'https://www.lieferando.de/en/menu/stale-restaurant',
        ttlSeconds: 3600,
        oldBody: '<html>old menu</html>',
        newBody: '<html>updated menu</html>',
        newStatus: 200,
        expiredMs: -60_000,
    },
];

export const fetchFailureData = [
    {
        description: 'returns null when fetch throws an error',
        providerKey: 'lieferando',
        url: 'https://www.lieferando.de/en/menu/unreachable',
        ttlSeconds: 3600,
        errorMessage: 'Network error',
    },
];
