/**
 * Test data for settings controller tests
 */

export const sampleDietTags = [
    {id: 'tag-1', key: 'VEGAN', label: 'Vegan'},
    {id: 'tag-2', key: 'VEGETARIAN', label: 'Vegetarian'},
    {id: 'tag-3', key: 'GLUTEN_FREE', label: 'Gluten-free'},
];

export const sampleHomeLocation = {
    id: 'loc-home',
    userId: 1,
    label: 'Home',
    addressLine1: 'Main Street 1',
    addressLine2: '2nd Floor',
    city: 'Neutraubling',
    postalCode: '93073',
    country: 'Germany',
    latitude: 48.9889211,
    longitude: 12.1984299,
    isDefault: true,
    lastUsedAt: new Date('2026-03-01T10:00:00.000Z'),
    createdAt: new Date('2026-03-01T09:00:00.000Z'),
    updatedAt: new Date('2026-03-01T10:00:00.000Z'),
};

export const sampleOfficeLocation = {
    id: 'loc-office',
    userId: 1,
    label: 'Office',
    addressLine1: 'Business Park 8',
    addressLine2: null,
    city: 'Regensburg',
    postalCode: '93047',
    country: 'Germany',
    latitude: null,
    longitude: null,
    isDefault: false,
    lastUsedAt: new Date('2026-02-28T10:00:00.000Z'),
    createdAt: new Date('2026-02-28T09:00:00.000Z'),
    updatedAt: new Date('2026-02-28T10:00:00.000Z'),
};

export const backfilledDowntownLocation = {
    id: 'loc-downtown',
    userId: 1,
    label: 'Downtown',
    addressLine1: null,
    addressLine2: null,
    city: null,
    postalCode: null,
    country: null,
    latitude: null,
    longitude: null,
    isDefault: true,
    lastUsedAt: new Date('2026-03-02T10:00:00.000Z'),
    createdAt: new Date('2026-03-02T09:00:00.000Z'),
    updatedAt: new Date('2026-03-02T10:00:00.000Z'),
};

function summary(location: typeof sampleHomeLocation | typeof sampleOfficeLocation | typeof backfilledDowntownLocation) {
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
        isDefault: location.isDefault,
    };
}

function editor(location?: typeof sampleHomeLocation | typeof sampleOfficeLocation | typeof backfilledDowntownLocation | null, makeDefault = false) {
    return {
        id: location?.id ?? '',
        label: location?.label ?? '',
        addressLine1: location?.addressLine1 ?? '',
        addressLine2: location?.addressLine2 ?? '',
        city: location?.city ?? '',
        postalCode: location?.postalCode ?? '',
        country: location?.country ?? '',
        latitude: location?.latitude !== null && location?.latitude !== undefined ? String(location.latitude) : '',
        longitude: location?.longitude !== null && location?.longitude !== undefined ? String(location.longitude) : '',
        makeDefault,
    };
}

