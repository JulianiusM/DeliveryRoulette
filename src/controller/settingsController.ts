import * as userPreferenceService from "../modules/database/services/UserPreferenceService";
import * as userDietPreferenceService from "../modules/database/services/UserDietPreferenceService";
import * as dietTagService from "../modules/database/services/DietTagService";
import * as userLocationService from "../modules/database/services/UserLocationService";
import * as addressGeocodingService from "../modules/lib/addressGeocoding";
import * as userLocationImportService from "../modules/sync/UserLocationImportService";
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

export interface LocationEditorFormData {
    id: string;
    label: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postalCode: string;
    country: string;
    latitude: string;
    longitude: string;
    makeDefault: boolean;
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
    defaultLocation: SavedLocationSummary | null;
    locationEditor: LocationEditorFormData;
    savedLocations: SavedLocationSummary[];
    notices?: string[];
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
    makeDefault: boolean;
    hasAnyValue: boolean;
}

interface LocationCoordinateResolution {
    locationInput: LocationFormInput;
    notices: string[];
}

function parseWhitelistInput(raw: unknown): string[] {
    if (typeof raw !== 'string') return [];
    return raw
        .split(/[\n,]/g)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

export async function getSettings(
    userId?: number,
    editorLocationId?: string | null,
): Promise<SettingsFormData> {
    requireAuthenticatedUser(userId);
    return await buildSettingsFormData(userId, {
        editorLocationId: normalizeText(editorLocationId),
    });
}

export async function saveSettings(userId: number | undefined, body: any): Promise<SettingsFormData> {
    requireAuthenticatedUser(userId);

    const existingPref = await userPreferenceService.getByUserId(userId);
    const submittedDeliveryArea = normalizeText(body.deliveryArea);
    const trimmedIncludes = normalizeText(body.cuisineIncludes);
    const trimmedExcludes = normalizeText(body.cuisineExcludes);
    const dietTagIds = normalizeDietTagIds(body.dietTagIds);
    const locationInput = parseLocationFormInput(body);
    const existingEditedLocation = locationInput.id
        ? await userLocationService.getByIdForUser(userId, locationInput.id)
        : null;
    const existingDefaultLocation = await userLocationService.getOrBackfillDefaultFromDeliveryArea(
        userId,
        existingPref?.deliveryArea ?? null,
    );

    const draftPreference: SettingsPreferenceValues = {
        deliveryArea: submittedDeliveryArea || existingDefaultLocation?.label || existingPref?.deliveryArea || '',
        cuisineIncludes: trimmedIncludes || null,
        cuisineExcludes: trimmedExcludes || null,
    };

    await validateSettingsInput(userId, draftPreference, dietTagIds, locationInput, existingDefaultLocation?.id ?? '');
    const coordinateResolution = await resolveLocationCoordinatesIfNeeded(
        userId,
        draftPreference,
        dietTagIds,
        locationInput,
        existingDefaultLocation?.id ?? '',
    );

    let currentDefaultLocation = existingDefaultLocation;
    let savedLocationId = coordinateResolution.locationInput.id;
    let locationImportNotices: string[] = [];
    if (coordinateResolution.locationInput.hasAnyValue) {
        const savedLocation = await userLocationService.upsertLocationForUser(userId, {
            id: coordinateResolution.locationInput.id || null,
            label: coordinateResolution.locationInput.label,
            addressLine1: coordinateResolution.locationInput.addressLine1 || null,
            addressLine2: coordinateResolution.locationInput.addressLine2 || null,
            city: coordinateResolution.locationInput.city || null,
            postalCode: coordinateResolution.locationInput.postalCode || null,
            country: coordinateResolution.locationInput.country || null,
            latitude: coordinateResolution.locationInput.latitude,
            longitude: coordinateResolution.locationInput.longitude,
        }, {
            makeDefault: coordinateResolution.locationInput.makeDefault,
        });
        savedLocationId = savedLocation.id;
        currentDefaultLocation = savedLocation.isDefault
            ? savedLocation
            : await userLocationService.getDefaultByUserId(userId);

        if (shouldQueueLocationRefresh(existingEditedLocation, coordinateResolution.locationInput)) {
            const refreshResult = await userLocationImportService.queueSavedLocationRefreshes(userId, savedLocation.id);
            locationImportNotices = buildLocationImportNotices(refreshResult, savedLocation.label);
        }
    }

    const pref = await userPreferenceService.upsert(userId, {
        deliveryArea: currentDefaultLocation?.label ?? draftPreference.deliveryArea,
        cuisineIncludes: trimmedIncludes || null,
        cuisineExcludes: trimmedExcludes || null,
    });

    await userDietPreferenceService.replaceForUser(userId, dietTagIds);

    const formData = await buildSettingsFormData(userId, {
        preference: pref,
        selectedDietTagIds: dietTagIds,
        editorLocationId: savedLocationId || currentDefaultLocation?.id || '',
    });
    if (coordinateResolution.notices.length > 0) {
        formData.notices = coordinateResolution.notices;
    }
    if (locationImportNotices.length > 0) {
        formData.notices = [...(formData.notices ?? []), ...locationImportNotices];
    }
    return formData;
}

export async function setDefaultLocation(
    userId: number | undefined,
    locationId: string,
): Promise<SettingsFormData> {
    requireAuthenticatedUser(userId);

    const normalizedId = normalizeText(locationId);
    const savedLocation = await userLocationService.setDefaultLocationForUser(userId, normalizedId);
    if (!savedLocation) {
        throw new ValidationError(
            SETTINGS_TEMPLATE,
            'Saved location not found.',
            await buildSettingsFormData(userId),
        );
    }

    const preference = await userPreferenceService.getByUserId(userId);
    const pref = await userPreferenceService.upsert(userId, {
        deliveryArea: savedLocation.label,
        cuisineIncludes: preference?.cuisineIncludes ?? null,
        cuisineExcludes: preference?.cuisineExcludes ?? null,
    });

    const formData = await buildSettingsFormData(userId, {
        preference: pref,
        editorLocationId: savedLocation.id,
    });
    const refreshResult = await userLocationImportService.queueSavedLocationRefreshes(userId, savedLocation.id);
    const locationImportNotices = buildLocationImportNotices(refreshResult, savedLocation.label);
    if (locationImportNotices.length > 0) {
        formData.notices = locationImportNotices;
    }
    return formData;
}

export async function deleteSavedLocation(
    userId: number | undefined,
    locationId: string,
): Promise<SettingsFormData> {
    requireAuthenticatedUser(userId);

    const normalizedId = normalizeText(locationId);
    const deleted = await userLocationService.deleteLocationForUser(userId, normalizedId);
    if (!deleted.deleted) {
        throw new ValidationError(
            SETTINGS_TEMPLATE,
            'Saved location not found.',
            await buildSettingsFormData(userId),
        );
    }

    const preference = await userPreferenceService.getByUserId(userId);
    const pref = await userPreferenceService.upsert(userId, {
        deliveryArea: deleted.newDefaultLocation?.label ?? '',
        cuisineIncludes: preference?.cuisineIncludes ?? null,
        cuisineExcludes: preference?.cuisineExcludes ?? null,
    });

    return await buildSettingsFormData(userId, {
        preference: pref,
        editorLocationId: deleted.newDefaultLocation?.id ?? deleted.remainingLocations[0]?.id ?? '',
    });
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
        defaultLocation?: SavedLocationSummary | null;
        locationEditor?: LocationEditorFormData;
        editorLocationId?: string;
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

    const persistedDefaultLocation = overrides.defaultLocation !== undefined
        ? overrides.defaultLocation
        : mapLocationToSummary(await userLocationService.getOrBackfillDefaultFromDeliveryArea(
            userId,
            effectivePreference?.deliveryArea ?? null,
        ));

    const savedLocations = await userLocationService.listByUserId(userId);
    const editorSource = overrides.locationEditor
        ? null
        : await resolveEditorLocation(userId, overrides.editorLocationId ?? '', persistedDefaultLocation?.id ?? '');

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
        defaultLocation: persistedDefaultLocation,
        locationEditor: overrides.locationEditor ?? mapLocationToFormData(
            editorSource,
            persistedDefaultLocation?.id ?? '',
        ),
        savedLocations: savedLocations.map((location) => mapLocationToSummary(location)!),
    };
}

