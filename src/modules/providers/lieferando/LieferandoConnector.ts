/**
 * Lieferando delivery provider connector.
 *
 * Implements the DeliveryProviderConnector interface for integration
 * with the unified sync pipeline. Uses HTML fetching + parsing
 * (no official API).
 */
import {DeliveryProviderConnector} from '../../../providers/DeliveryProviderConnector';
import {ProviderKey} from '../../../providers/ProviderKey';
import {ProviderMenu, ProviderRestaurant, RateLimitPolicy} from '../../../providers/ProviderTypes';
import {parseListingHtml, parseMenuHtml} from './lieferandoParsing';
import * as fetchCacheService from '../ProviderFetchCacheService';

const LISTING_TTL = 6 * 60 * 60;   // 6 hours
const MENU_TTL = 24 * 60 * 60;     // 24 hours

export class LieferandoConnector implements DeliveryProviderConnector {
    readonly providerKey = ProviderKey.LIEFERANDO;
    readonly displayName = 'Lieferando';

    private listingUrl: string;

    constructor(listingUrl: string) {
        this.listingUrl = listingUrl;
    }

    async listRestaurants(_query: string): Promise<ProviderRestaurant[]> {
        if (!this.listingUrl) return [];

        const cached = await fetchCacheService.getOrFetch(
            this.providerKey,
            this.listingUrl,
            LISTING_TTL,
        );

        if (!cached || !cached.body) return [];

        const discovered = parseListingHtml(cached.body, this.listingUrl);

        return discovered.map(r => ({
            externalId: slugFromUrl(r.menuUrl),
            name: r.name,
            url: r.menuUrl,
        }));
    }

    async fetchMenu(externalId: string): Promise<ProviderMenu> {
        // externalId is the menu URL slug; reconstruct full URL
        const menuUrl = externalId.startsWith('http')
            ? externalId
            : `https://www.lieferando.de/en/menu/${externalId}`;

        const cached = await fetchCacheService.getOrFetch(
            this.providerKey,
            menuUrl,
            MENU_TTL,
        );

        if (!cached || !cached.body) {
            return {categories: []};
        }

        const parsed = parseMenuHtml(cached.body);

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
}

function slugFromUrl(url: string): string {
    const match = url.match(/\/menu\/([^/?#]+)/);
    return match ? match[1] : url;
}
