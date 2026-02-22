/**
 * Lieferando delivery provider connector.
 *
 * FULLY ISOLATED from the application — accesses no app internals
 * (no database, no services, no settings). Uses native fetch for HTTP.
 *
 * Implements the DeliveryProviderConnector interface for integration
 * with the unified sync pipeline. Uses HTML fetching + parsing
 * (no official API).
 */
import {ConnectorCapabilities, DeliveryProviderConnector} from '../DeliveryProviderConnector';
import {ProviderKey} from '../ProviderKey';
import {ProviderMenu, ProviderRestaurant, RateLimitPolicy} from '../ProviderTypes';
import {parseListingHtml, parseMenuHtml} from './lieferandoParsing';

const USER_AGENT = 'DeliveryRoulette/1.0 (provider-sync)';
const FETCH_TIMEOUT_MS = 15_000;

export class LieferandoConnector implements DeliveryProviderConnector {
    readonly providerKey = ProviderKey.LIEFERANDO;
    readonly displayName = 'Lieferando';

    /**
     * List restaurants from a listing URL.
     * @param query  The listing URL to discover restaurants from
     */
    async listRestaurants(query: string): Promise<ProviderRestaurant[]> {
        if (!query) return [];

        const html = await this.fetchHtml(query);
        if (!html) return [];

        const discovered = parseListingHtml(html, query);

        return discovered.map(r => ({
            externalId: slugFromUrl(r.menuUrl),
            name: r.name,
            url: r.menuUrl,
        }));
    }

    /**
     * Fetch menu for a restaurant.
     * @param externalId  Either a full URL or a URL slug
     */
    async fetchMenu(externalId: string): Promise<ProviderMenu> {
        const menuUrl = externalId.startsWith('http')
            ? externalId
            : `https://www.lieferando.de/en/menu/${externalId}`;

        const html = await this.fetchHtml(menuUrl);
        if (!html) {
            return {categories: []};
        }

        const parsed = parseMenuHtml(html);

        return {
            categories: parsed.categories.map((cat, idx) => ({
                name: cat.name,
                items: cat.items.map((item, itemIdx) => ({
                    externalId: `${externalId}-${idx}-${itemIdx}`,
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    currency: item.currency,
                })),
            })),
        };
    }

    rateLimitPolicy(): RateLimitPolicy {
        return {maxRequests: 10, windowMs: 60_000};
    }

    capabilities(): ConnectorCapabilities {
        return {
            canDiscoverFromListingUrl: true,
            canImportFromUrl: true,
            importUrlHostPattern: 'lieferando.de',
            importUrlPathPattern: '/menu/',
            listingUrlLabel: 'Lieferando Listing URL',
            listingUrlPlaceholder: 'https://www.lieferando.de/en/delivery/food/...',
            importUrlLabel: 'Restaurant Menu URL',
            importUrlPlaceholder: 'https://www.lieferando.de/en/menu/restaurant-name',
        };
    }

    validateImportUrl(url: string): void {
        const parsed = parseUrl(url);
        const host = parsed.hostname.toLowerCase();
        if (host !== 'lieferando.de' && host !== 'www.lieferando.de') {
            throw new Error('URL must be from lieferando.de');
        }
        if (!parsed.pathname.includes('/menu/')) {
            throw new Error('URL must contain /menu/ path');
        }
    }

    validateListingUrl(url: string): void {
        const parsed = parseUrl(url);
        const host = parsed.hostname.toLowerCase();
        if (host !== 'lieferando.de' && host !== 'www.lieferando.de') {
            throw new Error('URL must be from lieferando.de');
        }
    }

    /**
     * Fetch HTML from a URL using native fetch.
     * Self-contained — no dependency on app httpClient.
     */
    private async fetchHtml(url: string): Promise<string | null> {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

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

                if (!response.ok) return null;
                return await response.text();
            } finally {
                clearTimeout(timer);
            }
        } catch {
            return null;
        }
    }
}

function slugFromUrl(url: string): string {
    const match = url.match(/\/menu\/([^/?#]+)/);
    return match ? match[1] : url;
}

function parseUrl(url: string): URL {
    try {
        return new URL(url);
    } catch {
        throw new Error('Invalid URL format');
    }
}
