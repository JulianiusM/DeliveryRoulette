/**
 * Generic provider controller.
 *
 * Handles all provider operations through the generic connector interface.
 * No individual connector is referenced - the UI and actions are
 * dynamically generated based on connector capabilities.
 */
import * as ConnectorRegistry from '../providers/ConnectorRegistry';
import {ProviderKey} from '../providers/ProviderKey';
import {ConnectorCapabilities} from '../providers/DeliveryProviderConnector';
import {queueListingSync, queueImportFromUrl, queueProviderRefresh, QueuedSyncJob} from '../modules/sync/ProviderSyncService';
import {isHeuristicRefreshRunning, startHeuristicRefresh} from '../modules/sync/HeuristicRefreshService';
import {AppDataSource} from '../modules/database/dataSource';
import {ProviderSourceConfig} from '../modules/database/entities/provider/ProviderSourceConfig';
import * as providerLocationRefService from '../modules/database/services/ProviderLocationRefService';
import * as userLocationService from '../modules/database/services/UserLocationService';
import * as userPreferenceService from '../modules/database/services/UserPreferenceService';
import {ExpectedError} from '../modules/lib/errors';
import settings from '../modules/settings';

export interface ProviderInfo {
    providerKey: string;
    displayName: string;
    capabilities: ConnectorCapabilities;
    listingUrl?: string;
}

export interface ProviderLocationOption {
    id: string;
    label: string;
    addressLine1: string;
    city: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
    hasCoordinates: boolean;
}

export interface ProviderMaintenanceInfo {
    heuristicRefreshRunning: boolean;
    providerRefreshVersion: string;
}

export interface ProvidersPageData {
    providers: ProviderInfo[];
    maintenance: ProviderMaintenanceInfo;
    savedLocations: ProviderLocationOption[];
    activeLocation: ProviderLocationOption | null;
}

export function getProviderMaintenanceInfo(): ProviderMaintenanceInfo {
    return {
        heuristicRefreshRunning: isHeuristicRefreshRunning(),
        providerRefreshVersion: settings.value.providerRefreshVersion,
    };
}

/**
 * Get data for the generic providers settings page.
 * Lists all registered connectors with their capabilities and saved configs.
 */
export async function getProvidersPageData(
    userId: string,
    locationId?: string | null,
): Promise<ProvidersPageData> {
    const keys = ConnectorRegistry.registeredKeys();
    const providers: ProviderInfo[] = [];

    for (const key of keys) {
        const connector = ConnectorRegistry.resolve(key);
        if (!connector) continue;

        const caps = connector.capabilities();
        if (!caps.canDiscoverFromListingUrl && !caps.canImportFromUrl) continue;

        const config = await getSourceConfig(userId, key);
        providers.push({
            providerKey: key,
            displayName: connector.displayName,
            capabilities: caps,
            listingUrl: config?.listingUrl || '',
        });
    }

    const {savedLocations, activeLocation} = await getUserLocationSelection(userId, locationId);

    return {
        providers,
        maintenance: getProviderMaintenanceInfo(),
        savedLocations,
        activeLocation,
    };
}

/**
 * Trigger a listing-based sync for a provider.
 */
export async function syncProvider(
    userId: string,
    providerKey: string,
    listingUrl: string,
    locationId?: string | null,
): Promise<QueuedSyncJob> {
    if (!listingUrl?.trim()) {
        throw new ExpectedError('Please provide a listing URL', 'error', 400);
    }

    const connector = resolveConnector(providerKey);
    const caps = connector.capabilities();

    if (!caps.canDiscoverFromListingUrl) {
        throw new ExpectedError('This provider does not support listing-based discovery', 'error', 400);
    }

    if (connector.validateListingUrl) {
        try {
            connector.validateListingUrl(listingUrl.trim());
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Invalid URL';
            throw new ExpectedError(msg, 'error', 400);
        }
    }

    const normalizedListingUrl = listingUrl.trim();
    await saveSourceConfig(userId, providerKey, normalizedListingUrl);

    let providerLocationRefId: string | null = null;
    const numericUserId = Number(userId);
    if (Number.isInteger(numericUserId) && numericUserId > 0 && connector.resolveLocation) {
        const activeLocation = await resolveUserLocationForProvider(numericUserId, locationId);

        if (activeLocation) {
            const resolution = await connector.resolveLocation({
                label: activeLocation.label,
                addressLine1: activeLocation.addressLine1 ?? null,
                addressLine2: activeLocation.addressLine2 ?? null,
                city: activeLocation.city ?? null,
                postalCode: activeLocation.postalCode ?? null,
                country: activeLocation.country ?? null,
                latitude: activeLocation.latitude ?? null,
                longitude: activeLocation.longitude ?? null,
                listingUrl: normalizedListingUrl,
            });

            if (resolution) {
                const providerLocationRef = await providerLocationRefService.upsertResolvedLocation(
                    activeLocation.id,
                    resolution,
                );
                providerLocationRefId = providerLocationRef.id;
            }
        }
    }

    return await queueListingSync(
        connector.providerKey as ProviderKey,
        normalizedListingUrl,
        providerLocationRefId,
    );
}

