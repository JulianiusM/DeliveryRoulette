/**
 * Simple HTTP client wrapper for provider connector requests.
 *
 * Uses Node.js native fetch with:
 * - Configurable timeout (default 10s)
 * - Honest User-Agent header
 * - Gzip/deflate support
 * - Global concurrency limiting (max 2 concurrent requests)
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_CONCURRENT = 2;
const USER_AGENT = 'DeliveryRoulette/1.0 (provider-sync)';

let activeFetches = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
    if (activeFetches < MAX_CONCURRENT) {
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

export interface HttpResponse {
    status: number;
    body: string;
    ok: boolean;
}

/**
 * Fetch a URL with provider-appropriate defaults.
 *
 * @param url  The URL to fetch
 * @param timeoutMs  Request timeout in milliseconds (default: 10000)
 * @returns Resolved response with status, body text, and ok flag
 */
export async function fetchUrl(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<HttpResponse> {
    await acquireSlot();
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

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