export const getSettingsData = [
    {
        description: 'returns empty defaults when no preferences or saved locations exist',
        existingPref: null,
        allDietTags: sampleDietTags,
        userDietPrefs: [],
        defaultLocation: null,
        savedLocations: [],
        editorLocationId: '',
        editorLocation: null,
        expected: {
            deliveryArea: '',
            cuisineIncludes: '',
            cuisineExcludes: '',
            dietTags: [
                {id: 'tag-1', key: 'VEGAN', label: 'Vegan', selected: false},
                {id: 'tag-2', key: 'VEGETARIAN', label: 'Vegetarian', selected: false},
                {id: 'tag-3', key: 'GLUTEN_FREE', label: 'Gluten-free', selected: false},
            ],
            defaultLocation: null,
            locationEditor: editor(null, false),
            savedLocations: [],
        },
    },
    {
        description: 'returns stored preferences with default location loaded into the editor',
        existingPref: {
            id: 1,
            userId: 1,
            deliveryArea: 'Home',
            cuisineIncludes: 'Italian, Japanese',
            cuisineExcludes: 'Fast Food',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        allDietTags: sampleDietTags,
        userDietPrefs: [
            {id: 'pref-1', userId: 1, dietTagId: 'tag-1', createdAt: new Date()},
            {id: 'pref-2', userId: 1, dietTagId: 'tag-3', createdAt: new Date()},
        ],
        defaultLocation: sampleHomeLocation,
        savedLocations: [sampleHomeLocation, sampleOfficeLocation],
        editorLocationId: '',
        editorLocation: sampleHomeLocation,
        expected: {
            deliveryArea: 'Home',
            cuisineIncludes: 'Italian, Japanese',
            cuisineExcludes: 'Fast Food',
            dietTags: [
                {id: 'tag-1', key: 'VEGAN', label: 'Vegan', selected: true},
                {id: 'tag-2', key: 'VEGETARIAN', label: 'Vegetarian', selected: false},
                {id: 'tag-3', key: 'GLUTEN_FREE', label: 'Gluten-free', selected: true},
            ],
            defaultLocation: summary(sampleHomeLocation),
            locationEditor: editor(sampleHomeLocation, true),
            savedLocations: [summary(sampleHomeLocation), summary(sampleOfficeLocation)],
        },
    },
    {
        description: 'loads a non-default saved location into the editor when requested',
        existingPref: {
            id: 2,
            userId: 1,
            deliveryArea: 'Home',
            cuisineIncludes: null,
            cuisineExcludes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        allDietTags: sampleDietTags,
        userDietPrefs: [],
        defaultLocation: sampleHomeLocation,
        savedLocations: [sampleHomeLocation, sampleOfficeLocation],
        editorLocationId: 'loc-office',
        editorLocation: sampleOfficeLocation,
        expected: {
            deliveryArea: 'Home',
            cuisineIncludes: '',
            cuisineExcludes: '',
            dietTags: [
                {id: 'tag-1', key: 'VEGAN', label: 'Vegan', selected: false},
                {id: 'tag-2', key: 'VEGETARIAN', label: 'Vegetarian', selected: false},
                {id: 'tag-3', key: 'GLUTEN_FREE', label: 'Gluten-free', selected: false},
            ],
            defaultLocation: summary(sampleHomeLocation),
            locationEditor: editor(sampleOfficeLocation, false),
            savedLocations: [summary(sampleHomeLocation), summary(sampleOfficeLocation)],
        },
    },
];

export const saveSettingsValidData = [
    {
        description: 'saves a new location as the default and derives deliveryArea from it',
        existingPref: null,
        initialDefaultLocation: null,
        geocodingResult: {status: 'skipped'},
        input: {
            defaultLocationLabel: '  Home  ',
            defaultLocationAddressLine1: '  Main Street 1  ',
            defaultLocationAddressLine2: '  2nd Floor  ',
            defaultLocationCity: '  Neutraubling  ',
            defaultLocationPostalCode: '  93073  ',
            defaultLocationCountry: '  Germany  ',
            defaultLocationLatitude: '48.9889211',
            defaultLocationLongitude: '12.1984299',
            defaultLocationMakeDefault: 'on',
            cuisineIncludes: 'Italian, Japanese',
            cuisineExcludes: 'Fast Food',
            dietTagIds: ['tag-1', 'tag-2'],
        },
        expectedPreferenceUpsert: {
            deliveryArea: 'Home',
            cuisineIncludes: 'Italian, Japanese',
            cuisineExcludes: 'Fast Food',
        },
        expectedDietTagIds: ['tag-1', 'tag-2'],
        expectedLocationUpsert: {
            id: null,
            label: 'Home',
            addressLine1: 'Main Street 1',
            addressLine2: '2nd Floor',
            city: 'Neutraubling',
            postalCode: '93073',
            country: 'Germany',
            latitude: 48.9889211,
            longitude: 12.1984299,
        },
        expectedLocationUpsertOptions: {makeDefault: true},
        upsertedLocation: sampleHomeLocation,
        resolvedDefaultLocation: sampleHomeLocation,
        savedLocationsAfterSave: [sampleHomeLocation],
        expectedEditor: editor(sampleHomeLocation, true),
        expectedDefaultLocation: summary(sampleHomeLocation),
        expectedNotices: [
            'Queued 1 location refresh job(s) for Home. Suggestions will use the updated availability after those background imports finish.',
        ],
    },
    {
        description: 'updates a non-default location without changing the current default',
        existingPref: {
            id: 3,
            userId: 1,
            deliveryArea: 'Home',
            cuisineIncludes: 'Old',
            cuisineExcludes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        initialDefaultLocation: sampleHomeLocation,
        geocodingResult: {status: 'skipped'},
        input: {
            defaultLocationId: 'loc-office',
            defaultLocationLabel: '  Office  ',
            defaultLocationAddressLine1: '  Business Park 10  ',
            defaultLocationCity: '  Regensburg  ',
            cuisineIncludes: '  Italian  ',
            cuisineExcludes: '  Sushi  ',
        },
        expectedPreferenceUpsert: {
            deliveryArea: 'Home',
            cuisineIncludes: 'Italian',
            cuisineExcludes: 'Sushi',
        },
        expectedDietTagIds: [],
        expectedLocationUpsert: {
            id: 'loc-office',
            label: 'Office',
            addressLine1: 'Business Park 10',
            addressLine2: null,
            city: 'Regensburg',
            postalCode: null,
            country: null,
            latitude: null,
            longitude: null,
        },
        expectedLocationUpsertOptions: {makeDefault: false},
        existingEditedLocationBeforeSave: sampleOfficeLocation,
        upsertedLocation: {
            ...sampleOfficeLocation,
            addressLine1: 'Business Park 10',
        },
        resolvedDefaultLocation: sampleHomeLocation,
        savedLocationsAfterSave: [
            sampleHomeLocation,
            {
                ...sampleOfficeLocation,
                addressLine1: 'Business Park 10',
            },
        ],
        expectedEditor: {
            ...editor({
                ...sampleOfficeLocation,
                addressLine1: 'Business Park 10',
            }, false),
        },
        expectedDefaultLocation: summary(sampleHomeLocation),
        expectedNotices: [
            'Queued 1 location refresh job(s) for Office. Suggestions will use the updated availability after those background imports finish.',
        ],
    },
    {
        description: 'resolves coordinates automatically from the entered address when none were provided manually',
        existingPref: null,
        initialDefaultLocation: null,
        geocodingResult: {
            status: 'resolved',
            latitude: 48.9889211,
            longitude: 12.1984299,
        },
        input: {
            defaultLocationLabel: '  Home  ',
            defaultLocationAddressLine1: '  Main Street 1  ',
            defaultLocationCity: '  Neutraubling  ',
            defaultLocationPostalCode: '  93073  ',
            defaultLocationCountry: '  Germany  ',
            defaultLocationMakeDefault: 'on',
        },
        expectedPreferenceUpsert: {
            deliveryArea: 'Home',
            cuisineIncludes: null,
            cuisineExcludes: null,
        },
        expectedDietTagIds: [],
        expectedLocationUpsert: {
            id: null,
            label: 'Home',
            addressLine1: 'Main Street 1',
            addressLine2: null,
            city: 'Neutraubling',
            postalCode: '93073',
            country: 'Germany',
            latitude: 48.9889211,
            longitude: 12.1984299,
        },
        expectedLocationUpsertOptions: {makeDefault: true},
        upsertedLocation: sampleHomeLocation,
        resolvedDefaultLocation: sampleHomeLocation,
        savedLocationsAfterSave: [sampleHomeLocation],
        expectedEditor: editor(sampleHomeLocation, true),
        expectedDefaultLocation: summary(sampleHomeLocation),
        expectedNotices: [
            'Queued 1 location refresh job(s) for Home. Suggestions will use the updated availability after those background imports finish.',
        ],
    },
    {
        description: 'keeps saving the location when automatic lookup is temporarily unavailable',
        existingPref: null,
        initialDefaultLocation: null,
        geocodingResult: {
            status: 'error',
            message: 'The geocoding service could not be reached.',
        },
        input: {
            defaultLocationLabel: 'Office',
            defaultLocationAddressLine1: 'Business Park 8',
            defaultLocationCity: 'Regensburg',
            defaultLocationPostalCode: '93047',
            defaultLocationCountry: 'Germany',
        },
        expectedPreferenceUpsert: {
            deliveryArea: 'Office',
            cuisineIncludes: null,
            cuisineExcludes: null,
        },
        expectedDietTagIds: [],
        expectedLocationUpsert: {
            id: null,
            label: 'Office',
            addressLine1: 'Business Park 8',
            addressLine2: null,
            city: 'Regensburg',
            postalCode: '93047',
            country: 'Germany',
            latitude: null,
            longitude: null,
        },
        expectedLocationUpsertOptions: {makeDefault: false},
        upsertedLocation: {
            ...sampleOfficeLocation,
            id: 'loc-office-new',
            label: 'Office',
            addressLine1: 'Business Park 8',
            city: 'Regensburg',
            postalCode: '93047',
            country: 'Germany',
            isDefault: true,
        },
        resolvedDefaultLocation: {
            ...sampleOfficeLocation,
            id: 'loc-office-new',
            label: 'Office',
            addressLine1: 'Business Park 8',
            city: 'Regensburg',
            postalCode: '93047',
            country: 'Germany',
            isDefault: true,
        },
        savedLocationsAfterSave: [
            {
                ...sampleOfficeLocation,
                id: 'loc-office-new',
                label: 'Office',
                addressLine1: 'Business Park 8',
                city: 'Regensburg',
                postalCode: '93047',
                country: 'Germany',
                isDefault: true,
            },
        ],
        expectedEditor: {
            ...editor({
                ...sampleOfficeLocation,
                id: 'loc-office-new',
                label: 'Office',
                addressLine1: 'Business Park 8',
                city: 'Regensburg',
                postalCode: '93047',
                country: 'Germany',
                isDefault: true,
            }, true),
        },
        expectedDefaultLocation: {
            id: 'loc-office-new',
            label: 'Office',
            addressLine1: 'Business Park 8',
            addressLine2: '',
            city: 'Regensburg',
            postalCode: '93047',
            country: 'Germany',
            latitude: null,
            longitude: null,
            isDefault: true,
        },
        expectedNotices: [
            'The location was saved, but coordinates could not be resolved right now. Retry later or enter them manually.',
            'Queued 1 location refresh job(s) for Office. Suggestions will use the updated availability after those background imports finish.',
        ],
    },
    {
        description: 'handles missing fields gracefully when nothing is configured yet',
        existingPref: null,
        initialDefaultLocation: null,
        geocodingResult: {status: 'skipped'},
        input: {},
        expectedPreferenceUpsert: {
            deliveryArea: '',
            cuisineIncludes: null,
            cuisineExcludes: null,
        },
        expectedDietTagIds: [],
        expectedLocationUpsert: null,
        expectedLocationUpsertOptions: null,
        upsertedLocation: null,
        resolvedDefaultLocation: null,
        savedLocationsAfterSave: [],
        expectedEditor: editor(null, false),
        expectedDefaultLocation: null,
        expectedNotices: [],
    },
];

export const saveSettingsInvalidData = [
    {
        description: 'rejects delivery area exceeding 150 characters',
        existingPref: null,
        initialDefaultLocation: null,
        input: {
            deliveryArea: 'A'.repeat(151),
        },
        expectedError: 'Delivery area must be 150 characters or less.',
    },
    {
        description: 'rejects missing location label when a structured location field is supplied',
        existingPref: null,
        initialDefaultLocation: null,
        input: {
            defaultLocationCity: 'Regensburg',
        },
        expectedError: 'Location label is required when saving a location.',
    },
    {
        description: 'rejects incomplete coordinate pairs',
        existingPref: null,
        initialDefaultLocation: null,
        input: {
            defaultLocationLabel: 'Home',
            defaultLocationLatitude: '48.9889211',
        },
        expectedError: 'Latitude and longitude must both be provided together.',
    },
    {
        description: 'rejects invalid coordinate ranges',
        existingPref: null,
        initialDefaultLocation: null,
        geocodingResult: {status: 'skipped'},
        input: {
            defaultLocationLabel: 'Home',
            defaultLocationLatitude: '91',
            defaultLocationLongitude: '12.1984299',
        },
        expectedError: 'Latitude must be a valid number between -90 and 90.',
    },
    {
        description: 'rejects an address that cannot be geocoded automatically',
        existingPref: null,
        initialDefaultLocation: null,
        geocodingResult: {
            status: 'no_match',
            message: 'Coordinates could not be resolved from the entered address.',
        },
        input: {
            defaultLocationLabel: 'Home',
            defaultLocationAddressLine1: 'Nowhere 999',
            defaultLocationCity: 'Unknownville',
            defaultLocationPostalCode: '00000',
            defaultLocationCountry: 'Germany',
        },
        expectedError: 'Coordinates could not be resolved from the entered address. Refine the address or enter latitude and longitude manually.',
    },
];

export const setDefaultLocationData = [
    {
        description: 'switches the current default location',
        locationId: 'loc-office',
        existingPref: {
            id: 4,
            userId: 1,
            deliveryArea: 'Home',
            cuisineIncludes: 'Italian',
            cuisineExcludes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        newDefaultLocation: {
            ...sampleOfficeLocation,
            isDefault: true,
        },
        savedLocations: [
            {
                ...sampleOfficeLocation,
                isDefault: true,
            },
            {
                ...sampleHomeLocation,
                isDefault: false,
            },
        ],
    },
];

export const deleteSavedLocationData = [
    {
        description: 'deletes the current default and falls back to the remaining saved location',
        locationId: 'loc-home',
        existingPref: {
            id: 5,
            userId: 1,
            deliveryArea: 'Home',
            cuisineIncludes: 'Italian',
            cuisineExcludes: 'Fast Food',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        deleteResult: {
            deleted: true,
            newDefaultLocation: {
                ...sampleOfficeLocation,
                isDefault: true,
            },
            remainingLocations: [
                {
                    ...sampleOfficeLocation,
                    isDefault: true,
                },
            ],
        },
        savedLocations: [
            {
                ...sampleOfficeLocation,
                isDefault: true,
            },
        ],
    },
];

export const settingsLocationSamples = {
    sampleDietTags,
    sampleHomeLocation,
    sampleOfficeLocation,
    backfilledDowntownLocation,
};
