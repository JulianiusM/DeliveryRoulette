/**
 * Controller for Lieferando provider routes.
 *
 * Handles settings page rendering, listing sync, and paste-URL import.
 */
import * as lieferandoService from '../modules/providers/lieferando/LieferandoSyncService';
import {ExpectedError} from '../modules/lib/errors';

export interface LieferandoSettingsData {
    listingUrl: string;
    isEnabled: boolean;
}

export async function getSettingsPageData(userId: string): Promise<LieferandoSettingsData> {
    const config = await lieferandoService.getSourceConfig(userId);
    return {
        listingUrl: config?.listingUrl || '',
        isEnabled: config?.isEnabled ?? false,
    };
}

export async function syncListing(userId: string, listingUrl: string) {
    if (!listingUrl || typeof listingUrl !== 'string' || !listingUrl.trim()) {
        throw new ExpectedError('Please provide a Lieferando listing URL', 'error', 400);
    }

    try {
        lieferandoService.validateLieferandoListingUrl(listingUrl.trim());
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Invalid URL';
        throw new ExpectedError(msg, 'error', 400);
    }

    return await lieferandoService.syncFromListingUrl(userId, listingUrl.trim());
}

export async function importUrl(userId: string, menuUrl: string) {
    if (!menuUrl || typeof menuUrl !== 'string' || !menuUrl.trim()) {
        throw new ExpectedError('Please provide a Lieferando restaurant menu URL', 'error', 400);
    }

    try {
        lieferandoService.validateLieferandoMenuUrl(menuUrl.trim());
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Invalid URL';
        throw new ExpectedError(msg, 'error', 400);
    }

    return await lieferandoService.importFromMenuUrl(userId, menuUrl.trim());
}
