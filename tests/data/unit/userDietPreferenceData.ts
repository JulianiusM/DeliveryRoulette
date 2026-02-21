/**
 * Test data for UserDietPreferenceService unit tests
 */

export const sampleDietTags = [
    {id: 'tag-1', key: 'VEGAN', label: 'Vegan', createdAt: new Date(), updatedAt: new Date()},
    {id: 'tag-2', key: 'VEGETARIAN', label: 'Vegetarian', createdAt: new Date(), updatedAt: new Date()},
    {id: 'tag-3', key: 'GLUTEN_FREE', label: 'Gluten-free', createdAt: new Date(), updatedAt: new Date()},
];

export const sampleUserPrefs = [
    {
        id: 'pref-1',
        userId: 1,
        dietTagId: 'tag-1',
        dietTag: sampleDietTags[0],
        createdAt: new Date(),
    },
    {
        id: 'pref-2',
        userId: 1,
        dietTagId: 'tag-3',
        dietTag: sampleDietTags[2],
        createdAt: new Date(),
    },
];

export const getEffectiveDietFilterData = [
    {
        description: 'returns selected tag IDs for user with preferences',
        userPrefs: sampleUserPrefs,
        expectedIds: ['tag-1', 'tag-3'],
    },
    {
        description: 'returns empty array when user has no preferences',
        userPrefs: [],
        expectedIds: [],
    },
];

export const getEffectiveDietFiltersData = [
    {
        description: 'returns full diet tag objects for user preferences',
        userPrefs: sampleUserPrefs,
        expectedTags: [sampleDietTags[0], sampleDietTags[2]],
    },
    {
        description: 'returns empty array for user without preferences',
        userPrefs: [],
        expectedTags: [],
    },
];

export const replaceForUserData = [
    {
        description: 'replaces preferences with new tag IDs',
        tagIds: ['tag-1', 'tag-2'],
        validTags: [sampleDietTags[0], sampleDietTags[1]],
        expectedCreatedCount: 2,
    },
    {
        description: 'removes all preferences when empty array provided',
        tagIds: [],
        validTags: [],
        expectedCreatedCount: 0,
    },
    {
        description: 'filters out invalid tag IDs',
        tagIds: ['tag-1', 'invalid-id'],
        validTags: [sampleDietTags[0]],
        expectedCreatedCount: 1,
    },
];
