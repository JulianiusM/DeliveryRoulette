/**
 * Lieferando delivery provider connector.
 *
 * FULLY ISOLATED from the application — accesses no app internals
 * (no database, no services, no settings). Uses native fetch for HTTP.
 *
 * Implements the DeliveryProviderConnector interface for integration
 * with the unified sync pipeline. Uses HTML fetching + parsing
 * (no official API).
 */
import {ConnectorCapabilities, DeliveryProviderConnector} from '../DeliveryProviderConnector';
import {ProviderKey} from '../ProviderKey';
import {
    ProviderLocationContext,
    ProviderLocationInput,
    ProviderLocationResolution,
    ProviderMenu,
    ProviderRestaurant,
    ProviderRestaurantAvailability,
    ProviderRestaurantListRequest,
    RateLimitPolicy,
} from '../ProviderTypes';
import {parseListingHtml, parseMenuHtml} from './lieferandoParsing';
import type {ParsedMenu, ParsedMenuCategory} from './lieferandoTypes';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 15_000;
const CURL_TIMEOUT_SECONDS = Math.ceil(FETCH_TIMEOUT_MS / 1000);
const CURL_STATUS_MARKER = '__DR_STATUS__:';
const CDN_BASE_URLS = [
    'https://globalmenucdn.eu-central-1.production.jet-external.com',
    'https://menu-globalmenucdn.justeat-int.com',
];
const COUNTRY_CODE = 'de';
const execFileAsync = promisify(execFile);

export interface LieferandoConnectorConfig {
    /** Number of concurrent allergen API requests per batch. Default: 5 */
    allergenFetchBatchSize?: number;
    /** Whether to include "mayContain" level allergens. Default: true */
    includeMayContainAllergens?: boolean;
}

type DietModifierGroupKind = 'preparation' | 'choice' | 'addon';

interface CdnDietModifierGroup {
    id: string;
    kind: DietModifierGroupKind;
    name: string | null;
    dietLabels: string[];
    optionLabels: string[];
}

export class LieferandoConnector implements DeliveryProviderConnector {
    readonly providerKey = ProviderKey.LIEFERANDO;
    readonly displayName = 'Lieferando';

    private readonly config: Required<LieferandoConnectorConfig>;

    constructor(config: LieferandoConnectorConfig = {}) {
        this.config = {
            allergenFetchBatchSize: config.allergenFetchBatchSize ?? 5,
            includeMayContainAllergens: config.includeMayContainAllergens ?? true,
        };
    }

    /**
     * List restaurants from a listing URL.
     * @param request  The listing request to discover restaurants from
     */
    async listRestaurants(request: ProviderRestaurantListRequest): Promise<ProviderRestaurant[]> {
        const query = request.query?.trim() || '';
        if (!query) return [];

        const html = await this.fetchHtml(query, {
            context: 'listing',
            throwOnFailure: true,
        });
        if (!html) {
            throw new Error('listing request failed: empty response');
        }
        if (looksLikeBotProtectionPage(html)) {
            throw new Error('Lieferando returned a bot-protection page; cannot discover restaurants from this listing URL right now');
        }

        const discovered = parseListingHtml(html, query);

        const deduped = new Map<string, ProviderRestaurant>();

        for (const r of discovered) {
            const externalId = slugFromUrl(r.menuUrl);
            const normalized: ProviderRestaurant = {
                externalId,
                providerNativeId: r.providerNativeId ?? null,
                providerIdentityJson: r.providerNativeId
                    ? JSON.stringify({restaurantNumericId: r.providerNativeId})
                    : null,
                name: r.name,
                url: r.menuUrl,
                cuisines: parseCuisineList(r.cuisines),
                address: r.address ?? null,
                city: r.city ?? null,
                postalCode: r.postalCode ?? null,
                country: r.country ?? null,
                openingHours: r.openingHours ?? null,
                openingDays: r.openingDays ?? null,
                rawListingJson: r.rawListingJson ?? null,
            };

            const existing = deduped.get(externalId);
            if (!existing) {
                deduped.set(externalId, normalized);
                continue;
            }

            const preferNewUrl = existing.url.includes('/restaurant/') && normalized.url.includes('/menu/');
            deduped.set(externalId, {
                ...existing,
                ...normalized,
                name: existing.name || normalized.name,
                url: preferNewUrl ? normalized.url : existing.url,
                providerNativeId: existing.providerNativeId ?? normalized.providerNativeId ?? null,
                providerIdentityJson: existing.providerIdentityJson ?? normalized.providerIdentityJson ?? null,
                cuisines: existing.cuisines && existing.cuisines.length > 0
                    ? existing.cuisines
                    : (normalized.cuisines ?? null),
                address: existing.address ?? normalized.address ?? null,
                city: existing.city ?? normalized.city ?? null,
                postalCode: existing.postalCode ?? normalized.postalCode ?? null,
                country: existing.country ?? normalized.country ?? null,
                openingHours: existing.openingHours ?? normalized.openingHours ?? null,
                openingDays: existing.openingDays ?? normalized.openingDays ?? null,
                rawListingJson: existing.rawListingJson ?? normalized.rawListingJson ?? null,
            });
        }

        return [...deduped.values()];
    }

    async resolveLocation(location: ProviderLocationInput): Promise<ProviderLocationResolution | null> {
        const providerLocationSlug = normalizeLocationValue(location.providerLocationSlug)
            ?? extractLocationSlugFromListingUrl(location.listingUrl ?? null);
        const providerAreaId = normalizeLocationValue(location.providerAreaId);
        const latitude = Number.isFinite(location.latitude) ? Number(location.latitude) : null;
        const longitude = Number.isFinite(location.longitude) ? Number(location.longitude) : null;

        if (!providerLocationSlug && !providerAreaId && latitude === null && longitude === null) {
            return null;
        }

        return {
            providerKey: this.providerKey,
            providerAreaId,
            providerLocationSlug,
            latitude,
            longitude,
            status: providerAreaId && latitude !== null && longitude !== null ? 'resolved' : 'partial',
            rawResolutionJson: JSON.stringify({
                listingUrl: location.listingUrl ?? null,
                providerAreaId,
                providerLocationSlug,
                latitude,
                longitude,
            }),
        };
    }

    async fetchAvailability(
        providerRestaurantId: string,
        locationContext: ProviderLocationContext,
        orderTime: Date,
    ): Promise<ProviderRestaurantAvailability[]> {
        void providerRestaurantId;
        void locationContext;
        void orderTime;

        throw new Error(
            'Lieferando availability fetch is not implemented yet; TODO: wire the captured dynamic availability endpoint into this connector.',
        );
    }

    /**
     * Fetch menu for a restaurant.
     * @param externalId  Either a full URL or a URL slug
     */
    async fetchMenu(externalId: string): Promise<ProviderMenu> {
        const menuUrl = externalId.startsWith('http')
            ? externalId
            : `https://www.lieferando.de/en/menu/${externalId}`;

        const html = await this.fetchHtml(menuUrl, {
            context: 'menu',
            throwOnFailure: false,
        });
        let parsedFromHtml: ParsedMenu | null = null;
        let restaurantNumericId: string | null = null;

        if (html && !looksLikeBotProtectionPage(html) && hasTrustedMenuSignals(html)) {
            parsedFromHtml = parseMenuHtml(html);
            restaurantNumericId = parsedFromHtml.restaurantNumericId ?? null;
        }

        const parsedFromCdn = await this.fetchMenuFromCdn(menuUrl, html);
        if (parsedFromCdn && hasMenuItems(parsedFromCdn.categories)) {
            restaurantNumericId = restaurantNumericId ?? parsedFromCdn.restaurantNumericId ?? null;
            await this.enrichWithAllergens(parsedFromCdn.categories, restaurantNumericId);
            return toProviderMenu(parsedFromCdn, externalId);
        }

        if (parsedFromHtml && hasMenuItems(parsedFromHtml.categories)) {
            await this.enrichWithAllergens(parsedFromHtml.categories, restaurantNumericId);
            return toProviderMenu(parsedFromHtml, externalId);
        }

        return {categories: []};
    }

