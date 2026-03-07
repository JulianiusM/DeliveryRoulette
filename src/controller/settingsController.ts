import * as userPreferenceService from "../modules/database/services/UserPreferenceService";
import * as userDietPreferenceService from "../modules/database/services/UserDietPreferenceService";
import * as dietTagService from "../modules/database/services/DietTagService";
import * as userLocationService from "../modules/database/services/UserLocationService";
import {ValidationError} from "../modules/lib/errors";
import {requireAuthenticatedUser} from "../middleware/authMiddleware";

const SETTINGS_TEMPLATE = 'users/settings';
const MAX_DELIVERY_AREA_LENGTH = 150;
const MAX_LOCATION_LABEL_LENGTH = 150;
const MAX_ADDRESS_LENGTH = 255;
const MAX_CITY_LENGTH = 100;
const MAX_POSTAL_CODE_LENGTH = 20;
const MAX_COUNTRY_LENGTH = 100;

export interface DietTagOption {
    id: string;
    key: string;
    label: string;
    selected: boolean;
}

export interface DefaultLocationFormData {
    id: string;
    label: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postalCode: string;
    country: string;
    latitude: string;
    longitude: string;
}

export interface SavedLocationSummary {
    id: string;
    label: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postalCode: string;
    country: string;
    latitude?: number | null;
    longitude?: number | null;
    isDefault: boolean;
}

