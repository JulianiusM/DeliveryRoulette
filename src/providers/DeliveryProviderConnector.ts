import {ProviderKey} from "./ProviderKey";
import {ProviderMenu, ProviderRestaurant, RateLimitPolicy} from "./ProviderTypes";

/**
 * Capabilities advertised by a connector.
 * The generic UI uses these to dynamically show relevant fields/actions.
 */
export interface ConnectorCapabilities {
    /** Whether this connector supports discovery from a listing URL. */
    canDiscoverFromListingUrl: boolean;
    /** Whether this connector supports importing a single restaurant from a URL. */
    canImportFromUrl: boolean;
    /** URL host pattern for import-from-url validation (e.g. "lieferando.de"). */
    importUrlHostPattern?: string;
    /** URL path pattern for import-from-url validation (e.g. "/menu/"). */
    importUrlPathPattern?: string;
    /** Label for the listing URL input field. */
    listingUrlLabel?: string;
    /** Placeholder for the listing URL input field. */
    listingUrlPlaceholder?: string;
    /** Label for the import URL input field. */
    importUrlLabel?: string;
    /** Placeholder for the import URL input field. */
    importUrlPlaceholder?: string;
}

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

    /** Return the capabilities of this connector for generic UI rendering. */
    capabilities(): ConnectorCapabilities;

    /**
     * Validate a URL for import-from-url.
     * Throws an Error if invalid; returns void if valid.
     * Only required when `capabilities().canImportFromUrl` is true.
     */
    validateImportUrl?(url: string): void;

    /**
     * Validate a listing URL.
     * Throws an Error if invalid; returns void if valid.
     * Only required when `capabilities().canDiscoverFromListingUrl` is true.
     */
    validateListingUrl?(url: string): void;
}
