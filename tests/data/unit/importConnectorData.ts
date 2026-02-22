/**
 * Test data for ImportConnector unit tests.
 */

/** Expected display name for the import connector. */
export const expectedDisplayName = "Import";

/** Expected provider key value. */
export const expectedProviderKey = "import";

/** Queries to pass to listRestaurants (always returns empty). */
export const listRestaurantsQueries = [
    {description: 'returns empty for normal query', query: 'pizza'},
    {description: 'returns empty for empty query', query: ''},
];

/** External IDs to pass to fetchMenu (always returns empty menu). */
export const fetchMenuIds = [
    {description: 'returns empty menu for arbitrary ID', externalId: 'ext-123'},
    {description: 'returns empty menu for UUID', externalId: '550e8400-e29b-41d4-a716-446655440000'},
];
