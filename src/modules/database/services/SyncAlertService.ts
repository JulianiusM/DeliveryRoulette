import {AppDataSource} from '../dataSource';
import {SyncAlert, SyncAlertType} from '../entities/sync/SyncAlert';

/**
 * Create a new sync alert.
 */
export async function createAlert(data: {
    restaurantId: string;
    providerKey: string;
    type: SyncAlertType;
    message: string;
}): Promise<SyncAlert> {
    const repo = AppDataSource.getRepository(SyncAlert);
    const alert = repo.create({
        restaurantId: data.restaurantId,
        providerKey: data.providerKey,
        type: data.type,
        message: data.message,
        dismissed: false,
    });
    return await repo.save(alert);
}

/**
 * List undismissed alerts, optionally filtered by restaurant.
 */
export async function listActiveAlerts(restaurantId?: string): Promise<SyncAlert[]> {
    const repo = AppDataSource.getRepository(SyncAlert);
    const where: Record<string, unknown> = {dismissed: false};
    if (restaurantId) {
        where.restaurantId = restaurantId;
    }
    return await repo.find({where, order: {createdAt: 'DESC'}});
}

/**
 * Dismiss a single alert by ID.
 */
export async function dismissAlert(id: string): Promise<boolean> {
    const repo = AppDataSource.getRepository(SyncAlert);
    const alert = await repo.findOne({where: {id}});
    if (!alert) return false;
    alert.dismissed = true;
    await repo.save(alert);
    return true;
}

/**
 * Dismiss all alerts of a given type for a restaurant.
 */
export async function dismissAlertsByType(
    restaurantId: string,
    type: SyncAlertType,
): Promise<number> {
    const repo = AppDataSource.getRepository(SyncAlert);
    const alerts = await repo.find({
        where: {restaurantId, type, dismissed: false},
    });
    for (const alert of alerts) {
        alert.dismissed = true;
    }
    if (alerts.length > 0) {
        await repo.save(alerts);
    }
    return alerts.length;
}

/**
 * Check whether an undismissed alert of a given type already exists
 * for a restaurant + provider combination (prevents duplicate alerts).
 */
export async function hasActiveAlert(
    restaurantId: string,
    providerKey: string,
    type: SyncAlertType,
): Promise<boolean> {
    const repo = AppDataSource.getRepository(SyncAlert);
    const existing = await repo.findOne({
        where: {restaurantId, providerKey, type, dismissed: false},
    });
    return existing !== null;
}
