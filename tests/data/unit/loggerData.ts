/**
 * Test data for the logger module.
 */

/** Sensitive fields that should be redacted */
export const redactedFieldData = [
    {description: 'redacts password field', field: 'password', value: 'secret123'},
    {description: 'redacts secret field', field: 'secret', value: 'my-secret-key'},
    {description: 'redacts token field', field: 'token', value: 'abc-token-xyz'},
    {description: 'redacts authorization field', field: 'authorization', value: 'Bearer xyz'},
    {description: 'redacts cookie field', field: 'cookie', value: 'session=abc123'},
];

/** Safe fields that should NOT be redacted */
export const safeFieldData = [
    {description: 'preserves message field', field: 'message', value: 'hello world'},
    {description: 'preserves status field', field: 'status', value: 200},
    {description: 'preserves url field', field: 'url', value: '/api/test'},
];
