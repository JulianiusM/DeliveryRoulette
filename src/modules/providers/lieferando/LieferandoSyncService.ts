/**
 * Lieferando sync service.
 *
 * Orchestrates listing-based sync and paste-URL import for
 * the Lieferando provider. Delegates restaurant/menu persistence
 * to existing services.
 */
import {ProviderKey} from '../../../providers/ProviderKey';
import {parseListingHtml, parseMenuHtml} from './lieferandoParsing';
import {DiscoveredRestaurant, ParsedMenu} from './lieferandoTypes';
import * as fetchCacheService from '../ProviderFetchCacheService';
import * as restaurantService from '../../database/services/RestaurantService';
import * as providerRefService from '../../database/services/RestaurantProviderRefService';
import * as menuService from '../../database/services/MenuService';
import {AppDataSource} from '../../database/dataSource';
import {MenuSnapshot} from '../../database/entities/provider/MenuSnapshot';
import {ProviderSourceConfig} from '../../database/entities/provider/ProviderSourceConfig';

const PROVIDER_KEY = ProviderKey.LIEFERANDO;
const LISTING_TTL = 6 * 60 * 60;   // 6 hours
const MENU_TTL = 24 * 60 * 60;     // 24 hours

export interface SyncFromListingResult {
    discovered: number;
    imported: number;
    errors: string[];
}

export interface ImportFromUrlResult {
    restaurantId: string;
    name: string;
    menuParsed: boolean;
    warning?: string;
}

// ── Source Config ──────────────────────────────────────────────

export async function getSourceConfig(userId: string): Promise<ProviderSourceConfig | null> {
    const repo = AppDataSource.getRepository(ProviderSourceConfig);
    return await repo.findOne({where: {userId, providerKey: PROVIDER_KEY}});
}

export async function saveSourceConfig(userId: string, listingUrl: string): Promise<ProviderSourceConfig> {
    const repo = AppDataSource.getRepository(ProviderSourceConfig);
    let config = await repo.findOne({where: {userId, providerKey: PROVIDER_KEY}});

    if (config) {
        config.listingUrl = listingUrl;
        config.updatedAt = new Date();
        return await repo.save(config);
    }

    config = repo.create({
        userId,
        providerKey: PROVIDER_KEY,
        listingUrl,
        isEnabled: true,
    });
    return await repo.save(config);
}

// ── Listing Sync ──────────────────────────────────────────────

export async function syncFromListingUrl(userId: string, listingUrl: string): Promise<SyncFromListingResult> {
    // Save config
    await saveSourceConfig(userId, listingUrl);

    // Fetch + parse listing
    const cached = await fetchCacheService.getOrFetch(PROVIDER_KEY, listingUrl, LISTING_TTL);
    if (!cached || !cached.body) {
        return {discovered: 0, imported: 0, errors: ['Failed to fetch listing page']};
    }

    const restaurants = parseListingHtml(cached.body, listingUrl);
    const errors: string[] = [];
    let imported = 0;

    for (const restaurant of restaurants) {
        try {
            const restaurantId = await upsertRestaurant(restaurant);
            await providerRefService.ensureProviderRef(
                restaurantId,
                PROVIDER_KEY,
                slugFromUrl(restaurant.menuUrl),
                restaurant.menuUrl,
            );
            imported++;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Failed to import ${restaurant.name}: ${msg}`);
        }
    }

    return {discovered: restaurants.length, imported, errors};
}

// ── Paste URL Import ──────────────────────────────────────────

export async function importFromMenuUrl(userId: string, menuUrl: string): Promise<ImportFromUrlResult> {
    // Validate URL
    validateLieferandoMenuUrl(menuUrl);

    // Fetch + parse menu
    const cached = await fetchCacheService.getOrFetch(PROVIDER_KEY, menuUrl, MENU_TTL);
    if (!cached || !cached.body) {
        throw new Error('Failed to fetch menu page');
    }

    const parsed = parseMenuHtml(cached.body);

    // Determine restaurant name
    const name = parsed.restaurantName || nameFromSlug(menuUrl);

    // Upsert restaurant
    const restaurantId = await restaurantService.upsertFromProvider({
        externalId: slugFromUrl(menuUrl),
        name,
        url: menuUrl,
    });

    // Ensure provider ref
    await providerRefService.ensureProviderRef(
        restaurantId,
        PROVIDER_KEY,
        slugFromUrl(menuUrl),
        menuUrl,
    );

    // Store menu snapshot
    await saveMenuSnapshot(restaurantId, menuUrl, cached.body, parsed);

    // If menu parsed, upsert categories/items
    let menuParsed = false;
    let warning: string | undefined;

    if (parsed.parseOk && parsed.categories.length > 0) {
        try {
            await upsertMenu(restaurantId, parsed);
            menuParsed = true;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            warning = `Restaurant imported but menu upsert failed: ${msg}`;
        }
    } else {
        warning = 'Restaurant imported but menu could not be parsed. Raw text was stored for heuristics.';
    }

    return {restaurantId, name, menuParsed, warning};
}

// ── URL Validation ────────────────────────────────────────────

export function validateLieferandoMenuUrl(url: string): void {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error('Invalid URL format');
    }

    const host = parsed.hostname.toLowerCase();
    if (host !== 'lieferando.de' && host !== 'www.lieferando.de') {
        throw new Error('URL must be from lieferando.de');
    }

    if (!parsed.pathname.includes('/menu/')) {
        throw new Error('URL must contain /menu/ path');
    }
}

export function validateLieferandoListingUrl(url: string): void {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error('Invalid URL format');
    }

    const host = parsed.hostname.toLowerCase();
    if (host !== 'lieferando.de' && host !== 'www.lieferando.de') {
        throw new Error('URL must be from lieferando.de');
    }
}

// ── Internal helpers ──────────────────────────────────────────

async function upsertRestaurant(restaurant: DiscoveredRestaurant): Promise<string> {
    return await restaurantService.upsertFromProvider({
        externalId: slugFromUrl(restaurant.menuUrl),
        name: restaurant.name,
        url: restaurant.menuUrl,
    });
}

async function upsertMenu(restaurantId: string, parsed: ParsedMenu): Promise<void> {
    const categoryData = parsed.categories.map((cat, idx) => ({
        name: cat.name,
        sortOrder: idx,
    }));
    const categories = await menuService.upsertCategories(restaurantId, categoryData);

    for (let i = 0; i < categories.length; i++) {
        const parsedCat = parsed.categories[i];
        if (!parsedCat) continue;

        const itemData = parsedCat.items.map((item, idx) => ({
            name: item.name,
            description: item.description,
            price: item.price,
            currency: item.currency,
            sortOrder: idx,
        }));
        await menuService.upsertItems(categories[i].id, itemData);
    }
}

async function saveMenuSnapshot(
    restaurantId: string,
    sourceUrl: string,
    rawHtml: string,
    parsed: ParsedMenu,
): Promise<void> {
    const repo = AppDataSource.getRepository(MenuSnapshot);
    const snapshot = repo.create({
        restaurantId,
        providerKey: PROVIDER_KEY,
        sourceUrl,
        fetchedAt: new Date(),
        rawHtml,
        rawText: parsed.rawText,
        parseOk: parsed.parseOk,
        parseWarningsJson: parsed.warnings.length > 0 ? JSON.stringify(parsed.warnings) : null,
    });
    await repo.save(snapshot);
}

function slugFromUrl(url: string): string {
    const match = url.match(/\/menu\/([^/?#]+)/);
    return match ? match[1] : url;
}

function nameFromSlug(url: string): string {
    const slug = slugFromUrl(url);
    return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}