    rateLimitPolicy(): RateLimitPolicy {
        return {maxRequests: 10, windowMs: 60_000};
    }

    capabilities(): ConnectorCapabilities {
        return {
            canDiscoverFromListingUrl: true,
            canImportFromUrl: true,
            importUrlHostPattern: 'lieferando.de',
            importUrlPathPattern: '/menu/',
            listingUrlLabel: 'Lieferando Listing URL',
            listingUrlPlaceholder: 'https://www.lieferando.de/en/delivery/food/...',
            importUrlLabel: 'Restaurant Menu URL',
            importUrlPlaceholder: 'https://www.lieferando.de/en/menu/restaurant-name',
        };
    }

    validateImportUrl(url: string): void {
        const parsed = parseUrl(url);
        if (parsed.protocol !== 'https:') {
            throw new Error('URL must use HTTPS protocol');
        }
        const host = parsed.hostname.toLowerCase();
        if (host !== 'lieferando.de' && host !== 'www.lieferando.de') {
            throw new Error('URL must be from lieferando.de');
        }
        if (!parsed.pathname.includes('/menu/')) {
            throw new Error('URL must contain /menu/ path');
        }
    }

    validateListingUrl(url: string): void {
        const parsed = parseUrl(url);
        if (parsed.protocol !== 'https:') {
            throw new Error('URL must use HTTPS protocol');
        }
        const host = parsed.hostname.toLowerCase();
        if (host !== 'lieferando.de' && host !== 'www.lieferando.de') {
            throw new Error('URL must be from lieferando.de');
        }
    }

    /**
     * Fetch HTML from a URL using native fetch.
     * Self-contained — no dependency on app httpClient.
     */
    private async fetchHtml(url: string, options: {
        context: 'listing' | 'menu';
        throwOnFailure: boolean;
    }): Promise<string | null> {
        let lastError: Error | null = null;

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

            try {
                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': USER_AGENT,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en,de;q=0.9,en-US;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br, zstd',
                        'DNT': '1',
                        'Sec-GPC': '1',
                        'Referer': 'https://www.lieferando.de/',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Cache-Control': 'no-cache',
                    },
                });

                if (!response.ok) {
                    lastError = new Error(`${options.context} request failed: HTTP ${response.status} ${response.statusText}`.trim());

                    const curlBody = await this.fetchHtmlWithCurl(url);
                    if (curlBody) {
                        return curlBody;
                    }

                    if (options.throwOnFailure) {
                        throw lastError;
                    }
                    return null;
                }

                const body = await response.text();
                if (looksLikeBotProtectionPage(body)) {
                    const curlBody = await this.fetchHtmlWithCurl(url);
                    if (curlBody && !looksLikeBotProtectionPage(curlBody)) {
                        return curlBody;
                    }
                }

                return body;
            } finally {
                clearTimeout(timer);
            }
        } catch (err) {
            if (err instanceof Error) {
                lastError = err;
            } else {
                lastError = new Error(`${options.context} request failed`);
            }

            const curlBody = await this.fetchHtmlWithCurl(url);
            if (curlBody) {
                return curlBody;
            }

            if (options.throwOnFailure) {
                throw lastError;
            }
            return null;
        }
    }

    private async fetchHtmlWithCurl(url: string): Promise<string | null> {
        if (!canUseCurlFallback()) {
            return null;
        }

        const args = [
            '--silent',
            '--show-error',
            '--location',
            '--compressed',
            '--max-time',
            String(CURL_TIMEOUT_SECONDS),
            '--request',
            'GET',
            '--header',
            `User-Agent: ${USER_AGENT}`,
            '--header',
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            '--header',
            'Accept-Language: en,de;q=0.9,en-US;q=0.8',
            '--header',
            'Accept-Encoding: gzip, deflate, br, zstd',
            '--header',
            'DNT: 1',
            '--header',
            'Sec-GPC: 1',
            '--header',
            'Referer: https://www.lieferando.de/',
            '--header',
            'Upgrade-Insecure-Requests: 1',
            '--header',
            'Sec-Fetch-Dest: document',
            '--header',
            'Sec-Fetch-Mode: navigate',
            '--header',
            'Sec-Fetch-Site: none',
            '--header',
            'Sec-Fetch-User: ?1',
            '--write-out',
            `\\n${CURL_STATUS_MARKER}%{http_code}`,
            url,
        ];

        try {
            const {stdout} = await execFileAsync('curl', args, {
                maxBuffer: 20 * 1024 * 1024,
            });

            const markerIndex = stdout.lastIndexOf(CURL_STATUS_MARKER);
            if (markerIndex === -1) {
                return null;
            }

            const statusPart = stdout.slice(markerIndex + CURL_STATUS_MARKER.length).trim();
            const status = Number.parseInt(statusPart, 10);
            if (!Number.isFinite(status) || status < 200 || status >= 300) {
                return null;
            }

            return stdout.slice(0, markerIndex).trimEnd();
        } catch {
            return null;
        }
    }

    private async fetchMenuFromCdn(menuUrl: string, html: string | null): Promise<ParsedMenu | null> {
        const candidates = buildManifestCandidates(menuUrl, html);

        for (const manifestUrl of candidates) {
            const manifestJson = await this.fetchJson(manifestUrl);
            if (!manifestJson || !isCdnManifest(manifestJson)) {
                continue;
            }

            const manifest = manifestJson as Record<string, unknown>;
            const itemsUrl = resolveCdnUrl(manifestUrl, asTrimmedString(manifest.ItemsUrl));
            const truncatedUrl = resolveCdnUrl(manifestUrl, asTrimmedString(manifest.TruncatedUrl));
            const itemDetailsUrl = resolveCdnUrl(manifestUrl, asTrimmedString(manifest.ItemDetailsUrl));

            if (!itemsUrl && !truncatedUrl) {
                continue;
            }

            const itemsJson = itemsUrl ? await this.fetchJson(itemsUrl) : null;
            const truncatedJson = truncatedUrl ? await this.fetchJson(truncatedUrl) : null;
            const itemDetailsJson = itemDetailsUrl ? await this.fetchJson(itemDetailsUrl) : null;

            if (!isObjectRecord(itemsJson) && !isObjectRecord(truncatedJson)) {
                continue;
            }

            const parsed = parseCdnMenuPayload(manifest, {
                itemsPayload: isObjectRecord(itemsJson) ? itemsJson : null,
                truncatedPayload: isObjectRecord(truncatedJson) ? truncatedJson : null,
                itemDetailsPayload: isObjectRecord(itemDetailsJson) ? itemDetailsJson : null,
            });
            if (hasMenuItems(parsed.categories)) {
                return parsed;
            }
        }

        return null;
    }

    /**
     * Enrich parsed menu items with allergen data from the Lieferando product information API.
     *
     * For each item that has a sourceId (variation/product UUID) and no existing allergen data,
     * fetches allergen info from the Lieferando REST API. Items that already have allergens
     * from HTML/CDN parsing are preserved as-is.
     *
     * No-op when restaurantNumericId is null (restaurant ID could not be extracted from page data).
     */
    private async enrichWithAllergens(categories: ParsedMenuCategory[], restaurantNumericId: string | null): Promise<void> {
        if (!restaurantNumericId) return;

        const productIds: Array<{categoryIdx: number; itemIdx: number; productId: string}> = [];
        for (let ci = 0; ci < categories.length; ci++) {
            for (let ii = 0; ii < categories[ci].items.length; ii++) {
                const item = categories[ci].items[ii];
                if (item.sourceId && !item.allergens?.length) {
                    productIds.push({categoryIdx: ci, itemIdx: ii, productId: item.sourceId});
                }
            }
        }

        if (productIds.length === 0) return;

        // Fetch allergens in parallel batches to avoid overwhelming the API
        const batchSize = this.config.allergenFetchBatchSize;
        for (let i = 0; i < productIds.length; i += batchSize) {
            const batch = productIds.slice(i, i + batchSize);
            const results = await Promise.allSettled(
                batch.map(async ({productId}) => {
                    const allergens = await this.fetchProductAllergens(restaurantNumericId, productId);
                    return {productId, allergens};
                }),
            );

            for (let j = 0; j < batch.length; j++) {
                const result = results[j];
                if (result.status === 'fulfilled' && result.value.allergens.length > 0) {
                    const {categoryIdx, itemIdx} = batch[j];
                    categories[categoryIdx].items[itemIdx].allergens = result.value.allergens;
                }
            }
        }
    }

    /**
     * Fetch allergens for a single product/variation from the Lieferando REST API.
     */
    private async fetchProductAllergens(restaurantId: string, productId: string): Promise<string[]> {
        const url = `https://rest.api.eu-central-1.production.jet-external.com/restaurants/${COUNTRY_CODE}/${restaurantId}/products/${productId}/information`;

        try {
            const data = await this.fetchJson(url) as Record<string, unknown> | null;
            if (!data) return [];
            return parseAllergenResponse(data, this.config.includeMayContainAllergens);
        } catch {
            return [];
        }
    }

    private async fetchJson(url: string): Promise<unknown | null> {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
            try {
                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': USER_AGENT,
                        'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en,de;q=0.9,en-US;q=0.8',
                        'Cache-Control': 'no-cache',
                        'Referer': 'https://www.lieferando.de/',
                    },
                });
                if (!response.ok) {
                    return await this.fetchJsonWithCurl(url);
                }
                return await response.json();
            } finally {
                clearTimeout(timer);
            }
        } catch {
            return await this.fetchJsonWithCurl(url);
        }
    }

    private async fetchJsonWithCurl(url: string): Promise<unknown | null> {
        if (!canUseCurlFallback()) {
            return null;
        }

        const args = [
            '--silent',
            '--show-error',
            '--location',
            '--compressed',
            '--max-time',
            String(CURL_TIMEOUT_SECONDS),
            '--request',
            'GET',
            '--header',
            `User-Agent: ${USER_AGENT}`,
            '--header',
            'Accept: application/json,text/plain;q=0.9,*/*;q=0.8',
            '--header',
            'Accept-Language: en,de;q=0.9,en-US;q=0.8',
            '--header',
            'Referer: https://www.lieferando.de/',
            '--write-out',
            `\\n${CURL_STATUS_MARKER}%{http_code}`,
            url,
        ];

        try {
            const {stdout} = await execFileAsync('curl', args, {
                maxBuffer: 20 * 1024 * 1024,
            });

            const markerIndex = stdout.lastIndexOf(CURL_STATUS_MARKER);
            if (markerIndex === -1) {
                return null;
            }

            const statusPart = stdout.slice(markerIndex + CURL_STATUS_MARKER.length).trim();
            const status = Number.parseInt(statusPart, 10);
            if (!Number.isFinite(status) || status < 200 || status >= 300) {
                return null;
            }

            const rawBody = stdout.slice(0, markerIndex).trimEnd();
            return JSON.parse(rawBody);
        } catch {
            return null;
        }
    }
}

