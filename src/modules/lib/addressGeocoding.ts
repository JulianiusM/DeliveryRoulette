import settings from '../settings';
import logger from '../logger';

export interface AddressGeocodeInput {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
}

export interface AddressGeocodeResult {
    status: 'resolved' | 'no_match' | 'disabled' | 'skipped' | 'error';
    latitude?: number;
    longitude?: number;
    message?: string;
}

interface NominatimSearchResult {
    lat?: string;
    lon?: string;
}

interface CachedResult {
    expiresAt: number;
    result: AddressGeocodeResult;
}

const cache = new Map<string, CachedResult>();
let rateLimitQueue: Promise<void> = Promise.resolve();
let nextAllowedRequestAt = 0;

export async function resolveCoordinates(input: AddressGeocodeInput): Promise<AddressGeocodeResult> {
    const query = buildQuery(input);
    if (!query) {
        return {
            status: 'skipped',
            message: 'Automatic coordinate lookup requires an address to search.',
        };
    }

    const baseUrl = settings.value.addressGeocodingBaseUrl.trim();
    if (!settings.value.addressGeocodingEnabled || !baseUrl) {
        return {
            status: 'disabled',
            message: 'Automatic coordinate lookup is disabled.',
        };
    }

    const cacheKey = query.toLowerCase();
    const cached = getCachedResult(cacheKey);
    if (cached) {
        return cached;
    }

    return await runRateLimited(async () => {
        const cachedAfterWait = getCachedResult(cacheKey);
        if (cachedAfterWait) {
            return cachedAfterWait;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), settings.value.addressGeocodingTimeoutMs);

        try {
            const url = new URL(baseUrl);
            url.searchParams.set('format', 'jsonv2');
            url.searchParams.set('limit', '1');
            url.searchParams.set('addressdetails', '0');
            url.searchParams.set('q', query);

            const response = await fetch(url.toString(), {
                signal: controller.signal,
                headers: {
                    'User-Agent': buildUserAgent(),
                    'Referer': settings.value.rootUrl,
                    'Accept': 'application/json',
                    'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
                },
            });

            if (!response.ok) {
                logger.warn({
                    statusCode: response.status,
                }, 'Address geocoding request failed');
                return {
                    status: 'error',
                    message: 'The geocoding service is temporarily unavailable.',
                };
            }

            const payload = await response.json() as unknown;
            const results = Array.isArray(payload) ? payload as NominatimSearchResult[] : [];
            const firstResult = results[0];
            if (!firstResult) {
                const result: AddressGeocodeResult = {
                    status: 'no_match',
                    message: 'Coordinates could not be resolved from the entered address.',
                };
                cacheResult(cacheKey, result);
                return result;
            }

            const latitude = Number(firstResult.lat);
            const longitude = Number(firstResult.lon);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                logger.warn('Address geocoding returned an invalid coordinate payload');
                return {
                    status: 'error',
                    message: 'The geocoding service returned an invalid coordinate payload.',
                };
            }

            const result: AddressGeocodeResult = {
                status: 'resolved',
                latitude,
                longitude,
            };
            cacheResult(cacheKey, result);
            return result;
        } catch (error) {
            logger.warn({
                error: error instanceof Error ? error.message : String(error),
            }, 'Address geocoding request errored');
            return {
                status: 'error',
                message: 'The geocoding service could not be reached.',
            };
        } finally {
            clearTimeout(timeout);
        }
    });
}

function buildQuery(input: AddressGeocodeInput): string {
    return [
        normalizeText(input.addressLine1),
        normalizeText(input.addressLine2),
        [normalizeText(input.postalCode), normalizeText(input.city)].filter(Boolean).join(' '),
        normalizeText(input.country),
    ]
        .filter(Boolean)
        .join(', ');
}

function normalizeText(value?: string | null): string {
    return typeof value === 'string' ? value.trim() : '';
}

function buildUserAgent(): string {
    const configured = settings.value.addressGeocodingUserAgent.trim();
    return configured || `DeliveryRoulette/1.0 (+${settings.value.rootUrl})`;
}

function getCachedResult(cacheKey: string): AddressGeocodeResult | null {
    const cached = cache.get(cacheKey);
    if (!cached) {
        return null;
    }

    if (cached.expiresAt <= Date.now()) {
        cache.delete(cacheKey);
        return null;
    }

    return {...cached.result};
}

function cacheResult(cacheKey: string, result: AddressGeocodeResult): void {
    cache.set(cacheKey, {
        expiresAt: Date.now() + settings.value.addressGeocodingCacheTtlMs,
        result: {...result},
    });
}

async function runRateLimited<T>(callback: () => Promise<T>): Promise<T> {
    let releaseCurrent!: () => void;
    const previous = rateLimitQueue;
    rateLimitQueue = new Promise<void>((resolve) => {
        releaseCurrent = resolve;
    });

    await previous;
    try {
        const waitMs = Math.max(0, nextAllowedRequestAt - Date.now());
        nextAllowedRequestAt = Date.now() + waitMs + settings.value.addressGeocodingMinIntervalMs;
        if (waitMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
        return await callback();
    } finally {
        releaseCurrent();
    }
}
