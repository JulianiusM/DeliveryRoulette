import {ProviderKey} from "./ProviderKey";
import {ProviderMenu, ProviderRestaurant, RateLimitPolicy} from "./ProviderTypes";

/**
 * Interface every delivery-provider connector must implement.
 *
 * Connectors are thin adapters that translate a provider's external API
 * into the normalised types consumed by the application.
 * They must NOT access application internals (database, controllers, etc.).
 *
 * The sync pipeline always follows the same flow for every connector:
 *   1. `listRestaurants()` — discover / list available restaurants
 *   2. Upsert each restaurant and its provider ref in the database
 *   3. `fetchMenu()` — fetch menu data per restaurant
 *   4. Upsert menu categories / items and recompute diet inference
 */
export interface DeliveryProviderConnector {
    /** The unique key that identifies this provider. */
    readonly providerKey: ProviderKey;

    /** Human-readable display name (e.g. "Uber Eats"). */
    readonly displayName: string;

    /** List restaurants available from this provider for the given query. */
    listRestaurants(query: string): Promise<ProviderRestaurant[]>;

    /** Fetch the full menu for a restaurant identified by its external ID. */
    fetchMenu(externalId: string): Promise<ProviderMenu>;

    /** Return the rate-limit policy the caller should respect. */
    rateLimitPolicy(): RateLimitPolicy;
}
