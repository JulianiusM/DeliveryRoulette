import {ProviderKey} from "./ProviderKey";
import {ProviderMenu, ProviderRestaurant, RateLimitPolicy} from "./ProviderTypes";

/**
 * Sync style determines how the provider pipeline obtains data.
 *
 * - **fetch**: The pipeline looks up existing {@link RestaurantProviderRef}
 *   rows and calls `fetchMenu()` for each one (external-API connectors).
 * - **push**: The connector itself provides the full restaurant list via
 *   `listRestaurants()`. The pipeline creates / updates restaurants and
 *   provider refs, then processes menus through the same shared path.
 */
export type SyncStyle = 'fetch' | 'push';

/**
 * Interface every delivery-provider connector must implement.
 *
 * Connectors are thin adapters that translate a provider's external API
 * into the normalised types consumed by the application.
 * They must NOT access application internals (database, controllers, etc.).
 */
export interface DeliveryProviderConnector {
    /** The unique key that identifies this provider. */
    readonly providerKey: ProviderKey;

    /** Human-readable display name (e.g. "Uber Eats"). */
    readonly displayName: string;

    /**
     * How this connector provides data to the sync pipeline.
     * Defaults to `'fetch'` when not specified.
     */
    readonly syncStyle?: SyncStyle;

    /** List restaurants available from this provider for the given query. */
    listRestaurants(query: string): Promise<ProviderRestaurant[]>;

    /** Fetch the full menu for a restaurant identified by its external ID. */
    fetchMenu(externalId: string): Promise<ProviderMenu>;

    /** Return the rate-limit policy the caller should respect. */
    rateLimitPolicy(): RateLimitPolicy;
}
