/**
 * Types used by the Lieferando connector and parsing module.
 */

/** A restaurant discovered from a Lieferando listing page. */
export interface DiscoveredRestaurant {
    name: string;
    menuUrl: string;
    cuisines?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    openingHours?: string | null;
    openingDays?: string | null;
}

/** A menu item parsed from a Lieferando menu page. */
export interface ParsedMenuItem {
    sourceId?: string | null;
    name: string;
    description?: string | null;
    dietContext?: string | null;
    allergens?: string[] | null;
    price?: number | null;
    currency?: string | null;
}

/** A menu category parsed from a Lieferando menu page. */
export interface ParsedMenuCategory {
    name: string;
    items: ParsedMenuItem[];
}

/** Result of parsing a Lieferando menu page. */
export interface ParsedMenu {
    restaurantName?: string | null;
    restaurantNumericId?: string | null;
    restaurantDetails?: {
        address?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: string | null;
        openingHours?: string | null;
        openingDays?: string | null;
    } | null;
    categories: ParsedMenuCategory[];
    rawText: string;
    parseOk: boolean;
    warnings: string[];
}

/** A restaurant discovered from a menu URL, optionally with menu. */
export interface DiscoveredRestaurantWithMenu {
    name: string;
    menuUrl: string;
    menu?: ParsedMenu | null;
}
