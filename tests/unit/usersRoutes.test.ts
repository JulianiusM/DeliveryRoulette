import type {Request, Response, NextFunction} from 'express';
import {
    usersRouteRenderData,
    usersSettingsRouteData,
} from '../data/unit/usersRoutesData';

const mockRendererRender = jest.fn();
const mockSaveSettings = jest.fn();

jest.mock('express-rate-limit', () => ({
    __esModule: true,
    default: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}));
jest.mock('../../src/controller/userController', () => ({}));
jest.mock('../../src/controller/settingsController', () => ({
    getSettings: jest.fn(),
    saveSettings: (...args: unknown[]) => mockSaveSettings(...args),
    setDefaultLocation: jest.fn(),
    deleteSavedLocation: jest.fn(),
    getDietHeuristicSettings: jest.fn(),
    saveDietHeuristicSettings: jest.fn(),
}));
jest.mock('../../src/modules/renderer', () => ({
    __esModule: true,
    default: {
        render: (...args: unknown[]) => mockRendererRender(...args),
        renderWithData: jest.fn(),
        renderInfo: jest.fn(),
        renderSuccess: jest.fn(),
    },
}));
jest.mock('../../src/middleware/validationChains', () => ({
    validateRegister: [],
    validateLogin: [],
    validateForgotPassword: [],
    validateResetPassword: [],
}));

import usersRouter from '../../src/routes/users';

function getRouteHandler(path: string, method: 'get' | 'post') {
    const stack = (usersRouter as any).stack;
    const layer = stack.find((entry: any) => entry.route?.path === path && entry.route.methods?.[method]);
    if (!layer) {
        throw new Error(`Missing route ${method.toUpperCase()} ${path}`);
    }
    return layer.route.stack[layer.route.stack.length - 1].handle;
}

describe('users routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test.each(usersRouteRenderData)('$description', async (testCase) => {
        const handler = getRouteHandler(testCase.path, testCase.method);
        const req = {
            session: {
                user: testCase.sessionUser ?? undefined,
            },
            flash: jest.fn(),
        } as unknown as Request;
        const res = {
            redirect: jest.fn(),
        } as unknown as Response;
        const next = jest.fn() as NextFunction;

        await handler(req, res, next);

        expect(mockRendererRender).toHaveBeenCalledWith(res, testCase.expectedView);
        expect(res.redirect).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalledWith(expect.anything());
    });

    test.each(usersSettingsRouteData)('$description', async (testCase) => {
        const handler = getRouteHandler(testCase.path, testCase.method);
        mockSaveSettings.mockResolvedValue({
            locationEditor: {id: 'loc-home'},
            notices: testCase.notices,
        });

        const req = {
            session: {
                user: {id: 1},
            },
            body: testCase.requestBody,
            flash: jest.fn(),
        } as unknown as Request;
        const res = {
            redirect: jest.fn(),
        } as unknown as Response;
        const next = jest.fn() as NextFunction;

        await handler(req, res, next);

        expect(mockSaveSettings).toHaveBeenCalledWith(1, testCase.requestBody);
        for (const notice of testCase.notices) {
            expect(req.flash).toHaveBeenCalledWith('info', notice);
        }
        expect(req.flash).toHaveBeenCalledWith('success', testCase.expectedSuccessMessage);
        expect(res.redirect).toHaveBeenCalledWith(testCase.expectedRedirect);
        expect(next).not.toHaveBeenCalledWith(expect.anything());
    });
});