export interface SettingsFormData {
    deliveryArea: string;
    cuisineIncludes: string;
    cuisineExcludes: string;
    dietTags: DietTagOption[];
    defaultLocation: DefaultLocationFormData;
    savedLocations: SavedLocationSummary[];
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

interface SettingsPreferenceValues {
    deliveryArea: string;
    cuisineIncludes?: string | null;
    cuisineExcludes?: string | null;
}

interface LocationFormInput {
    id: string;
    label: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postalCode: string;
    country: string;
    latitudeText: string;
    longitudeText: string;
    latitude: number | null;
    longitude: number | null;
    hasAnyValue: boolean;
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
    return await buildSettingsFormData(userId);
}

export async function saveSettings(userId: number | undefined, body: any): Promise<SettingsFormData> {
    requireAuthenticatedUser(userId);

    const existingPref = await userPreferenceService.getByUserId(userId);
    const submittedDeliveryArea = normalizeText(body.deliveryArea);
    const trimmedIncludes = normalizeText(body.cuisineIncludes);
    const trimmedExcludes = normalizeText(body.cuisineExcludes);
    const locationInput = parseLocationFormInput(body);
    const dietTagIds = normalizeDietTagIds(body.dietTagIds);

    const draftPreference: SettingsPreferenceValues = {
        deliveryArea: submittedDeliveryArea || existingPref?.deliveryArea || '',
        cuisineIncludes: trimmedIncludes || null,
        cuisineExcludes: trimmedExcludes || null,
    };

    await validateSettingsInput(userId, draftPreference, dietTagIds, locationInput);

    let effectiveDeliveryArea = draftPreference.deliveryArea;
    if (locationInput.hasAnyValue) {
        const savedLocation = await userLocationService.upsertDefaultLocationForUser(userId, {
            id: locationInput.id || null,
            label: locationInput.label,
            addressLine1: locationInput.addressLine1 || null,
            addressLine2: locationInput.addressLine2 || null,
            city: locationInput.city || null,
            postalCode: locationInput.postalCode || null,
            country: locationInput.country || null,
            latitude: locationInput.latitude,
            longitude: locationInput.longitude,
        });
        effectiveDeliveryArea = savedLocation.label;
    }

    const pref = await userPreferenceService.upsert(userId, {
        deliveryArea: effectiveDeliveryArea,
        cuisineIncludes: trimmedIncludes || null,
        cuisineExcludes: trimmedExcludes || null,
    });

    await userDietPreferenceService.replaceForUser(userId, dietTagIds);

    return await buildSettingsFormData(userId, {preference: pref});
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

async function buildSettingsFormData(
    userId: number,
    overrides: {
        preference?: SettingsPreferenceValues | null;
        selectedDietTagIds?: string[];
        defaultLocation?: DefaultLocationFormData;
    } = {},
): Promise<SettingsFormData> {
    const preference = overrides.preference ?? await userPreferenceService.getByUserId(userId);
    const effectivePreference: SettingsPreferenceValues | null = preference
        ? {
            deliveryArea: preference.deliveryArea || '',
            cuisineIncludes: preference.cuisineIncludes ?? null,
            cuisineExcludes: preference.cuisineExcludes ?? null,
        }
        : null;

    const [allTags, selectedIds] = await Promise.all([
        userDietPreferenceService.getAllDietTags(),
        resolveSelectedDietTagIds(userId, overrides.selectedDietTagIds),
    ]);

    const persistedDefaultLocation = overrides.defaultLocation
        ? null
        : await userLocationService.getOrBackfillDefaultFromDeliveryArea(
            userId,
            effectivePreference?.deliveryArea ?? null,
        );
    const savedLocations = await userLocationService.listByUserId(userId);

    return {
        deliveryArea: effectivePreference?.deliveryArea || '',
        cuisineIncludes: effectivePreference?.cuisineIncludes || '',
        cuisineExcludes: effectivePreference?.cuisineExcludes || '',
        dietTags: allTags.map((tag) => ({
            id: tag.id,
            key: tag.key,
            label: tag.label,
            selected: selectedIds.has(tag.id),
        })),
        defaultLocation: overrides.defaultLocation ?? mapLocationToFormData(persistedDefaultLocation),
        savedLocations: savedLocations.map((location) => ({
            id: location.id,
            label: location.label,
            addressLine1: location.addressLine1 ?? '',
            addressLine2: location.addressLine2 ?? '',
            city: location.city ?? '',
            postalCode: location.postalCode ?? '',
            country: location.country ?? '',
            latitude: location.latitude ?? null,
            longitude: location.longitude ?? null,
            isDefault: Boolean(location.isDefault),
        })),
    };
}

async function resolveSelectedDietTagIds(userId: number, draftIds?: string[]): Promise<Set<string>> {
    if (draftIds !== undefined) {
        return new Set(draftIds);
    }

    const userPrefs = await userDietPreferenceService.getByUserId(userId);
    return new Set(userPrefs.map((pref) => pref.dietTagId));
}

function mapLocationToFormData(location?: {
    id: string;
    label: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
} | null): DefaultLocationFormData {
    return {
        id: location?.id ?? '',
        label: location?.label ?? '',
        addressLine1: location?.addressLine1 ?? '',
        addressLine2: location?.addressLine2 ?? '',
        city: location?.city ?? '',
        postalCode: location?.postalCode ?? '',
        country: location?.country ?? '',
        latitude: formatCoordinate(location?.latitude),
        longitude: formatCoordinate(location?.longitude),
    };
}

function parseLocationFormInput(body: any): LocationFormInput {
    const id = normalizeText(body.defaultLocationId);
    const label = normalizeText(body.defaultLocationLabel);
    const addressLine1 = normalizeText(body.defaultLocationAddressLine1);
    const addressLine2 = normalizeText(body.defaultLocationAddressLine2);
    const city = normalizeText(body.defaultLocationCity);
    const postalCode = normalizeText(body.defaultLocationPostalCode);
    const country = normalizeText(body.defaultLocationCountry);
    const latitudeText = normalizeText(body.defaultLocationLatitude);
    const longitudeText = normalizeText(body.defaultLocationLongitude);

    return {
        id,
        label,
        addressLine1,
        addressLine2,
        city,
        postalCode,
        country,
        latitudeText,
        longitudeText,
        latitude: parseCoordinate(latitudeText),
        longitude: parseCoordinate(longitudeText),
        hasAnyValue: [
            label,
            addressLine1,
            addressLine2,
            city,
            postalCode,
            country,
            latitudeText,
            longitudeText,
        ].some(Boolean),
    };
}

function normalizeDietTagIds(rawDietTagIds: unknown): string[] {
    const dietTagIds = Array.isArray(rawDietTagIds)
        ? rawDietTagIds
        : rawDietTagIds ? [rawDietTagIds] : [];

    return dietTagIds
        .map((value) => typeof value === 'string' ? value.trim() : '')
        .filter(Boolean);
}

async function validateSettingsInput(
    userId: number,
    preference: SettingsPreferenceValues,
    dietTagIds: string[],
    locationInput: LocationFormInput,
): Promise<void> {
    if (preference.deliveryArea.length > MAX_DELIVERY_AREA_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'Delivery area must be 150 characters or less.',
            preference,
            dietTagIds,
            locationInput,
        );
    }

    if (locationInput.label.length > MAX_LOCATION_LABEL_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'Default location label must be 150 characters or less.',
            preference,
            dietTagIds,
            locationInput,
        );
    }

