import * as userPreferenceService from "../modules/database/services/UserPreferenceService";
import {ValidationError} from "../modules/lib/errors";
import {requireAuthenticatedUser} from "../middleware/authMiddleware";

const SETTINGS_TEMPLATE = 'users/settings';

export interface SettingsFormData {
    deliveryArea: string;
    cuisineIncludes: string;
    cuisineExcludes: string;
}

export async function getSettings(userId?: number): Promise<SettingsFormData> {
    requireAuthenticatedUser(userId);

    const pref = await userPreferenceService.getByUserId(userId);
    return {
        deliveryArea: pref?.deliveryArea || '',
        cuisineIncludes: pref?.cuisineIncludes || '',
        cuisineExcludes: pref?.cuisineExcludes || '',
    };
}

export async function saveSettings(userId: number | undefined, body: any): Promise<SettingsFormData> {
    requireAuthenticatedUser(userId);

    const {deliveryArea, cuisineIncludes, cuisineExcludes} = body;
    const returnInfo = {deliveryArea, cuisineIncludes, cuisineExcludes};

    const trimmedArea = (deliveryArea || '').trim();
    if (trimmedArea.length > 150) {
        throw new ValidationError(SETTINGS_TEMPLATE, 'Delivery area must be 150 characters or less.', returnInfo);
    }

    const trimmedIncludes = (cuisineIncludes || '').trim();
    const trimmedExcludes = (cuisineExcludes || '').trim();

    const pref = await userPreferenceService.upsert(userId, {
        deliveryArea: trimmedArea,
        cuisineIncludes: trimmedIncludes || null,
        cuisineExcludes: trimmedExcludes || null,
    });

    return {
        deliveryArea: pref.deliveryArea,
        cuisineIncludes: pref.cuisineIncludes || '',
        cuisineExcludes: pref.cuisineExcludes || '',
    };
}