async function resolveSelectedDietTagIds(userId: number, draftIds?: string[]): Promise<Set<string>> {
    if (draftIds !== undefined) {
        return new Set(draftIds);
    }

    const userPrefs = await userDietPreferenceService.getByUserId(userId);
    return new Set(userPrefs.map((pref) => pref.dietTagId));
}

async function resolveEditorLocation(
    userId: number,
    editorLocationId: string,
    defaultLocationId: string,
) {
    const requestedId = normalizeText(editorLocationId);
    if (requestedId) {
        const requested = await userLocationService.getByIdForUser(userId, requestedId);
        if (requested) {
            return requested;
        }
    }

    if (defaultLocationId) {
        return await userLocationService.getByIdForUser(userId, defaultLocationId);
    }

    return null;
}

function mapLocationToSummary(location?: {
    id: string;
    label: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isDefault?: boolean;
} | null): SavedLocationSummary | null {
    if (!location) {
        return null;
    }

    return {
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
    };
}

function mapLocationToFormData(
    location?: {
        id: string;
        label: string;
        addressLine1?: string | null;
        addressLine2?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: string | null;
        latitude?: number | null;
        longitude?: number | null;
    } | null,
    defaultLocationId: string = '',
): LocationEditorFormData {
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
        makeDefault: Boolean(location?.id) && location?.id === defaultLocationId,
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
    const makeDefault = parseBooleanLike(body.defaultLocationMakeDefault);

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
        makeDefault,
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

async function resolveLocationCoordinatesIfNeeded(
    userId: number,
    preference: SettingsPreferenceValues,
    dietTagIds: string[],
    locationInput: LocationFormInput,
    defaultLocationId: string,
): Promise<LocationCoordinateResolution> {
    const hasManualCoordinates = Boolean(locationInput.latitudeText) && Boolean(locationInput.longitudeText);
    if (!locationInput.hasAnyValue || hasManualCoordinates) {
        return {locationInput, notices: []};
    }

    const geocodeResult = await addressGeocodingService.resolveCoordinates({
        addressLine1: locationInput.addressLine1,
        addressLine2: locationInput.addressLine2,
        city: locationInput.city,
        postalCode: locationInput.postalCode,
        country: locationInput.country,
    });

    if (geocodeResult.status === 'resolved') {
        return {
            locationInput: {
                ...locationInput,
                latitude: geocodeResult.latitude ?? null,
                longitude: geocodeResult.longitude ?? null,
                latitudeText: geocodeResult.latitude !== undefined ? String(geocodeResult.latitude) : locationInput.latitudeText,
                longitudeText: geocodeResult.longitude !== undefined ? String(geocodeResult.longitude) : locationInput.longitudeText,
            },
            notices: [],
        };
    }

    if (geocodeResult.status === 'no_match') {
        await throwSettingsValidationError(
            userId,
            'Coordinates could not be resolved from the entered address. Refine the address or enter latitude and longitude manually.',
            preference,
            dietTagIds,
            locationInput,
            defaultLocationId,
        );
    }

    if (geocodeResult.status === 'disabled') {
        return {
            locationInput,
            notices: [
                'The location was saved without coordinates because automatic coordinate lookup is disabled.',
            ],
        };
    }

    if (geocodeResult.status === 'error') {
        return {
            locationInput,
            notices: [
                'The location was saved, but coordinates could not be resolved right now. Retry later or enter them manually.',
            ],
        };
    }

    return {locationInput, notices: []};
}

async function validateSettingsInput(
    userId: number,
    preference: SettingsPreferenceValues,
    dietTagIds: string[],
    locationInput: LocationFormInput,
    defaultLocationId: string,
): Promise<void> {
    if (preference.deliveryArea.length > MAX_DELIVERY_AREA_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'Delivery area must be 150 characters or less.',
            preference,
            dietTagIds,
            locationInput,
            defaultLocationId,
        );
    }

    if (locationInput.label.length > MAX_LOCATION_LABEL_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'Location label must be 150 characters or less.',
            preference,
            dietTagIds,
            locationInput,
            defaultLocationId,
        );
    }

    if (locationInput.addressLine1.length > MAX_ADDRESS_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'Address line 1 must be 255 characters or less.',
            preference,
            dietTagIds,
            locationInput,
            defaultLocationId,
        );
    }

    if (locationInput.addressLine2.length > MAX_ADDRESS_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'Address line 2 must be 255 characters or less.',
            preference,
            dietTagIds,
            locationInput,
            defaultLocationId,
        );
    }

    if (locationInput.city.length > MAX_CITY_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'City must be 100 characters or less.',
            preference,
            dietTagIds,
            locationInput,
            defaultLocationId,
        );
    }

    if (locationInput.postalCode.length > MAX_POSTAL_CODE_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'Postal code must be 20 characters or less.',
            preference,
            dietTagIds,
            locationInput,
            defaultLocationId,
        );
    }

    if (locationInput.country.length > MAX_COUNTRY_LENGTH) {
        await throwSettingsValidationError(
            userId,
            'Country must be 100 characters or less.',
            preference,
            dietTagIds,
            locationInput,
            defaultLocationId,
        );
    }

    if (locationInput.hasAnyValue && !locationInput.label) {
        await throwSettingsValidationError(
            userId,
            'Location label is required when saving a location.',
            preference,
            dietTagIds,
            locationInput,
            defaultLocationId,
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
            defaultLocationId,
        );
    }

    if (latitudeProvided && (locationInput.latitude === null || locationInput.latitude < -90 || locationInput.latitude > 90)) {
        await throwSettingsValidationError(
            userId,
            'Latitude must be a valid number between -90 and 90.',
            preference,
            dietTagIds,
            locationInput,
            defaultLocationId,
        );
    }

    if (longitudeProvided && (locationInput.longitude === null || locationInput.longitude < -180 || locationInput.longitude > 180)) {
        await throwSettingsValidationError(
            userId,
            'Longitude must be a valid number between -180 and 180.',
            preference,
            dietTagIds,
            locationInput,
            defaultLocationId,
        );
    }
}