    if (locationInput.addressLine1.length > MAX_ADDRESS_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'Address line 1 must be 255 characters or less.',
            preference,
            dietTagIds,
            locationInput,
        );
    }

    if (locationInput.addressLine2.length > MAX_ADDRESS_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'Address line 2 must be 255 characters or less.',
            preference,
            dietTagIds,
            locationInput,
        );
    }

    if (locationInput.city.length > MAX_CITY_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'City must be 100 characters or less.',
            preference,
            dietTagIds,
            locationInput,
        );
    }

    if (locationInput.postalCode.length > MAX_POSTAL_CODE_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'Postal code must be 20 characters or less.',
            preference,
            dietTagIds,
            locationInput,
        );
    }

    if (locationInput.country.length > MAX_COUNTRY_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'Country must be 100 characters or less.',
            preference,
            dietTagIds,
            locationInput,
        );
    }

    if (locationInput.hasAnyValue && !locationInput.label) {
        await throwSettingsValidationError(
            userId,
            'Default location label is required when saving a location.',
            preference,
            dietTagIds,
            locationInput,
        );
    }

    const latitudeProvided = Boolean(locationInput.latitudeText);
    const longitudeProvided = Boolean(locationInput.longitudeText);
    if (latitudeProvided !== longitudeProvided) {
        await throwSettingsValidationError(
            userId,
            'Latitude and longitude must both be provided together.',
            preference,
            dietTagIds,
            locationInput,
        );
    }

    if (latitudeProvided && (locationInput.latitude === null || locationInput.latitude < -90 || locationInput.latitude > 90)) {
        await throwSettingsValidationError(
            userId,
            'Latitude must be a valid number between -90 and 90.',
            preference,
            dietTagIds,
            locationInput,
        );
    }

    if (longitudeProvided && (locationInput.longitude === null || locationInput.longitude < -180 || locationInput.longitude > 180)) {
        await throwSettingsValidationError(
            userId,
            'Longitude must be a valid number between -180 and 180.',
            preference,
            dietTagIds,
            locationInput,
        );
    }
}

async function throwSettingsValidationError(
    userId: number,
    message: string,
    preference: SettingsPreferenceValues,
    dietTagIds: string[],
    locationInput: LocationFormInput,
): Promise<never> {
    const formData = await buildSettingsFormData(userId, {
        preference,
        selectedDietTagIds: dietTagIds,
        defaultLocation: {
            id: locationInput.id,
            label: locationInput.label,
            addressLine1: locationInput.addressLine1,
            addressLine2: locationInput.addressLine2,
            city: locationInput.city,
            postalCode: locationInput.postalCode,
            country: locationInput.country,
            latitude: locationInput.latitudeText,
            longitude: locationInput.longitudeText,
        },
    });
    throw new ValidationError(SETTINGS_TEMPLATE, message, formData);
}

function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function parseCoordinate(value: string): number | null {
    if (!value) {
        return null;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return null;
    }

    return numeric;
}

function formatCoordinate(value?: number | null): string {
    return Number.isFinite(value) ? String(value) : '';
}
