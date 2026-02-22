/**
 * Unit tests for validationErrorHandler middleware.
 * Tests handleValidationError for pass-through and error responses.
 */

import {Request, Response, NextFunction} from 'express';
import {validationResult} from 'express-validator';
import {
    validationPassData,
    validationFailData,
} from '../data/middleware/validationErrorHandlerData';

// ── Mock renderer ───────────────────────────────────────────
const mockRespondWithErrorJson = jest.fn();
jest.mock('../../src/modules/renderer', () => ({
    __esModule: true,
    default: {
        respondWithErrorJson: (...args: unknown[]) => mockRespondWithErrorJson(...args),
    },
}));

// ── Mock express-validator ──────────────────────────────────
jest.mock('express-validator', () => ({
    validationResult: jest.fn(),
}));

import {handleValidationError} from '../../src/middleware/validationErrorHandler';

const mockValidationResult = validationResult as jest.MockedFunction<typeof validationResult>;

function createMockReqRes(): {req: Request; res: Response; next: jest.Mock} {
    const req = {} as Request;
    const res = {
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn() as jest.Mock;
    return {req, res, next};
}

beforeEach(() => {
    jest.clearAllMocks();
});

// ── Validation passes ───────────────────────────────────────

describe('handleValidationError - validation passes', () => {
    test.each(validationPassData)('$description', () => {
        const {req, res, next} = createMockReqRes();
        mockValidationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        } as any);

        handleValidationError(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(mockRespondWithErrorJson).not.toHaveBeenCalled();
    });
});

// ── Validation fails ────────────────────────────────────────

describe('handleValidationError - validation fails', () => {
    test.each(validationFailData)('$description', ({errors, expectedMessage}) => {
        const {req, res, next} = createMockReqRes();
        mockValidationResult.mockReturnValue({
            isEmpty: () => false,
            array: () => errors,
        } as any);

        handleValidationError(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(mockRespondWithErrorJson).toHaveBeenCalledWith(res, expectedMessage);
    });
});
