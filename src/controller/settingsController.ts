import * as userPreferenceService from "../modules/database/services/UserPreferenceService";
import * as userDietPreferenceService from "../modules/database/services/UserDietPreferenceService";
import * as dietTagService from "../modules/database/services/DietTagService";
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

export interface DietHeuristicSettingsFormData {
    scope: 'global';
    configs: Array<{
        id: string;
        key: string;
        label: string;
        keywordWhitelist: string;
        dishWhitelist: string;
    }>;
}

function parseWhitelistInput(raw: unknown): string[] {
    if (typeof raw !== 'string') return [];
    return raw
        .split(/[\n,]/g)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
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

export async function getDietHeuristicSettings(userId?: number): Promise<DietHeuristicSettingsFormData> {
    requireAuthenticatedUser(userId);

    const configs = await dietTagService.listDietTagConfigs();
    return {
        scope: 'global',
        configs: configs.map((config) => ({
            id: config.id,
            key: config.key,
            label: config.label,
            keywordWhitelist: config.keywordWhitelist.join('\n'),
            dishWhitelist: config.dishWhitelist.join('\n'),
        })),
    };
}

export async function saveDietHeuristicSettings(userId: number | undefined, body: any): Promise<DietHeuristicSettingsFormData> {
    requireAuthenticatedUser(userId);

    const configs = await dietTagService.listDietTagConfigs();
    const rawConfig = body?.dietConfig && typeof body.dietConfig === 'object'
        ? body.dietConfig as Record<string, any>
        : {};

    for (const config of configs) {
        const submitted = rawConfig[config.id];
        if (!submitted || typeof submitted !== 'object') {
            continue;
        }

        const keywordWhitelist = parseWhitelistInput(submitted.keywordWhitelist);
        const dishWhitelist = parseWhitelistInput(submitted.dishWhitelist);

        if (keywordWhitelist.length > 200) {
            throw new ValidationError('users/diet-settings', `${config.label}: keyword whitelist is too large.`, {});
        }
        if (dishWhitelist.length > 200) {
            throw new ValidationError('users/diet-settings', `${config.label}: dish whitelist is too large.`, {});
        }

        await dietTagService.updateDietTagConfig(config.id, {
            keywordWhitelist,
            dishWhitelist,
        });
    }

    return await getDietHeuristicSettings(userId);
}
