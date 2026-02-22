/**
 * Unit tests for the /health endpoint.
 * Tests healthy and degraded responses based on DB connectivity.
 */
import {Request, Response} from 'express';
import {healthyResponseFields, healthyExpected, degradedExpected} from '../data/unit/healthData';

// Mock the database module before importing the health route
const mockQuery = jest.fn();
jest.mock('../../src/modules/database/dataSource', () => ({
    AppDataSource: {
        query: mockQuery,
    },
}));

// Import after mock setup
import healthRouter from '../../src/routes/health';

function createMockRes() {
    const json = jest.fn();
    const status = jest.fn().mockReturnThis();
    return {json, status} as unknown as Response;
}

// Extract the route handler from the router
function getRouteHandler() {
    const stack = (healthRouter as any).stack;
    const layer = stack.find((l: any) => l.route?.path === '/');
    return layer.route.stack[0].handle;
}

describe('/health endpoint', () => {
    const handler = getRouteHandler();

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('returns healthy response when DB is available', async () => {
        mockQuery.mockResolvedValue([{1: 1}]);
        const res = createMockRes();

        await handler({} as Request, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: healthyExpected.status,
                db: healthyExpected.db,
            }),
        );

        const body = (res.json as jest.Mock).mock.calls[0][0];
        for (const field of healthyResponseFields) {
            expect(body).toHaveProperty(field);
        }
    });

    test('returns degraded response when DB is unavailable', async () => {
        mockQuery.mockRejectedValue(new Error('Connection refused'));
        const res = createMockRes();

        await handler({} as Request, res);

        expect(res.status).toHaveBeenCalledWith(degradedExpected.httpStatus);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: degradedExpected.status,
                db: degradedExpected.db,
            }),
        );
    });

    test('includes version string in response', async () => {
        mockQuery.mockResolvedValue([{1: 1}]);
        const res = createMockRes();

        await handler({} as Request, res);

        const body = (res.json as jest.Mock).mock.calls[0][0];
        expect(typeof body.version).toBe('string');
        expect(body.version.length).toBeGreaterThan(0);
    });

    test('includes uptime as a number', async () => {
        mockQuery.mockResolvedValue([{1: 1}]);
        const res = createMockRes();

        await handler({} as Request, res);

        const body = (res.json as jest.Mock).mock.calls[0][0];
        expect(typeof body.uptime).toBe('number');
        expect(body.uptime).toBeGreaterThanOrEqual(0);
    });

    test('does not expose sensitive information', async () => {
        mockQuery.mockResolvedValue([{1: 1}]);
        const res = createMockRes();

        await handler({} as Request, res);

        const body = (res.json as jest.Mock).mock.calls[0][0];
        const bodyStr = JSON.stringify(body);
        expect(bodyStr).not.toContain('password');
        expect(bodyStr).not.toContain('secret');
        expect(bodyStr).not.toContain('apiKey');
    });
});
