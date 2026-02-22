import {ProviderKey} from '../providers/ProviderKey';
import * as ConnectorRegistry from '../providers/ConnectorRegistry';
import {runSync, SyncResult} from '../modules/sync/ProviderSyncService';
import {ExpectedError} from '../modules/lib/errors';

/**
 * Trigger a sync run for a single provider or all registered providers.
 *
 * @param providerKey - Optional provider key. When omitted all providers sync.
 * @returns The {@link SyncResult} summarising the completed job.
 */
export async function triggerSync(providerKey?: string): Promise<SyncResult> {
    let key: ProviderKey | undefined;

    if (providerKey) {
        // Validate the key belongs to ProviderKey
        if (!Object.values(ProviderKey).includes(providerKey as ProviderKey)) {
            throw new ExpectedError(`Unknown provider key: ${providerKey}`, 'error', 400);
        }

        // Ensure a connector is actually registered for this key
        const connector = ConnectorRegistry.resolve(providerKey as ProviderKey);
        if (!connector) {
            throw new ExpectedError(`No connector registered for provider: ${providerKey}`, 'error', 400);
        }

        key = providerKey as ProviderKey;
    }

    return await runSync({providerKey: key});
}
