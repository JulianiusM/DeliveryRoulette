/**
 * Fetch caching service for provider HTTP responses.
 *
 * Stores fetched HTML in the database with TTL-based expiration.
 * Uses SHA-256 hash of URL as cache key for stable lookups.
 */
import crypto from 'node:crypto';
import {AppDataSource} from '../database/dataSource';
import {ProviderFetchCache} from '../database/entities/provider/ProviderFetchCache';
import {fetchUrl} from '../lib/httpClient';

/** Default TTL values in seconds for different page types. */
export const LISTING_TTL_SECONDS = 6 * 60 * 60;   // 6 hours
export const MENU_TTL_SECONDS = 24 * 60 * 60;      // 24 hours

/**
 * Get a cached response or fetch and cache a new one.
 *
 * @param providerKey  Provider identifier (e.g. "lieferando")
 * @param url  The URL to fetch
 * @param ttlSeconds  Cache time-to-live in seconds
 * @returns The HTML body string, or null if fetch failed
 */
export async function getOrFetch(
    providerKey: string,
    url: string,
    ttlSeconds: number,
): Promise<{body: string; statusCode: number} | null> {
    const cacheKey = hashUrl(url);
    const repo = AppDataSource.getRepository(ProviderFetchCache);

    // Check for fresh cache entry
    const existing = await repo.findOne({
        where: {providerKey, cacheKey},
    });

    if (existing && existing.expiresAt > new Date()) {
        return {body: existing.body || '', statusCode: existing.statusCode};
    }

    // Fetch fresh
    try {
        const response = await fetchUrl(url);

        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

        if (existing) {
            // Update existing cache entry
            existing.statusCode = response.status;
            existing.fetchedAt = now;
            existing.expiresAt = expiresAt;
            existing.body = response.body;
            await repo.save(existing);
        } else {
            // Create new cache entry
            const entry = repo.create({
                providerKey,
                cacheKey,
                url,
                statusCode: response.status,
                fetchedAt: now,
                expiresAt,
                body: response.body,
            });
            await repo.save(entry);
        }

        return {body: response.body, statusCode: response.status};
    } catch {
        return null;
    }
}

function hashUrl(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex');
}
