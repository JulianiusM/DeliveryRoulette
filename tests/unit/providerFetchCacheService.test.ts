/**
 * Unit tests for ProviderFetchCacheService.
 * Tests cache hit, miss, expiry, and fetch failure scenarios.
 */

import {
    cacheHitData,
    cacheMissData,
    cacheExpiredData,
    fetchFailureData,
} from '../data/unit/providerFetchCacheData';

// ── Mock repository ─────────────────────────────────────────
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockSave = jest.fn();

jest.mock('../../src/modules/database/dataSource', () => ({
    AppDataSource: {
        getRepository: jest.fn(() => ({
            findOne: mockFindOne,
            create: mockCreate,
            save: mockSave,
        })),
    },
}));

// ── Mock httpClient ─────────────────────────────────────────
const mockFetchUrl = jest.fn();
jest.mock('../../src/modules/lib/httpClient', () => ({
    fetchUrl: (...args: unknown[]) => mockFetchUrl(...args),
}));

import {getOrFetch} from '../../src/modules/providers/ProviderFetchCacheService';

beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockImplementation((data: object) => ({...data}));
});

// ── Cache hit ───────────────────────────────────────────────

describe('getOrFetch - cache hit', () => {
    test.each(cacheHitData)('$description', async ({providerKey, url, ttlSeconds, cachedBody, cachedStatusCode, expiresInMs}) => {
        mockFindOne.mockResolvedValue({
            providerKey,
            body: cachedBody,
            statusCode: cachedStatusCode,
            expiresAt: new Date(Date.now() + expiresInMs),
        });

        const result = await getOrFetch(providerKey, url, ttlSeconds);

        expect(result).toEqual({body: cachedBody, statusCode: cachedStatusCode});
        expect(mockFetchUrl).not.toHaveBeenCalled();
    });
});

// ── Cache miss ──────────────────────────────────────────────

describe('getOrFetch - cache miss', () => {
    test.each(cacheMissData)('$description', async ({providerKey, url, ttlSeconds, fetchBody, fetchStatus}) => {
        mockFindOne.mockResolvedValue(null);
        mockFetchUrl.mockResolvedValue({status: fetchStatus, body: fetchBody, ok: true});
        mockSave.mockResolvedValue({});

        const result = await getOrFetch(providerKey, url, ttlSeconds);

        expect(result).toEqual({body: fetchBody, statusCode: fetchStatus});
        expect(mockFetchUrl).toHaveBeenCalledWith(url);
        expect(mockCreate).toHaveBeenCalled();
        expect(mockSave).toHaveBeenCalled();
    });
});

// ── Cache expired ───────────────────────────────────────────

describe('getOrFetch - cache expired', () => {
    test.each(cacheExpiredData)('$description', async ({providerKey, url, ttlSeconds, oldBody, newBody, newStatus, expiredMs}) => {
        const existingEntry = {
            providerKey,
            body: oldBody,
            statusCode: 200,
            expiresAt: new Date(Date.now() + expiredMs),
            fetchedAt: new Date(),
        };
        mockFindOne.mockResolvedValue(existingEntry);
        mockFetchUrl.mockResolvedValue({status: newStatus, body: newBody, ok: true});
        mockSave.mockResolvedValue({});

        const result = await getOrFetch(providerKey, url, ttlSeconds);

        expect(result).toEqual({body: newBody, statusCode: newStatus});
        expect(mockFetchUrl).toHaveBeenCalledWith(url);
        expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({body: newBody}));
    });
});

// ── Fetch failure ───────────────────────────────────────────

describe('getOrFetch - fetch failure', () => {
    test.each(fetchFailureData)('$description', async ({providerKey, url, ttlSeconds, errorMessage}) => {
        mockFindOne.mockResolvedValue(null);
        mockFetchUrl.mockRejectedValue(new Error(errorMessage));

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = await getOrFetch(providerKey, url, ttlSeconds);

        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });
});
