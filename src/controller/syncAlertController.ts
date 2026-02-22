import * as syncAlertService from '../modules/database/services/SyncAlertService';
import {SyncAlertType} from '../modules/database/entities/sync/SyncAlert';
import {ProviderKey} from '../providers/ProviderKey';
import {ExpectedError} from '../modules/lib/errors';
import type {AlertFilter} from '../modules/database/services/SyncAlertService';

const ALERT_TYPE_LABELS: Record<SyncAlertType, string> = {
    restaurant_gone: 'Restaurant Gone',
    menu_changed: 'Menu Changed',
    diet_override_stale: 'Diet Override Stale',
};

/**
 * Build page data for the sync alerts list view.
 */
export async function getAlertsPageData(query: {
    type?: string;
    provider?: string;
    status?: string;
}): Promise<{
    alerts: Awaited<ReturnType<typeof syncAlertService.listAlerts>>;
    activeCount: number;
    filterType: string;
    filterProvider: string;
    filterStatus: string;
    alertTypes: {value: string; label: string}[];
    providerKeys: string[];
}> {
    const filter: AlertFilter = {};

    // Validate and apply type filter
    const validTypes: SyncAlertType[] = ['restaurant_gone', 'menu_changed', 'diet_override_stale'];
    if (query.type && validTypes.includes(query.type as SyncAlertType)) {
        filter.type = query.type as SyncAlertType;
    }

    // Validate and apply provider filter
    const validProviders = Object.values(ProviderKey) as string[];
    if (query.provider && validProviders.includes(query.provider)) {
        filter.providerKey = query.provider;
    }

    // Apply status filter (default: active)
    const validStatuses = ['active', 'dismissed', 'all'];
    const status = validStatuses.includes(query.status ?? '') ? query.status as AlertFilter['status'] : 'active';
    filter.status = status;

    const [alerts, activeCount] = await Promise.all([
        syncAlertService.listAlerts(filter),
        syncAlertService.countActiveAlerts(),
    ]);

    return {
        alerts,
        activeCount,
        filterType: query.type || '',
        filterProvider: query.provider || '',
        filterStatus: status || 'active',
        alertTypes: validTypes.map(t => ({value: t, label: ALERT_TYPE_LABELS[t]})),
        providerKeys: validProviders,
    };
}

/**
 * Dismiss a single alert.
 */
export async function dismissOne(id: string): Promise<void> {
    const success = await syncAlertService.dismissAlert(id);
    if (!success) {
        throw new ExpectedError('Alert not found', 'error', 404);
    }
}

/**
 * Dismiss all active alerts matching the current filter.
 */
export async function dismissFiltered(query: {
    type?: string;
    provider?: string;
}): Promise<number> {
    const filter: AlertFilter = {};
    const validTypes: SyncAlertType[] = ['restaurant_gone', 'menu_changed', 'diet_override_stale'];
    if (query.type && validTypes.includes(query.type as SyncAlertType)) {
        filter.type = query.type as SyncAlertType;
    }
    const validProviders = Object.values(ProviderKey) as string[];
    if (query.provider && validProviders.includes(query.provider)) {
        filter.providerKey = query.provider;
    }
    return await syncAlertService.dismissAllFiltered(filter);
}
