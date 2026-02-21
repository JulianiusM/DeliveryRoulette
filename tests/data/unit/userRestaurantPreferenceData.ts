/**
 * Test data for UserRestaurantPreferenceService unit tests
 */

export const samplePreference = {
    id: 'pref-1',
    userId: 1,
    restaurantId: 'rest-1',
    isFavorite: false,
    doNotSuggest: false,
    createdAt: new Date(),
    updatedAt: new Date(),
};

export const samplePreferenceFavorite = {
    ...samplePreference,
    isFavorite: true,
};

export const samplePreferenceDoNotSuggest = {
    ...samplePreference,
    doNotSuggest: true,
};

export const toggleFavoriteData = [
    {
        description: 'creates new preference with favorite=true when none exists',
        existingPref: null,
        expectedIsFavorite: true,
        expectedDoNotSuggest: false,
    },
    {
        description: 'toggles favorite from false to true on existing preference',
        existingPref: {...samplePreference, isFavorite: false},
        expectedIsFavorite: true,
        expectedDoNotSuggest: false,
    },
    {
        description: 'toggles favorite from true to false on existing preference',
        existingPref: {...samplePreference, isFavorite: true},
        expectedIsFavorite: false,
        expectedDoNotSuggest: false,
    },
];

export const toggleDoNotSuggestData = [
    {
        description: 'creates new preference with doNotSuggest=true when none exists',
        existingPref: null,
        expectedIsFavorite: false,
        expectedDoNotSuggest: true,
    },
    {
        description: 'toggles doNotSuggest from false to true on existing preference',
        existingPref: {...samplePreference, doNotSuggest: false},
        expectedIsFavorite: false,
        expectedDoNotSuggest: true,
    },
    {
        description: 'toggles doNotSuggest from true to false on existing preference',
        existingPref: {...samplePreference, doNotSuggest: true},
        expectedIsFavorite: false,
        expectedDoNotSuggest: false,
    },
];

export const getDoNotSuggestData = [
    {
        description: 'returns restaurant IDs with do-not-suggest flag',
        prefs: [
            {restaurantId: 'rest-1'},
            {restaurantId: 'rest-3'},
        ],
        expectedIds: ['rest-1', 'rest-3'],
    },
    {
        description: 'returns empty array when no do-not-suggest preferences',
        prefs: [],
        expectedIds: [],
    },
];
