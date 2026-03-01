/**
 * Generic provider controller.
 *
 * Handles all provider operations through the generic connector interface.
 * No individual connector is referenced — the UI and actions are
 * dynamically generated based on connector capabilities.
 */
import * as ConnectorRegistry from '../providers/ConnectorRegistry';
import {ProviderKey} from '../providers/ProviderKey';
import {ConnectorCapabilities} from '../providers/DeliveryProviderConnector';
import {queueSync, queueImportFromUrl, QueuedSyncJob} from '../modules/sync/ProviderSyncService';
import {AppDataSource} from '../modules/database/dataSource';
import {ProviderSourceConfig} from '../modules/database/entities/provider/ProviderSourceConfig';
import {ExpectedError} from '../modules/lib/errors';

export interface ProviderInfo {
    providerKey: string;
    displayName: string;
    capabilities: ConnectorCapabilities;
    listingUrl?: string;
}

/**
 * Get data for the generic providers settings page.
 * Lists all registered connectors with their capabilities and saved configs.
 */
export async function getProvidersPageData(userId: string): Promise<{providers: ProviderInfo[]}> {
    const keys = ConnectorRegistry.registeredKeys();
    const providers: ProviderInfo[] = [];

    for (const key of keys) {
        const connector = ConnectorRegistry.resolve(key);
        if (!connector) continue;

        const caps = connector.capabilities();
        // Only show connectors with listing or import capabilities
        if (!caps.canDiscoverFromListingUrl && !caps.canImportFromUrl) continue;

        const config = await getSourceConfig(userId, key);
        providers.push({
            providerKey: key,
            displayName: connector.displayName,
            capabilities: caps,
            listingUrl: config?.listingUrl || '',
        });
    }

    return {providers};
}

/**
 * Trigger a listing-based sync for a provider.
 */
export async function syncProvider(userId: string, providerKey: string, listingUrl: string): Promise<QueuedSyncJob> {
    if (!listingUrl?.trim()) {
        throw new ExpectedError('Please provide a listing URL', 'error', 400);
    }

    const connector = resolveConnector(providerKey);
    const caps = connector.capabilities();

    if (!caps.canDiscoverFromListingUrl) {
        throw new ExpectedError('This provider does not support listing-based discovery', 'error', 400);
    }

    // Validate URL through the connector
    if (connector.validateListingUrl) {
        try {
            connector.validateListingUrl(listingUrl.trim());
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Invalid URL';
            throw new ExpectedError(msg, 'error', 400);
        }
    }

    // Save config
    await saveSourceConfig(userId, providerKey, listingUrl.trim());

    return await queueSync({
        providerKey: connector.providerKey as ProviderKey,
        query: listingUrl.trim(),
    });
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

    // Validate URL through the connector
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

// ── Internal helpers ──────────────────────────────────────────

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
