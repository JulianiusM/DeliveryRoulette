/**
 * Test data for the health route.
 */

/** Expected response fields when DB is available */
export const healthyResponseFields = ['status', 'version', 'uptime', 'db'];

/** Expected values when DB is available */
export const healthyExpected = {
    status: 'healthy',
    db: 'ok',
};

/** Expected values when DB is unavailable */
export const degradedExpected = {
    status: 'degraded',
    db: 'unavailable',
    httpStatus: 503,
};