function toProviderMenu(parsed: ParsedMenu, externalId: string): ProviderMenu {
    return {
        restaurantName: parsed.restaurantName ?? null,
        providerNativeId: parsed.restaurantNumericId ?? null,
        providerIdentityJson: parsed.restaurantNumericId
            ? JSON.stringify({restaurantNumericId: parsed.restaurantNumericId})
            : null,
        categories: parsed.categories.map((cat, idx) => ({
            name: cat.name,
            items: cat.items.map((item, itemIdx) => ({
                externalId: item.sourceId?.trim()
                    ? item.sourceId.trim()
                    : `${externalId}-${idx}-${itemIdx}`,
                name: item.name,
                description: item.description,
                dietContext: item.dietContext ?? null,
                allergens: item.allergens ?? null,
                price: item.price,
                currency: item.currency,
            })),
        })),
        restaurantDetails: parsed.restaurantDetails ?? undefined,
    };
}

function hasMenuItems(categories: ParsedMenuCategory[]): boolean {
    return categories.some((category) => category.items.length > 0);
}

function buildManifestCandidates(menuUrl: string, html: string | null): string[] {
    const candidates: string[] = [];
    const slug = slugFromUrl(menuUrl);
    const locale = localeFromUrl(menuUrl);

    const addCandidate = (value: string | null): void => {
        if (!value) return;
        const normalized = value.trim();
        if (!normalized) return;
        if (!candidates.includes(normalized)) {
            candidates.push(normalized);
        }
    };

    if (html) {
        const regex = /"ManifestUrl"\s*:\s*"([^"]+?\.json)"/gi;
        let match: RegExpExecArray | null = regex.exec(html);
        while (match) {
            for (const baseUrl of CDN_BASE_URLS) {
                addCandidate(resolveCdnUrl(baseUrl, decodeEscapedJsonString(match[1])));
            }
            match = regex.exec(html);
        }
    }

    for (const baseUrl of CDN_BASE_URLS) {
        addCandidate(`${baseUrl}/${slug}_${COUNTRY_CODE}_manifest_${locale}.json`);
        addCandidate(`${baseUrl}/${slug}_${COUNTRY_CODE}_manifest.json`);
        addCandidate(`${baseUrl}/${slug}_manifest_${locale}.json`);
        addCandidate(`${baseUrl}/${slug}_manifest.json`);
    }

    return candidates;
}

