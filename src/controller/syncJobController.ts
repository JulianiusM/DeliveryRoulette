import * as syncController from './syncController';
import {ProviderKey} from '../providers/ProviderKey';
import {SyncJobStatus} from '../modules/database/entities/sync/SyncJob';

type JobStatusFilter = SyncJobStatus | 'all';

export interface SyncJobsPageData {
    jobs: Awaited<ReturnType<typeof syncController.getSyncJobs>>;
    filterStatus: JobStatusFilter;
    filterProvider: string;
    providerKeys: string[];
    hasRunningJobs: boolean;
}

export async function getSyncJobsPageData(query: {
    status?: string;
    provider?: string;
}): Promise<SyncJobsPageData> {
    const validStatuses: JobStatusFilter[] = ['all', 'pending', 'in_progress', 'completed', 'failed'];
    const filterStatus = validStatuses.includes(query.status as JobStatusFilter)
        ? query.status as JobStatusFilter
        : 'all';

    const providerKeys = Object.values(ProviderKey) as string[];
    const filterProvider = query.provider && providerKeys.includes(query.provider)
        ? query.provider
        : '';

    const jobs = await syncController.getSyncJobs({
        status: filterStatus,
        providerKey: filterProvider || undefined,
        limit: 100,
    });

    return {
        jobs,
        filterStatus,
        filterProvider,
        providerKeys,
        hasRunningJobs: jobs.some((job) => job.status === 'pending' || job.status === 'in_progress'),
    };
}
