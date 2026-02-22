/**
 * Simple HTTP client wrapper for provider connector requests.
 *
 * Uses Node.js native fetch with:
 * - Configurable timeout (from settings)
 * - Honest User-Agent header
 * - Gzip/deflate support
 * - Global concurrency limiting (from settings)
 * - Per-provider token-bucket rate limiting
 */
import settings from '../settings';
import {RateLimitPolicy} from '../../providers/ProviderTypes';

const USER_AGENT = 'DeliveryRoulette/1.0 (provider-sync)';

let activeFetches = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
    const max = settings.value.providerHttpMaxConcurrent;
    if (activeFetches < max) {
        activeFetches++;
        return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
        waitQueue.push(resolve);
    });
}

function releaseSlot(): void {
    activeFetches--;
    if (waitQueue.length > 0) {
        activeFetches++;
        const next = waitQueue.shift()!;
        next();
    }
}

// ── Per-provider token-bucket rate limiter ───────────────────

interface TokenBucket {
    tokens: number;
    maxTokens: number;
    refillMs: number;
    lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

function acquireRateToken(providerKey: string, policy: RateLimitPolicy): Promise<void> {
    let bucket = buckets.get(providerKey);
    if (!bucket) {
        bucket = {
            tokens: policy.maxRequests,
            maxTokens: policy.maxRequests,
            refillMs: policy.windowMs,
            lastRefill: Date.now(),
        };
        buckets.set(providerKey, bucket);
    }

    // Refill tokens based on elapsed time
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    if (elapsed >= bucket.refillMs) {
        const periods = Math.floor(elapsed / bucket.refillMs);
        bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + periods * bucket.maxTokens);
        bucket.lastRefill += periods * bucket.refillMs;
    }

    if (bucket.tokens > 0) {
        bucket.tokens--;
        return Promise.resolve();
    }

    // Wait until next refill
    const waitMs = bucket.refillMs - (now - bucket.lastRefill);
    return new Promise((resolve) => setTimeout(() => {
        bucket!.tokens = bucket!.maxTokens - 1;
        bucket!.lastRefill = Date.now();
        resolve();
    }, waitMs));
}

export interface HttpResponse {
    status: number;
    body: string;
    ok: boolean;
}

/**
 * Fetch a URL with provider-appropriate defaults.
 *
 * @param url  The URL to fetch
 * @param options  Optional: timeoutMs and rateLimit policy
 * @returns Resolved response with status, body text, and ok flag
 */
export async function fetchUrl(
    url: string,
    options?: {timeoutMs?: number; providerKey?: string; rateLimit?: RateLimitPolicy},
): Promise<HttpResponse> {
    const timeout = options?.timeoutMs ?? settings.value.providerHttpTimeoutMs;

    // Enforce per-provider rate limiting if provided
    if (options?.providerKey && options?.rateLimit) {
        await acquireRateToken(options.providerKey, options.rateLimit);
    }

    await acquireSlot();
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate',
                    'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
                },
            });

            const body = await response.text();
            return {
                status: response.status,
                body,
                ok: response.ok,
            };
        } finally {
            clearTimeout(timer);
        }
    } finally {
        releaseSlot();
    }
}
