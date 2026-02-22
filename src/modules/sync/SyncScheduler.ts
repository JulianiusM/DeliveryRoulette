import settings from '../settings';
import {runSync} from './ProviderSyncService';

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the scheduled sync loop if `syncIntervalMs` > 0.
 * Safe to call multiple times – subsequent calls are no-ops.
 */
export function startScheduler(): void {
    if (timer) return;
    const intervalMs = settings.value.syncIntervalMs;
    if (!intervalMs || intervalMs <= 0) return;

    console.log(`🔄 Sync scheduler started (interval: ${intervalMs} ms)`);
    timer = setInterval(async () => {
        try {
            const result = await runSync();
            console.log(
                `🔄 Scheduled sync ${result.status}: ${result.restaurantsSynced} restaurant(s) synced`,
            );
        } catch (err) {
            console.error('🔄 Scheduled sync error:', err);
        }
    }, intervalMs);
}

/**
 * Stop the scheduled sync loop.
 */
export function stopScheduler(): void {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}