/**
 * Import a single restaurant from a URL via a provider.
 */
export async function importFromUrl(userId: string, providerKey: string, menuUrl: string): Promise<QueuedSyncJob> {
    if (!menuUrl?.trim()) {
        throw new ExpectedError('Please provide a restaurant URL', 'error', 400);
    }

    const connector = resolveConnector(providerKey);
    const caps = connector.capabilities();

    if (!caps.canImportFromUrl) {
        throw new ExpectedError('This provider does not support URL-based import', 'error', 400);
    }

    if (connector.validateImportUrl) {
        try {
            connector.validateImportUrl(menuUrl.trim());
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Invalid URL';
            throw new ExpectedError(msg, 'error', 400);
        }
    }

    return await queueImportFromUrl(
        connector.providerKey as ProviderKey,
        menuUrl.trim(),
    );
}

export function triggerHeuristicRefresh(): {started: boolean; mode: 'stale' | 'all'} {
    return startHeuristicRefresh({
        forceAll: true,
        source: 'manual',
    });
}

export async function triggerProviderRefresh(): Promise<QueuedSyncJob> {
    return await queueProviderRefresh(true);
}

function resolveConnector(providerKey: string) {
    if (!Object.values(ProviderKey).includes(providerKey as ProviderKey)) {
        throw new ExpectedError(`Unknown provider key: ${providerKey}`, 'error', 400);
    }
    const connector = ConnectorRegistry.resolve(providerKey as ProviderKey);
    if (!connector) {
        throw new ExpectedError(`No connector registered for: ${providerKey}`, 'error', 400);
    }
    return connector;
}

async function getUserLocationSelection(
    userId: string,
    locationId?: string | null,
): Promise<{
    savedLocations: ProviderLocationOption[];
    activeLocation: ProviderLocationOption | null;
}> {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
        return {
            savedLocations: [],
            activeLocation: null,
        };
    }

    const preference = await userPreferenceService.getByUserId(numericUserId);
    const defaultLocation = await userLocationService.getOrBackfillDefaultFromDeliveryArea(
        numericUserId,
        preference?.deliveryArea ?? null,
    );
    const savedLocations = (await userLocationService.listByUserId(numericUserId))
        .map(mapUserLocationToOption)
        .filter((location): location is ProviderLocationOption => Boolean(location));
    const normalizedLocationId = typeof locationId === 'string' ? locationId.trim() : '';
    const activeLocation = normalizedLocationId
        ? savedLocations.find((location) => location.id === normalizedLocationId) ?? mapUserLocationToOption(defaultLocation)
        : mapUserLocationToOption(defaultLocation);

    return {
        savedLocations,
        activeLocation,
    };
}

async function resolveUserLocationForProvider(
    userId: number,
    locationId?: string | null,
) {
    const normalizedLocationId = typeof locationId === 'string' ? locationId.trim() : '';
    if (normalizedLocationId) {
        const selectedLocation = await userLocationService.getByIdForUser(userId, normalizedLocationId);
        if (!selectedLocation) {
            throw new ExpectedError('Selected saved location was not found.', 'error', 404);
        }
        return selectedLocation;
    }

    const preference = await userPreferenceService.getByUserId(userId);
    return await userLocationService.getOrBackfillDefaultFromDeliveryArea(
        userId,
        preference?.deliveryArea ?? null,
    );
}

function mapUserLocationToOption(location?: {
    id: string;
    label: string;
    addressLine1?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    isDefault?: boolean;
    latitude?: number | null;
    longitude?: number | null;
} | null): ProviderLocationOption | null {
    if (!location) {
        return null;
    }

    return {
        id: location.id,
        label: location.label,
        addressLine1: location.addressLine1 ?? '',
        city: location.city ?? '',
        postalCode: location.postalCode ?? '',
        country: location.country ?? '',
        isDefault: Boolean(location.isDefault),
        hasCoordinates: Number.isFinite(location.latitude) && Number.isFinite(location.longitude),
    };
}

async function getSourceConfig(userId: string, providerKey: string): Promise<ProviderSourceConfig | null> {
    const repo = AppDataSource.getRepository(ProviderSourceConfig);
    return await repo.findOne({where: {userId, providerKey}});
}

async function saveSourceConfig(userId: string, providerKey: string, listingUrl: string): Promise<void> {
    const repo = AppDataSource.getRepository(ProviderSourceConfig);
    let config = await repo.findOne({where: {userId, providerKey}});

    if (config) {
        config.listingUrl = listingUrl;
        config.updatedAt = new Date();
        await repo.save(config);
    } else {
        config = repo.create({
            userId,
            providerKey,
            listingUrl,
            isEnabled: true,
        });
        await repo.save(config);
    }
}
