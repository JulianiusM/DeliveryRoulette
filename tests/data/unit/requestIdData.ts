/**
 * Test data for the request ID middleware.
 */

/** Custom request ID scenarios */
export const customIdData = [
    {description: 'uses client-provided X-Request-Id', headerValue: 'custom-req-123'},
    {description: 'uses UUID-format client ID', headerValue: '550e8400-e29b-41d4-a716-446655440000'},
];

/** UUID v4 regex pattern */
export const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