function decodeEscapedJsonString(value: string): string {
    return value
        .replace(/\\\//g, '/')
        .replace(/\\"/g, '"')
        .trim();
}

function localeFromUrl(menuUrl: string): string {
    try {
        const parsed = new URL(menuUrl);
        const firstSegment = parsed.pathname.split('/').filter(Boolean)[0];
        if (firstSegment && /^[a-z]{2}$/i.test(firstSegment)) {
            return firstSegment.toLowerCase();
        }
    } catch {
        // Ignore invalid URL and fall back to english.
    }
    return 'en';
}

function isCdnManifest(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    const record = value as Record<string, unknown>;
    const menus = Array.isArray(record.Menus)
        ? record.Menus
        : Array.isArray(record.menus)
            ? record.menus
            : null;
    return Array.isArray(menus) && menus.length > 0;
}

function parseCdnMenuPayload(
    manifest: Record<string, unknown>,
    payloads: {
        itemsPayload: Record<string, unknown> | null;
        truncatedPayload: Record<string, unknown> | null;
        itemDetailsPayload: Record<string, unknown> | null;
    },
): ParsedMenu {
    const menus = extractCdnMenus([
        payloads.truncatedPayload,
        manifest,
        payloads.itemsPayload,
    ]);
    const itemMap = buildCdnItemMap([
        payloads.itemsPayload,
        payloads.truncatedPayload,
    ]);
    const itemDetailsMap = buildCdnItemMap([
        payloads.itemDetailsPayload,
    ]);
    const dietModifierGroupsById = parseCdnDietModifierGroups(payloads.itemDetailsPayload);
    const modifierGroupNamesById = parseCdnModifierGroupNames(payloads.itemDetailsPayload);
    const categories = parseCdnCategories(menus, itemMap, itemDetailsMap, dietModifierGroupsById, modifierGroupNamesById);

    return {
        restaurantName: parseCdnRestaurantName(manifest),
        restaurantNumericId: parseCdnRestaurantNumericId(manifest),
        restaurantDetails: parseCdnRestaurantDetails(manifest),
        categories,
        rawText: categoriesToRawText(categories),
        parseOk: hasMenuItems(categories),
        warnings: [],
    };
}

function extractCdnMenus(
    payloads: Array<Record<string, unknown> | null>,
): Record<string, unknown>[] {
    const menus: Record<string, unknown>[] = [];
    for (const payload of payloads) {
        if (!payload) continue;
        const rawMenus = Array.isArray(payload.Menus)
            ? payload.Menus
            : Array.isArray(payload.menus)
                ? payload.menus
                : [];
        for (const rawMenu of rawMenus) {
            if (!rawMenu || typeof rawMenu !== 'object') continue;
            menus.push(rawMenu as Record<string, unknown>);
        }
    }
    return menus;
}

function buildCdnItemMap(
    payloads: Array<Record<string, unknown> | null>,
): Map<string, Record<string, unknown>> {
    const map = new Map<string, Record<string, unknown>>();

    for (const payload of payloads) {
        if (!payload) continue;
        const rawItems = Array.isArray(payload.Items)
            ? payload.Items
            : Array.isArray(payload.items)
                ? payload.items
                : [];

        for (const rawItem of rawItems) {
            if (!rawItem || typeof rawItem !== 'object') continue;
            const item = rawItem as Record<string, unknown>;
            const id = asTrimmedString(item.Id) ?? asTrimmedString(item.id);
            if (!id) continue;

            const existing = map.get(id);
            map.set(id, existing ? {...existing, ...item} : item);
        }
    }

    return map;
}

/**
 * Diet-related keyword patterns for matching modifier names.
 * Covers English and German terms commonly found on Lieferando.
 */
const DIET_MODIFIER_PATTERNS: RegExp[] = [
    /\bvegan\b/i,
    /\bvegetari(an|sch)\b/i,
    /\bpflanzlich\b/i,
    /\bplant[- ]?based\b/i,
    /\bgluten[- ]?fr(ee|ei)\b/i,
    /\blakto(se)?[- ]?frei\b/i,
    /\blactose[- ]?free\b/i,
    /\bdairy[- ]?free\b/i,
    /\bmilchfrei\b/i,
    /\bhalal\b/i,
];

const PREPARATION_MODIFIER_GROUP_PATTERNS: RegExp[] = [
    /\bprepar(?:ed|ation)?\b/i,
    /\bzubereit(?:et|ung)?\b/i,
];

const ACCESSORY_MODIFIER_GROUP_PATTERNS: RegExp[] = [
    /\bdip\b/i,
    /\bsauce\b/i,
    /\bmayo\b/i,
    /\bmayonnaise\b/i,
    /\bdressing\b/i,
    /\bdrink\b/i,
    /\bbeverage\b/i,
    /\bgetrank\b/i,
    /\bdessert\b/i,
    /\bside\b/i,
    /\bbeilage\b/i,
    /\bextra\b/i,
    /\bextras\b/i,
    /\badd[- ]?on\b/i,
];

const CORE_REPLACEMENT_MODIFIER_GROUP_PATTERNS: RegExp[] = [
    /\bcheese\b/i,
    /\bkase\b/i,
    /\bmozzarella\b/i,
    /\bcheddar\b/i,
    /\bpatty\b/i,
    /\bprotein\b/i,
    /\bmeat\b/i,
    /\bfleisch\b/i,
    /\bchicken\b/i,
    /\bhuhn\b/i,
    /\bhahnchen\b/i,
    /\bbeef\b/i,
    /\brind\b/i,
    /\bham\b/i,
    /\bschinken\b/i,
    /\bsalami\b/i,
    /\bbacon\b/i,
    /\bspeck\b/i,
    /\btuna\b/i,
    /\bthunfisch\b/i,
    /\bfish\b/i,
    /\bfisch\b/i,
    /\bdough\b/i,
    /\bteig\b/i,
    /\bcrust\b/i,
    /\bboden\b/i,
    /\bbun\b/i,
    /\bbread\b/i,
    /\bbrot\b/i,
    /\bbrotchen\b/i,
    /\bfilling\b/i,
    /\bbelag\b/i,
    /\bmilk\b/i,
    /\bmilch\b/i,
    /\begg\b/i,
    /\beggs\b/i,
    /\bei\b/i,
    /\beier\b/i,
];

const SINGLE_SELECT_MODIFIER_GROUP_PATTERNS: RegExp[] = [
    /\bchoose\b[^.!?]{0,20}\b1\b/i,
    /\bselect\b[^.!?]{0,20}\b1\b/i,
    /\bpick\b[^.!?]{0,20}\b1\b/i,
    /\bexactly one\b/i,
    /\bone choice\b/i,
    /\b1 choice\b/i,
    /\bbitte\b[^.!?]{0,30}\b(1|eine?n?)\b[^.!?]{0,20}\b(wahlen|waehlen|auswahlen|auswaehlen)\b/i,
    /\bwahl\b[^.!?]{0,20}\b1\b/i,
];

/**
 * Parse diet-related customization modifiers from the itemDetails CDN payload.
 *
 * The itemDetails payload contains:
 * - `ModifierGroups`: groups of options, each with an ID, name, and list of modifier set IDs
 * - `ModifierSets`: individual modifiers with ID, name, and price
 *
 * Items reference modifier groups via `Variations[].ModifierGroupsIds`.
 *
 * @returns Map from modifier group ID to array of diet-related modifier names
 */
function parseCdnDietModifierGroups(
    payload: Record<string, unknown> | null,
): Map<string, CdnDietModifierGroup> {
    const result = new Map<string, CdnDietModifierGroup>();
    if (!payload) return result;

    const modifierGroups = Array.isArray(payload.ModifierGroups)
        ? payload.ModifierGroups
        : Array.isArray(payload.modifierGroups)
            ? payload.modifierGroups
            : [];
    const modifierSets = Array.isArray(payload.ModifierSets)
        ? payload.ModifierSets
        : Array.isArray(payload.modifierSets)
            ? payload.modifierSets
            : [];

    const modifierNamesById = new Map<string, string[]>();
    for (const ms of modifierSets) {
        if (!ms || typeof ms !== 'object') continue;
        const msRecord = ms as Record<string, unknown>;
        const id = asTrimmedString(msRecord.Id) ?? asTrimmedString(msRecord.id);
        if (!id) continue;

        const labels = collectModifierLabels([
            msRecord.Name,
            msRecord.name,
            msRecord.DisplayName,
            msRecord.displayName,
            msRecord.Modifier,
            msRecord.modifier,
        ]);
        if (labels.length > 0) {
            modifierNamesById.set(id, labels);
        }
    }

    for (const mg of modifierGroups) {
        if (!mg || typeof mg !== 'object') continue;
        const mgRecord = mg as Record<string, unknown>;
        const groupId = asTrimmedString(mgRecord.Id) ?? asTrimmedString(mgRecord.id);
        if (!groupId) continue;
        const groupName = asTrimmedString(mgRecord.Name)
            ?? asTrimmedString(mgRecord.name)
            ?? asTrimmedString(mgRecord.DisplayName)
            ?? asTrimmedString(mgRecord.displayName);

        const modifierIds = extractModifierIds([
            mgRecord.Modifiers,
            mgRecord.modifiers,
            mgRecord.ModifierIds,
            mgRecord.modifierIds,
        ]);
        const optionLabels = dedupeCaseInsensitive([
            ...collectInlineModifierLabels([
                mgRecord.Modifiers,
                mgRecord.modifiers,
            ]),
            ...modifierIds.flatMap((modId) => modifierNamesById.get(modId) ?? []),
        ]);
        const dietNames = collectDietModifierLabels([
            groupName,
            ...optionLabels,
        ]);

        if (dietNames.length > 0 || optionLabels.length > 0) {
            result.set(groupId, {
                id: groupId,
                kind: classifyDietModifierGroup(groupName, optionLabels, dietNames, mgRecord),
                name: groupName,
                dietLabels: dedupeCaseInsensitive(dietNames),
                optionLabels,
            });
        }
    }

    return result;
}

function parseCdnModifierGroupNames(
    payload: Record<string, unknown> | null,
): Map<string, string> {
    const result = new Map<string, string>();
    if (!payload) return result;

    const modifierGroups = Array.isArray(payload.ModifierGroups)
        ? payload.ModifierGroups
        : Array.isArray(payload.modifierGroups)
            ? payload.modifierGroups
            : [];

    for (const rawGroup of modifierGroups) {
        if (!isObjectRecord(rawGroup)) continue;
        const id = asTrimmedString(rawGroup.Id) ?? asTrimmedString(rawGroup.id);
        const name = asTrimmedString(rawGroup.Name)
            ?? asTrimmedString(rawGroup.name)
            ?? asTrimmedString(rawGroup.DisplayName)
            ?? asTrimmedString(rawGroup.displayName);
        if (id && name) {
            result.set(id, name);
        }
    }

    return result;
}

/**
 * Resolve diet modifier names for an item based on its variation's ModifierGroupsIds.
 */
function resolveDietModifierGroupsForItem(
    item: Record<string, unknown>,
    itemDetails: Record<string, unknown> | null,
    dietModifierGroupsById: Map<string, CdnDietModifierGroup>,
): CdnDietModifierGroup[] {
    if (dietModifierGroupsById.size === 0) return [];

    const resolved: CdnDietModifierGroup[] = [];
    const seen = new Set<string>();
    for (const groupId of resolveModifierGroupIdsForItem(item, itemDetails)) {
        const group = dietModifierGroupsById.get(groupId);
        if (!group || seen.has(group.id)) continue;
        seen.add(group.id);
        resolved.push(group);
    }

    return resolved;
}

function resolveModifierGroupNamesForItem(
    item: Record<string, unknown>,
    itemDetails: Record<string, unknown> | null,
    modifierGroupNamesById: Map<string, string>,
): string[] {
    if (modifierGroupNamesById.size === 0) return [];

    const names: string[] = [];
    for (const groupId of resolveModifierGroupIdsForItem(item, itemDetails)) {
        const name = modifierGroupNamesById.get(groupId);
        if (name) {
            names.push(name);
        }
    }

    return dedupeCaseInsensitive(names);
}

function resolveModifierGroupIdsForItem(
    item: Record<string, unknown>,
    itemDetails: Record<string, unknown> | null,
): string[] {
    const ids: string[] = [];
    const sources = [
        item,
        itemDetails,
        ...getVariationRecords(item),
        ...getVariationRecords(itemDetails),
    ];

    for (const source of sources) {
        if (!source) continue;
        for (const gid of extractModifierIds([
            source.ModifierGroupsIds,
            source.modifierGroupsIds,
            source.ModifierGroupIds,
            source.modifierGroupIds,
        ])) {
            ids.push(gid);
        }
    }

    return dedupeCaseInsensitive(ids);
}

function parseCdnCategories(
    menus: Record<string, unknown>[],
    itemMap: Map<string, Record<string, unknown>>,
    itemDetailsMap: Map<string, Record<string, unknown>>,
    dietModifierGroupsById: Map<string, CdnDietModifierGroup> = new Map(),
    modifierGroupNamesById: Map<string, string> = new Map(),
): ParsedMenuCategory[] {
    const categoriesByName = new Map<string, {name: string; items: ParsedMenuCategory['items']; seenItemIds: Set<string>}>();

    for (const menu of menus) {
        const rawCategories = Array.isArray(menu.Categories) ? menu.Categories : [];

        for (const rawCategory of rawCategories) {
            if (!rawCategory || typeof rawCategory !== 'object') continue;
            const category = rawCategory as Record<string, unknown>;
            const categoryName = asTrimmedString(category.Name) ?? asTrimmedString(category.name) ?? 'Menu';
            const categoryDescription = asTrimmedString(category.Description) ?? asTrimmedString(category.description);
            const categoryKey = categoryName.toLowerCase();
            const existingCategory = categoriesByName.get(categoryKey) ?? {
                name: categoryName,
                items: [],
                seenItemIds: new Set<string>(),
            };

            const itemIds = Array.isArray(category.ItemIds)
                ? category.ItemIds
                : Array.isArray(category.itemIds)
                    ? category.itemIds
                    : [];

            for (const rawId of itemIds) {
                if (typeof rawId !== 'string') continue;
                const itemId = rawId.trim();
                if (!itemId || existingCategory.seenItemIds.has(itemId)) continue;

                const item = itemMap.get(itemId);
                if (!item) continue;

                const itemDetails = itemDetailsMap.get(itemId) ?? null;
                const dietModifierGroups = resolveDietModifierGroupsForItem(item, itemDetails, dietModifierGroupsById);
                const modifierGroups = resolveModifierGroupNamesForItem(item, itemDetails, modifierGroupNamesById);
                const parsedItem = parseCdnMenuItem(item, {
                    itemId,
                    itemDetails,
                    categoryName,
                    categoryDescription,
                    dietModifierGroups,
                    modifierGroups,
                });
                if (!parsedItem) continue;

                existingCategory.seenItemIds.add(itemId);
                existingCategory.items.push(parsedItem);
            }

            categoriesByName.set(categoryKey, existingCategory);
        }
    }

    return [...categoriesByName.values()]
        .map((category) => ({
            name: category.name,
            items: category.items,
        }))
        .filter((category) => category.items.length > 0);
}

function parseCdnMenuItem(
    item: Record<string, unknown>,
    context: {
        itemId: string;
        itemDetails: Record<string, unknown> | null;
        categoryName: string;
        categoryDescription: string | null;
        dietModifierGroups?: CdnDietModifierGroup[];
        modifierGroups?: string[];
    },
): ParsedMenuCategory['items'][number] | null {
    const mergedItem = context.itemDetails ? {...context.itemDetails, ...item} : item;

    const name = asTrimmedString(mergedItem.Name) ?? asTrimmedString(mergedItem.name);
    if (!name) return null;

    const description = asTrimmedString(mergedItem.Description) ?? asTrimmedString(mergedItem.description);
    const variation = firstVariation(mergedItem);
    const detailVariation = context.itemDetails ? firstVariation(context.itemDetails) : null;

    const price = firstNumber([
        variation?.BasePrice,
        variation?.basePrice,
        variation?.Price,
        variation?.price,
        detailVariation?.BasePrice,
        detailVariation?.basePrice,
        mergedItem.BasePrice,
        mergedItem.basePrice,
    ]);
    const currency = normalizeCurrency(
        asTrimmedString(variation?.CurrencyCode)
        ?? asTrimmedString(detailVariation?.CurrencyCode)
        ?? asTrimmedString(mergedItem.CurrencyCode),
    );

    const dietContextParts: string[] = [`category:${context.categoryName}`];
    if (context.categoryDescription) {
        dietContextParts.push(`category-description:${context.categoryDescription}`);
    }

    const labels = extractValues(mergedItem.Labels ?? mergedItem.labels);
    if (labels.length > 0) {
        dietContextParts.push(`labels:${labels.join(', ')}`);
    }

    const infoValues = extractValues(mergedItem.InitialProductInformation ?? mergedItem.initialProductInformation);
    if (infoValues.length > 0) {
        dietContextParts.push(`item-info:${infoValues.join(' | ')}`);
    }

    const nutritionalValues = extractValues(variation?.NutritionalInfo ?? variation?.nutritionalInfo);
    if (nutritionalValues.length > 0) {
        dietContextParts.push(`nutrition:${nutritionalValues.join(' | ')}`);
    }

    const detailNutritionalValues = extractValues(detailVariation?.NutritionalInfo ?? detailVariation?.nutritionalInfo);
    if (detailNutritionalValues.length > 0) {
        dietContextParts.push(`detail-nutrition:${detailNutritionalValues.join(' | ')}`);
    }

    const restrictionValues = extractValues(variation?.Restrictions ?? mergedItem.Restrictions);
    if (restrictionValues.length > 0) {
        dietContextParts.push(`restrictions:${restrictionValues.join(' | ')}`);
    }

    const allergyValues = dedupeCaseInsensitive([
        ...extractStringValues([
            mergedItem.Allergens,
            mergedItem.allergens,
            mergedItem.AllergyInformation,
            mergedItem.allergyInformation,
            mergedItem.AllergenInformation,
            mergedItem.allergenInformation,
            mergedItem.AllergenLabel,
            mergedItem.allergenLabel,
            variation?.Allergens,
            variation?.allergens,
            variation?.AllergyInformation,
            variation?.allergyInformation,
            variation?.AllergenInformation,
            variation?.allergenInformation,
            variation?.AllergenLabel,
            variation?.allergenLabel,
            detailVariation?.Allergens,
            detailVariation?.allergens,
            detailVariation?.AllergyInformation,
            detailVariation?.allergyInformation,
            detailVariation?.AllergenInformation,
            detailVariation?.allergenInformation,
            detailVariation?.AllergenLabel,
            detailVariation?.allergenLabel,
        ]),
        ...extractNestedStringValuesByKey(mergedItem, /allerg/i),
        ...extractNestedStringValuesByKey(variation, /allerg/i),
        ...extractNestedStringValuesByKey(detailVariation, /allerg/i),
    ]);
    if (allergyValues.length > 0) {
        dietContextParts.push(`allergens:${allergyValues.join(' | ')}`);
    }

    const dietModifierGroups = context.dietModifierGroups ?? [];
    for (const group of dietModifierGroups) {
        const line = formatDietModifierContextLine(group);
        if (line) {
            dietContextParts.push(line);
        }
    }

    const modifierGroups = context.modifierGroups ?? [];
    if (modifierGroups.length > 0) {
        dietContextParts.push(`customizations:${modifierGroups.join(' | ')}`);
    }

    return {
        sourceId: context.itemId,
        name,
        description: description ?? null,
        dietContext: dietContextParts.length > 0 ? dietContextParts.join('\n') : null,
        allergens: allergyValues.length > 0 ? allergyValues : null,
        price,
        currency,
    };
}

function firstVariation(item: Record<string, unknown>): Record<string, unknown> | null {
    const rawVariations = Array.isArray(item.Variations)
        ? item.Variations
        : Array.isArray(item.variations)
            ? item.variations
            : [];

    const variation = rawVariations.find((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'));
    return variation ?? null;
}

function firstNumber(values: unknown[]): number | null {
    for (const value of values) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string' && value.trim()) {
            const parsed = Number.parseFloat(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }
    return null;
}

function normalizeCurrency(value: string | null): string | null {
    if (!value) return 'EUR';
    const trimmed = value.trim();
    if (!trimmed) return 'EUR';
    if (trimmed === '€' || trimmed === 'â‚¬' || trimmed === 'Ã¢â€šÂ¬') return 'EUR';
    return trimmed.toUpperCase();
}

function parseCdnRestaurantName(manifest: Record<string, unknown>): string | null {
    const info = manifest.RestaurantInfo as Record<string, unknown> | undefined;
    return asTrimmedString(info?.Name) ?? asTrimmedString(info?.name) ?? null;
}

function parseCdnRestaurantDetails(manifest: Record<string, unknown>): ParsedMenu['restaurantDetails'] {
    const info = manifest.RestaurantInfo as Record<string, unknown> | undefined;
    if (!info) return null;

    const location = info.Location as Record<string, unknown> | undefined;
    const openingTimes = info.RestaurantOpeningTimes;
    const openingHours = formatOpeningHours(openingTimes);
    const openingDays = formatOpeningDays(openingTimes);

    return {
        address: asTrimmedString(location?.Address) ?? null,
        city: asTrimmedString(location?.City) ?? null,
        postalCode: asTrimmedString(location?.PostCode) ?? null,
        country: 'DE',
        openingHours,
        openingDays,
    };
}

function parseCdnRestaurantNumericId(manifest: Record<string, unknown>): string | null {
    // CDN manifest may contain RestaurantId at top level or in RestaurantInfo
    const candidates = [
        manifest.RestaurantId,
        manifest.restaurantId,
        (manifest.RestaurantInfo as Record<string, unknown> | undefined)?.Id,
        (manifest.RestaurantInfo as Record<string, unknown> | undefined)?.id,
        (manifest.RestaurantInfo as Record<string, unknown> | undefined)?.RestaurantId,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && /^\d+$/.test(candidate.trim())) {
            return candidate.trim();
        }
        if (typeof candidate === 'number' && Number.isFinite(candidate)) {
            return String(candidate);
        }
    }

    return null;
}

function categoriesToRawText(categories: ParsedMenuCategory[]): string {
    const parts: string[] = [];
    for (const category of categories) {
        parts.push(category.name);
        for (const item of category.items) {
            parts.push(item.name);
            if (item.description) {
                parts.push(item.description);
            }
            if (item.dietContext) {
                parts.push(item.dietContext);
            }
        }
    }
    return parts.join('\n');
}

function resolveCdnUrl(baseUrlOrManifestUrl: string, rawPath: string | null): string | null {
    if (!rawPath) return null;
    const path = rawPath.trim();
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    try {
        return new URL(path, baseUrlOrManifestUrl).toString();
    } catch {
        const normalizedBase = baseUrlOrManifestUrl.replace(/\/+$/, '');
        const normalizedPath = path.replace(/^\/+/, '');
        return `${normalizedBase}/${normalizedPath}`;
    }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getVariationRecords(item: Record<string, unknown> | null | undefined): Record<string, unknown>[] {
    if (!item) return [];
    const rawVariations = Array.isArray(item.Variations)
        ? item.Variations
        : Array.isArray(item.variations)
            ? item.variations
            : [];

    return rawVariations.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'));
}

function asTrimmedString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function extractStringValues(value: unknown, depth = 0): string[] {
    if (depth > 6 || value == null) return [];

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? [trimmed] : [];
    }
    if (Array.isArray(value)) {
        return value.flatMap((entry) => extractStringValues(entry, depth + 1));
    }
    if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>)
            .flatMap((entry) => extractStringValues(entry, depth + 1));
    }
    return [];
}

function extractNestedStringValuesByKey(value: unknown, keyPattern: RegExp, depth = 0): string[] {
    if (depth > 6) return [];
    if (Array.isArray(value)) {
        return value.flatMap((entry) => extractNestedStringValuesByKey(entry, keyPattern, depth + 1));
    }
    if (!isObjectRecord(value)) return [];

    const values: string[] = [];
    for (const [key, entry] of Object.entries(value)) {
        if (keyPattern.test(key)) {
            values.push(...extractStringValues(entry, depth + 1));
            continue;
        }
        values.push(...extractNestedStringValuesByKey(entry, keyPattern, depth + 1));
    }
    return values;
}

function extractValues(value: unknown, depth = 0): string[] {
    if (depth > 6 || value == null) return [];

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? [trimmed] : [];
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return [String(value)];
    }
    if (Array.isArray(value)) {
        return value.flatMap((entry) => extractValues(entry, depth + 1));
    }
    if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>)
            .flatMap((entry) => extractValues(entry, depth + 1));
    }
    return [];
}

