/**
 * Types used by the Lieferando connector and parsing module.
 */

/** A restaurant discovered from a Lieferando listing page. */
export interface DiscoveredRestaurant {
    name: string;
    menuUrl: string;
    cuisines?: string | null;
}

/** A menu item parsed from a Lieferando menu page. */
export interface ParsedMenuItem {
    name: string;
    description?: string | null;
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
