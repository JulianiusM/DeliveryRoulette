import * as userPreferenceService from "../modules/database/services/UserPreferenceService";
import * as userDietPreferenceService from "../modules/database/services/UserDietPreferenceService";
import {ValidationError} from "../modules/lib/errors";
import {requireAuthenticatedUser} from "../middleware/authMiddleware";

const SETTINGS_TEMPLATE = 'users/settings';

export interface DietTagOption {
    id: string;
    key: string;
    label: string;
    selected: boolean;
}

export interface SettingsFormData {
    deliveryArea: string;
    cuisineIncludes: string;
    cuisineExcludes: string;
    dietTags: DietTagOption[];
}

export async function getSettings(userId?: number): Promise<SettingsFormData> {
    requireAuthenticatedUser(userId);

    const [pref, allTags, userPrefs] = await Promise.all([
        userPreferenceService.getByUserId(userId),
        userDietPreferenceService.getAllDietTags(),
        userDietPreferenceService.getByUserId(userId),
    ]);

    const selectedIds = new Set(userPrefs.map(p => p.dietTagId));

    return {
        deliveryArea: pref?.deliveryArea || '',
        cuisineIncludes: pref?.cuisineIncludes || '',
        cuisineExcludes: pref?.cuisineExcludes || '',
        dietTags: allTags.map(tag => ({
            id: tag.id,
            key: tag.key,
            label: tag.label,
            selected: selectedIds.has(tag.id),
        })),
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

    // Parse diet tag IDs from form body
    const rawDietTagIds = body.dietTagIds;
    const dietTagIds: string[] = Array.isArray(rawDietTagIds)
        ? rawDietTagIds
        : rawDietTagIds ? [rawDietTagIds] : [];

    const [pref] = await Promise.all([
        userPreferenceService.upsert(userId, {
            deliveryArea: trimmedArea,
            cuisineIncludes: trimmedIncludes || null,
            cuisineExcludes: trimmedExcludes || null,
        }),
        userDietPreferenceService.replaceForUser(userId, dietTagIds),
    ]);

    // Re-fetch tags for the response
    const [allTags, userPrefs] = await Promise.all([
        userDietPreferenceService.getAllDietTags(),
        userDietPreferenceService.getByUserId(userId),
    ]);

    const selectedIds = new Set(userPrefs.map(p => p.dietTagId));

    return {
        deliveryArea: pref.deliveryArea,
        cuisineIncludes: pref.cuisineIncludes || '',
        cuisineExcludes: pref.cuisineExcludes || '',
        dietTags: allTags.map(tag => ({
            id: tag.id,
            key: tag.key,
            label: tag.label,
            selected: selectedIds.has(tag.id),
        })),
    };
}