function extractModifierIds(sources: unknown[]): string[] {
    const ids: string[] = [];

    for (const source of sources) {
        if (!Array.isArray(source)) continue;
        for (const entry of source) {
            if (typeof entry === 'string') {
                const trimmed = entry.trim();
                if (trimmed) ids.push(trimmed);
                continue;
            }
            if (!isObjectRecord(entry)) continue;
            const id = asTrimmedString(entry.Id) ?? asTrimmedString(entry.id);
            if (id) ids.push(id);
        }
    }

    return dedupeCaseInsensitive(ids);
}

function collectModifierLabels(sources: unknown[]): string[] {
    return dedupeCaseInsensitive(
        sources
            .flatMap((source) => extractStringValues(source))
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
    );
}

function collectInlineModifierLabels(sources: unknown[]): string[] {
    return dedupeCaseInsensitive(
        sources.flatMap((source) => {
            if (!Array.isArray(source)) return [];
            return source.flatMap((entry) => (isObjectRecord(entry) ? extractStringValues(entry) : []));
        }),
    );
}

function collectDietModifierLabels(sources: unknown[]): string[] {
    return collectModifierLabels(sources)
        .filter((value) => DIET_MODIFIER_PATTERNS.some((pattern) => pattern.test(value)));
}

function classifyDietModifierGroup(
    groupName: string | null,
    optionLabels: string[],
    dietLabels: string[],
    groupRecord: Record<string, unknown>,
): DietModifierGroupKind {
    const combinedText = normalizeLooseText([groupName, ...optionLabels].filter(Boolean).join(' '));
    const groupNameText = normalizeLooseText(groupName ?? '');
    const dietSignalText = normalizeLooseText([groupName, ...dietLabels, ...optionLabels].filter(Boolean).join(' '));
    const {required, singleSelect} = readModifierGroupSelection(groupRecord, groupNameText);
    const hasDietSignals = dietLabels.length > 0;
    const hasPreparationSignal = PREPARATION_MODIFIER_GROUP_PATTERNS.some((pattern) => pattern.test(dietSignalText));
    const isAccessoryGroup = ACCESSORY_MODIFIER_GROUP_PATTERNS.some((pattern) => pattern.test(combinedText));
    const hasCoreReplacementSignal = CORE_REPLACEMENT_MODIFIER_GROUP_PATTERNS.some((pattern) => pattern.test(combinedText));
    const hasExplicitDietVariantLabel = optionLabels.some((label) => (
        DIET_MODIFIER_PATTERNS.some((pattern) => pattern.test(normalizeLooseText(label)))
        && !ACCESSORY_MODIFIER_GROUP_PATTERNS.some((pattern) => pattern.test(normalizeLooseText(label)))
    ));

    if (hasDietSignals && hasPreparationSignal) {
        return 'preparation';
    }

    if (
        hasDietSignals
        && required
        && singleSelect
        && !isAccessoryGroup
        && (hasCoreReplacementSignal || hasExplicitDietVariantLabel)
    ) {
        return 'choice';
    }

    return 'addon';
}

