/**
 * Test data for validationErrorHandler middleware tests.
 */

export const validationPassData = [
    {
        description: 'calls next() when validation passes with no errors',
    },
];

export const validationFailData = [
    {
        description: 'responds with error when a single field fails validation',
        errors: [{msg: 'Name is required', param: 'name', location: 'body'}],
        expectedMessage: 'Name is required',
    },
    {
        description: 'responds with joined error messages when multiple fields fail',
        errors: [
            {msg: 'Name is required', param: 'name', location: 'body'},
            {msg: 'Email is invalid', param: 'email', location: 'body'},
        ],
        expectedMessage: 'Name is required, Email is invalid',
    },
];
