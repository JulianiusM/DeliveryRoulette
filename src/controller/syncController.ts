import {ProviderKey} from '../providers/ProviderKey';
import * as ConnectorRegistry from '../providers/ConnectorRegistry';
import {
    getSyncJobById,
    listSyncJobs,
    queueSync,
    QueuedSyncJob,
    SyncJobListOptions,
} from '../modules/sync/ProviderSyncService';
import {ExpectedError} from '../modules/lib/errors';

/**
 * Trigger a sync run for a single provider or all registered providers.
 *
 * @param providerKey - Optional provider key. When omitted all providers sync.
 * @returns The queued job handle.
 */
export async function triggerSync(providerKey?: string): Promise<QueuedSyncJob> {
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

    return await queueSync({providerKey: key});
}

export async function getSyncJobs(options: SyncJobListOptions = {}) {
    return await listSyncJobs(options);
}

export async function getSyncJob(id: string) {
    const job = await getSyncJobById(id);
    if (!job) {
        throw new ExpectedError('Sync job not found', 'error', 404);
    }
    return job;
}
