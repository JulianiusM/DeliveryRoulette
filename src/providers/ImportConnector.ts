import {DeliveryProviderConnector} from "./DeliveryProviderConnector";
import {ProviderKey} from "./ProviderKey";
import {ProviderMenu, ProviderRestaurant, RateLimitPolicy} from "./ProviderTypes";

/**
 * Import connector — wraps the bulk-import ingestion as a provider so
 * that restaurants created via import participate in the unified sync
 * pipeline and receive a {@link RestaurantProviderRef} with
 * `providerKey = "import"`.
 *
 * Because import is a **push-style** operation (data is supplied by the
 * user, not fetched from an external API), `listRestaurants` and
 * `fetchMenu` return empty results.  The sync runner will naturally
 * skip IMPORT refs that have no `externalId`.
 */
export const ImportConnector: DeliveryProviderConnector = {
    providerKey: ProviderKey.IMPORT,
    displayName: "Import",

    async listRestaurants(_query: string): Promise<ProviderRestaurant[]> {
        return [];
    },

    async fetchMenu(_externalId: string): Promise<ProviderMenu> {
        return {categories: []};
    },

    rateLimitPolicy(): RateLimitPolicy {
        return {maxRequests: Infinity, windowMs: 60_000};
    },
};
