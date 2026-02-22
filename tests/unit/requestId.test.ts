/**
 * Unit tests for the request ID middleware.
 * Tests that request IDs are generated or propagated and attached to request/response.
 */
import {Request, Response, NextFunction} from 'express';
import {requestIdMiddleware} from '../../src/middleware/requestIdMiddleware';
import {customIdData, uuidV4Pattern} from '../data/unit/requestIdData';

function createMockReqRes(headers: Record<string, string> = {}) {
    const req = {
        headers,
    } as unknown as Request;

    const resHeaders: Record<string, string> = {};
    const res = {
        setHeader: jest.fn((key: string, value: string) => {
            resHeaders[key] = value;
        }),
        getHeader: (key: string) => resHeaders[key],
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    return {req, res, next, resHeaders};
}

describe('requestIdMiddleware', () => {
    test('generates a UUID v4 when no X-Request-Id header is present', () => {
        const {req, res, next} = createMockReqRes();

        requestIdMiddleware(req, res, next);

        expect((req as any).id).toMatch(uuidV4Pattern);
        expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', (req as any).id);
        expect(next).toHaveBeenCalled();
    });

    describe('uses client-provided request ID', () => {
        test.each(customIdData)('$description', ({headerValue}) => {
            const {req, res, next} = createMockReqRes({'x-request-id': headerValue});

            requestIdMiddleware(req, res, next);

            expect((req as any).id).toBe(headerValue);
            expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', headerValue);
            expect(next).toHaveBeenCalled();
        });
    });

    test('attaches a child logger with requestId to req.log', () => {
        const {req, res, next} = createMockReqRes();

        requestIdMiddleware(req, res, next);

        expect((req as any).log).toBeDefined();
        expect(typeof (req as any).log.info).toBe('function');
    });

    test('each request gets a unique ID', () => {
        const {req: req1, res: res1, next: next1} = createMockReqRes();
        const {req: req2, res: res2, next: next2} = createMockReqRes();

        requestIdMiddleware(req1, res1, next1);
        requestIdMiddleware(req2, res2, next2);

        expect((req1 as any).id).not.toBe((req2 as any).id);
    });
});
