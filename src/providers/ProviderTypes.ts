/**
 * Normalized payload types returned by delivery-provider connectors.
 *
 * Connectors translate provider-specific API responses into these
 * common shapes so the rest of the application stays provider-agnostic.
 */

export type ProviderServiceType = 'delivery' | 'collection';

export interface ProviderLocationInput {
    label?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    providerAreaId?: string | null;
    providerLocationSlug?: string | null;
    listingUrl?: string | null;
}

export interface ProviderLocationResolution {
    providerKey: string;
    providerAreaId?: string | null;
    providerLocationSlug?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    status: 'resolved' | 'partial' | 'unresolved' | 'error';
    rawResolutionJson?: string | null;
    expiresAt?: Date | null;
}

export interface ProviderLocationContext {
    sourceLocationId?: string | null;
    providerKey: string;
    providerAreaId?: string | null;
    providerLocationSlug?: string | null;
    latitude?: number | null;
    longitude?: number | null;
}

export interface ProviderRestaurantListRequest {
    query?: string;
    locationContext?: ProviderLocationContext | null;
}

export interface ProviderAvailabilityFeeBand {
    label?: string | null;
    minOrderAmountMinor?: number | null;
    feeMinor?: number | null;
}

export interface ProviderRestaurantAvailability {
    providerRestaurantId: string;
    providerNativeId?: string | null;
    serviceType: ProviderServiceType;
    isAvailable: boolean;
    isTemporaryOffline?: boolean;
    isThrottled?: boolean;
    etaMin?: number | null;
    etaMax?: number | null;
    minOrderAmountMinor?: number | null;
    currency?: string | null;
    feeBands?: ProviderAvailabilityFeeBand[] | null;
    bagFeeMinor?: number | null;
    serviceFeeMinor?: number | null;
    smallOrderFeeMinor?: number | null;
    observedAt?: Date;
    expiresAt?: Date | null;
    rawPayloadJson?: string | null;
}

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
    providerNativeId?: string | null;
    providerIdentityJson?: string | null;
    restaurantDetails?: {
        address?: string | null;
        addressLine2?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        openingHours?: string | null;
        openingDays?: string | null;
    };
}

/** A restaurant listing returned by a provider search / list call. */
export interface ProviderRestaurant {
    externalId: string;
    providerNativeId?: string | null;
    providerIdentityJson?: string | null;
    name: string;
    url: string;
    cuisines?: string[] | null;
    address?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    openingHours?: string | null;
    openingDays?: string | null;
    rawListingJson?: string | null;
    /** Additional provider references supplied by connectors. */
    providerRefs?: Array<{
        providerKey: string;
        externalId?: string | null;
        providerNativeId?: string | null;
        providerIdentityJson?: string | null;
        url: string;
    }>;
}

/** Rate-limit policy advertised by a connector. */
export interface RateLimitPolicy {
    /** Maximum requests allowed inside the window. */
    maxRequests: number;
    /** Window length in milliseconds. */
    windowMs: number;
}