async function throwSettingsValidationError(
    userId: number,
    message: string,
    preference: SettingsPreferenceValues,
    dietTagIds: string[],
    locationInput: LocationFormInput,
    defaultLocationId: string,
): Promise<never> {
    const formData = await buildSettingsFormData(userId, {
        preference,
        selectedDietTagIds: dietTagIds,
        locationEditor: {
            id: locationInput.id,
            label: locationInput.label,
            addressLine1: locationInput.addressLine1,
            addressLine2: locationInput.addressLine2,
            city: locationInput.city,
            postalCode: locationInput.postalCode,
            country: locationInput.country,
            latitude: locationInput.latitudeText,
            longitude: locationInput.longitudeText,
            makeDefault: locationInput.makeDefault || Boolean(locationInput.id && locationInput.id === defaultLocationId),
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

function parseBooleanLike(value: unknown): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return /^(1|true|yes|on)$/i.test(value);
    }
    return false;
}

function formatCoordinate(value?: number | null): string {
    return Number.isFinite(value) ? String(value) : '';
}

function shouldQueueLocationRefresh(
    existingLocation: {
        label: string;
        addressLine1?: string | null;
        addressLine2?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        isDefault?: boolean;
    } | null,
    locationInput: LocationFormInput,
): boolean {
    if (!existingLocation) {
        return true;
    }

    return existingLocation.label !== locationInput.label
        || normalizeText(existingLocation.addressLine1) !== locationInput.addressLine1
        || normalizeText(existingLocation.addressLine2) !== locationInput.addressLine2
        || normalizeText(existingLocation.city) !== locationInput.city
        || normalizeText(existingLocation.postalCode) !== locationInput.postalCode
        || normalizeText(existingLocation.country) !== locationInput.country
        || normalizeCoordinateValue(existingLocation.latitude) !== normalizeCoordinateValue(locationInput.latitude)
        || normalizeCoordinateValue(existingLocation.longitude) !== normalizeCoordinateValue(locationInput.longitude)
        || (Boolean(existingLocation.isDefault) !== locationInput.makeDefault && locationInput.makeDefault);
}

function normalizeCoordinateValue(value?: number | null): number | null {
    return Number.isFinite(value) ? Number(value) : null;
}

function buildLocationImportNotices(
    refreshResult: userLocationImportService.QueuedLocationImportResult,
    locationLabel: string,
): string[] {
    const notices: string[] = [];

    if (refreshResult.queuedJobs.length > 0) {
        notices.push(
            `Queued ${refreshResult.queuedJobs.length} location refresh job(s) for ${locationLabel}. Suggestions will use the updated availability after those background imports finish.`,
        );
    }

    if (refreshResult.issues.length > 0) {
        notices.push(
            `Some saved location imports could not be refreshed automatically: ${refreshResult.issues.map((issue) => `${issue.providerKey} (${issue.reason})`).join('; ')}`,
        );
    }

    if (refreshResult.queuedJobs.length === 0 && refreshResult.issues.length === 0) {
        notices.push(
            'No saved location import sources are configured yet. Open Location Imports to populate location-aware availability for suggestions.',
        );
    }

    return notices;
}
