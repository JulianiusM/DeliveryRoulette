/**
 * Normalized payload types returned by delivery-provider connectors.
 *
 * Connectors translate provider-specific API responses into these
 * common shapes so the rest of the application stays provider-agnostic.
 */

/** A single menu item returned by a provider. */
export interface ProviderMenuItem {
    externalId: string;
    name: string;
    description?: string | null;
    dietContext?: string | null;
    allergens?: string[] | null;
    price?: number | null;
    currency?: string | null;
}

/** A menu category with its items. */
export interface ProviderMenuCategory {
    name: string;
    items: ProviderMenuItem[];
}

/** A complete menu for a restaurant as returned by a provider. */
export interface ProviderMenu {
    categories: ProviderMenuCategory[];
    restaurantName?: string | null;
    restaurantDetails?: {
        address?: string | null;
        addressLine2?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: string | null;
        openingHours?: string | null;
        openingDays?: string | null;
    };
}

/** A restaurant listing returned by a provider search / list call. */
export interface ProviderRestaurant {
    externalId: string;
    name: string;
    url: string;
    cuisines?: string[] | null;
    address?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    openingHours?: string | null;
    openingDays?: string | null;
    /** Additional provider references supplied by connectors. */
    providerRefs?: Array<{ providerKey: string; externalId?: string | null; url: string }>;
}

/** Rate-limit policy advertised by a connector. */
export interface RateLimitPolicy {
    /** Maximum requests allowed inside the window. */
    maxRequests: number;
    /** Window length in milliseconds. */
    windowMs: number;
}