function readModifierGroupSelection(
    groupRecord: Record<string, unknown>,
    groupNameText: string,
): {required: boolean; singleSelect: boolean} {
    const minimum = firstNumber([
        groupRecord.MinimumQuantity,
        groupRecord.minimumQuantity,
        groupRecord.MaximumMinimumQuantity,
        groupRecord.maximumMinimumQuantity,
        groupRecord.MinQuantity,
        groupRecord.minQuantity,
        groupRecord.MinimumSelection,
        groupRecord.minimumSelection,
        groupRecord.MinSelection,
        groupRecord.minSelection,
        groupRecord.SelectionMinimum,
        groupRecord.selectionMinimum,
    ]);
    const maximum = firstNumber([
        groupRecord.MaximumQuantity,
        groupRecord.maximumQuantity,
        groupRecord.MaxQuantity,
        groupRecord.maxQuantity,
        groupRecord.MaximumSelection,
        groupRecord.maximumSelection,
        groupRecord.MaxSelection,
        groupRecord.maxSelection,
        groupRecord.SelectionMaximum,
        groupRecord.selectionMaximum,
    ]);
    const requiredFlag = firstBoolean([
        groupRecord.Required,
        groupRecord.required,
        groupRecord.IsRequired,
        groupRecord.isRequired,
        groupRecord.Mandatory,
        groupRecord.mandatory,
    ]);
    const chooseOneByName = SINGLE_SELECT_MODIFIER_GROUP_PATTERNS.some((pattern) => pattern.test(groupNameText));

    return {
        required: (minimum ?? 0) > 0 || requiredFlag === true || chooseOneByName,
        singleSelect: maximum === 1 || chooseOneByName,
    };
}

function firstBoolean(values: unknown[]): boolean | null {
    for (const value of values) {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value !== 0;
        }
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (['true', 'yes', 'ja', '1'].includes(normalized)) return true;
            if (['false', 'no', 'nein', '0'].includes(normalized)) return false;
        }
    }
    return null;
}

function normalizeLooseText(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatDietModifierContextLine(group: CdnDietModifierGroup): string | null {
    const prefixByKind: Record<DietModifierGroupKind, string> = {
        preparation: 'diet-preparation',
        choice: 'diet-choice',
        addon: 'diet-addon',
    };
    const prefix = prefixByKind[group.kind];
    const name = group.name?.trim() ?? '';
    const labels = group.optionLabels.length > 0
        ? group.optionLabels.join(' | ')
        : group.dietLabels.join(' | ');

    if (!name && !labels) return null;
    if (!name) return `${prefix}:${labels}`;
    if (!labels) return `${prefix}:${name}`;
    return `${prefix}:${name} => ${labels}`;
}

function dedupeCaseInsensitive(values: string[]): string[] {
    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const value of values) {
        const trimmed = value.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(trimmed);
    }
    return deduped;
}

function formatOpeningHours(openingTimes: unknown): string | null {
    if (!Array.isArray(openingTimes)) return null;

    const lines: string[] = [];
    for (const service of openingTimes) {
        if (!service || typeof service !== 'object') continue;
        const serviceRecord = service as Record<string, unknown>;
        const serviceType = asTrimmedString(serviceRecord.ServiceType) ?? asTrimmedString(serviceRecord.serviceType) ?? 'service';
        const timesPerDay = Array.isArray(serviceRecord.TimesPerDay) ? serviceRecord.TimesPerDay : [];
        const dayLines = timesPerDay
            .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
            .map((entry) => {
                const day = asTrimmedString(entry.DayOfWeek) ?? asTrimmedString(entry.dayOfWeek);
                const times = Array.isArray(entry.Times) ? entry.Times : [];
                const ranges = times
                    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object'))
                    .map((value) => {
                        const from = asTrimmedString(value.FromLocalTime) ?? asTrimmedString(value.fromLocalTime);
                        const to = asTrimmedString(value.ToLocalTime) ?? asTrimmedString(value.toLocalTime);
                        return from && to ? `${from}-${to}` : null;
                    })
                    .filter((value): value is string => Boolean(value));
                if (!day) return null;
                return `${day} ${ranges.length > 0 ? ranges.join(', ') : 'closed'}`;
            })
            .filter((value): value is string => Boolean(value));
        if (dayLines.length > 0) {
            lines.push(`${serviceType}: ${dayLines.join('; ')}`);
        }
    }

    return lines.length > 0 ? lines.join('\n') : null;
}

function formatOpeningDays(openingTimes: unknown): string | null {
    if (!Array.isArray(openingTimes)) return null;
    const days = new Set<string>();

    for (const service of openingTimes) {
        if (!service || typeof service !== 'object') continue;
        const serviceRecord = service as Record<string, unknown>;
        const timesPerDay = Array.isArray(serviceRecord.TimesPerDay) ? serviceRecord.TimesPerDay : [];

        for (const entry of timesPerDay) {
            if (!entry || typeof entry !== 'object') continue;
            const day = asTrimmedString((entry as Record<string, unknown>).DayOfWeek)
                ?? asTrimmedString((entry as Record<string, unknown>).dayOfWeek);
            if (day) {
                days.add(day);
            }
        }
    }

    return days.size > 0 ? [...days].join(', ') : null;
}

function canUseCurlFallback(): boolean {
    if (process.env.DELIVERYROULETTE_DISABLE_CURL_FALLBACK === '1') {
        return false;
    }
    return !process.env.JEST_WORKER_ID;
}

function hasTrustedMenuSignals(html: string): boolean {
    const lower = html.toLowerCase();
    const markers = [
        'id="__next_data__"',
        'data-qa="item-category"',
        'data-qa="menu-item"',
        '"manifesturl"',
        'type="application/ld+json"',
    ];
    return markers.some((marker) => lower.includes(marker));
}

function looksLikeBotProtectionPage(html: string): boolean {
    const lower = html.toLowerCase();
    if (lower.includes('data-qa="item-category"') || lower.includes('data-qa="restaurant-card"')) return false;

    const markers = [
        'cloudflare',
        'access denied',
        'just a moment',
        'checking your browser',
        'captcha',
        'bot protection',
        'attention required',
        'cf-chl',
    ];

    return markers.some((marker) => lower.includes(marker));
}

function slugFromUrl(url: string): string {
    const match = url.match(/\/(?:menu|restaurant|chain)\/([^/?#]+)/i);
    if (match?.[1]) {
        return decodeURIComponent(match[1]);
    }

    try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split('/').filter(Boolean);
        for (let i = 0; i < segments.length - 1; i++) {
            if (['menu', 'restaurant', 'chain'].includes(segments[i].toLowerCase())) {
                return decodeURIComponent(segments[i + 1]);
            }
        }
    } catch {
        // Fall back to a stable URL key below.
    }

    const stable = url.split(/[?#]/)[0];
    return stable.length <= 255 ? stable : stable.slice(0, 255);
}

function parseUrl(url: string): URL {
    try {
        return new URL(url);
    } catch {
        throw new Error('Invalid URL format');
    }
}

function parseCuisineList(value: string | null | undefined): string[] | null {
    if (!value) return null;
    const normalized = value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    if (normalized.length === 0) return null;
    return [...new Set(normalized)];
}

function extractLocationSlugFromListingUrl(url: string | null): string | null {
    if (!url) return null;
    const match = url.match(/\/delivery\/food\/([^/?#]+)/i);
    if (match?.[1]) {
        return decodeURIComponent(match[1].trim());
    }
    return null;
}

function normalizeLocationValue(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

// ── Allergen type mapping ────────────────────────────────────────
// Maps Lieferando allergen API types to human-readable names.
// Based on the Lieferando product information API response format:
//   { "allergenSets": [{ "level": "contains", "type": "glutenCereal", "subTypes": ["wheat"] }] }

const ALLERGEN_TYPE_MAP: Record<string, string> = {
    glutenCereal: 'Gluten',
    milkLactose: 'Milk',
    egg: 'Eggs',
    fish: 'Fish',
    crustaceans: 'Crustaceans',
    molluscs: 'Molluscs',
    peanuts: 'Peanuts',
    treeNuts: 'Tree Nuts',
    soy: 'Soy',
    sesame: 'Sesame',
    celery: 'Celery',
    mustard: 'Mustard',
    lupin: 'Lupin',
    sulphites: 'Sulphites',
};

/**
 * Parse the Lieferando product information API response to extract human-readable allergen names.
 *
 * On the Lieferando website:
 * - `"contains"` → "Contains X and products thereof" (definitely present)
 * - `"mayContain"` → "May contain X and products thereof" (potential cross-contamination)
 *
 * Both levels represent real allergen information from the restaurant.
 * By default, both are included for conservative diet inference.
 *
 * @param data - Parsed JSON response from the product information API
 * @param includeMayContain - Whether to include "mayContain" level allergens (default: true)
 */
function parseAllergenResponse(data: Record<string, unknown>, includeMayContain = true): string[] {
    const allergens = data.allergens as Record<string, unknown> | undefined;
    if (!allergens || allergens.provided !== true) return [];

    const allergenSets = allergens.allergenSets;
    if (!Array.isArray(allergenSets)) return [];

    const result: string[] = [];
    for (const set of allergenSets) {
        if (!set || typeof set !== 'object') continue;
        const allergenSet = set as Record<string, unknown>;

        // Include "contains" level always; include "mayContain" based on configuration
        const level = allergenSet.level;
        if (level !== 'contains' && !(includeMayContain && level === 'mayContain')) continue;

        const type = typeof allergenSet.type === 'string' ? allergenSet.type : '';
        const label = ALLERGEN_TYPE_MAP[type] ?? type;
        if (!label) continue;

        const subTypes = Array.isArray(allergenSet.subTypes)
            ? allergenSet.subTypes.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
            : [];

        if (subTypes.length > 0) {
            // Include both the main type and sub-types for comprehensive matching
            result.push(label);
            for (const sub of subTypes) {
                const subLabel = sub.charAt(0).toUpperCase() + sub.slice(1);
                if (subLabel.toLowerCase() !== label.toLowerCase()) {
                    result.push(subLabel);
                }
            }
        } else {
            result.push(label);
        }
    }

    return [...new Set(result)];
}
