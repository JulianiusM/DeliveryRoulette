import express, {Request, Response} from 'express';
import rateLimit from 'express-rate-limit';

import * as userController from "../controller/userController";
import * as settingsController from "../controller/settingsController";
import renderer from "../modules/renderer";
import {asyncHandler} from '../modules/lib/asyncHandler';
import settings from "../modules/settings";
import {ExpectedError} from "../modules/lib/errors";
import {requireAdmin, requireAuth} from '../middleware/authMiddleware';
import {handleValidationError} from '../middleware/validationErrorHandler';
import {
    validateRegister, validateLogin, validateForgotPassword,
    validateResetPassword,
} from '../middleware/validationChains';

const app = express.Router();

// Rate limiting for authentication endpoints
// In E2E/test environments, use a higher limit to support parallel test sessions
const isTestEnv = ['test', 'e2e'].includes(process.env.NODE_ENV ?? '');
const authLimiter = rateLimit({
    windowMs: settings.value.rateLimitWindowMs,
    max: isTestEnv ? 100 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
});

/* GET users listing. */
app.get('/', asyncHandler((req: Request, res: Response) => {
    res.redirect('/users/dashboard');
}));

// User dashboard - overview of user's delivery preferences
app.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
    if (!req.session.user) {
        return res.redirect('/users/login');
    }

    const preferences = await settingsController.getSettings(req.session.user.id);

    renderer.renderWithData(res, 'users/dashboard', {
        restaurantCount: 0,
        suggestionCount: 0,
        syncAlertCount: 0,
        dietTagCount: 0,
        preferences,
    });
}));

// Managed items dashboard (placeholder for future admin functionality)
app.get('/manage-dashboard', asyncHandler(async (req: Request, res: Response) => {
    if (!req.session.user) {
        return res.redirect('/users/login');
    }
    // For now, redirect to regular dashboard
    res.redirect('/users/dashboard');
}));

app.get('/profile', requireAuth, asyncHandler((req: Request, res: Response) => {
    renderer.render(res, 'users/profile');
}));

// Registrierung von Benutzern
app.get('/register', asyncHandler((req: Request, res: Response) => {
    if (!settings.value.localLoginEnabled) return res.redirect("/users/oidc/login");
    renderer.render(res, 'users/register');  // Zeige das Registrierungsformular an
}));

app.post('/register', authLimiter, validateRegister, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    if (!settings.value.localLoginEnabled) throw new ExpectedError('Login is not enabled!', 'error', 500);
    await userController.registerUser(req.body);
    renderer.renderInfo(res, 'Account successfully registered. Please activate it using the link sent to your email.');
}));

// Login-Funktionalität
app.get('/login', asyncHandler((req: Request, res: Response) => {
    if (!settings.value.localLoginEnabled) return res.redirect("/users/oidc/login");
    renderer.render(res, 'users/login');  // Zeige das Login-Formular an
}));

app.post('/login', authLimiter, validateLogin, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    if (!settings.value.localLoginEnabled) throw new ExpectedError('Login is not enabled!', 'error', 500);
    await userController.loginUser(req.body, req.session);
    req.flash('success', 'Login successful');
    res.redirect('/users/dashboard');  // Weiterleitung nach dem Login
}));

// Logout
app.get('/logout', asyncHandler(async (req: Request, res: Response) => {
    const redirect = await userController.logoutUserOidc(req.session);
    res.redirect(redirect);
}));

// Passwort zurücksetzen: E-Mail mit Link senden
app.get('/forgot-password', asyncHandler((req: Request, res: Response) => {
    if (!settings.value.localLoginEnabled) throw new ExpectedError('Login is not enabled!', 'error', 500);
    renderer.render(res, 'users/forgot-password.pug');  // Zeige das Formular zum Zurücksetzen des Passworts
}));

app.post('/forgot-password', authLimiter, validateForgotPassword, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    if (!settings.value.localLoginEnabled) throw new ExpectedError('Login is not enabled!', 'error', 500);
    await userController.sendPasswordForgotMail(req.body.username);
    renderer.renderSuccess(res, 'A link has been sent to the email corresponding to this account (if present).')
}));

// Passwort zurücksetzen: Formular anzeigen
app.get('/reset-password/:token', asyncHandler(async (req: Request, res: Response) => {
    if (!settings.value.localLoginEnabled) throw new ExpectedError('Login is not enabled!', 'error', 500);
    const token = req.params.token as string;
    await userController.checkPasswordForgotToken(token);
    renderer.renderWithData(res, 'users/reset-password', {token});  // Zeige das Passwort-Reset-Formular an
}));

// Passwort zurücksetzen: Neues Passwort speichern
app.post('/reset-password/:token', authLimiter, validateResetPassword, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    if (!settings.value.localLoginEnabled) throw new ExpectedError('Login is not enabled!', 'error', 500);
    await userController.resetPassword(req.params.token as string, req.body);
    renderer.renderSuccess(res, 'Your password has been successfully reset')
}));

// Aktivierungs-Link
app.get('/activate/:token', asyncHandler(async (req: Request, res: Response) => {
    if (!settings.value.localLoginEnabled) throw new ExpectedError('Login is not enabled!', 'error', 500);
    await userController.activateAccount(req.params.token as string);
    renderer.renderSuccess(res, 'Your account has been activated. You can log in now.')
}));

// User preferences / settings
app.get('/settings', asyncHandler(async (req: Request, res: Response) => {
    if (!req.session.user) {
        return res.redirect('/users/login');
    }
    const locationId = typeof req.query.locationId === 'string' ? req.query.locationId : '';
    const data = await settingsController.getSettings(req.session.user.id, locationId);
    renderer.renderWithData(res, 'users/settings', data);
}));

app.post('/settings', asyncHandler(async (req: Request, res: Response) => {
    if (!req.session.user) {
        return res.redirect('/users/login');
    }
    const data = await settingsController.saveSettings(req.session.user.id, req.body);
    for (const notice of data.notices ?? []) {
        req.flash('info', notice);
    }
    req.flash('success', 'Settings saved successfully');
    res.redirect(buildSettingsRedirectPath(data.locationEditor.id));
}));

app.post('/settings/locations/:id/default', asyncHandler(async (req: Request, res: Response) => {
    if (!req.session.user) {
        return res.redirect('/users/login');
    }
    const data = await settingsController.setDefaultLocation(req.session.user.id, req.params.id);
    for (const notice of data.notices ?? []) {
        req.flash('info', notice);
    }
    req.flash('success', 'Default location updated');
    res.redirect(buildSettingsRedirectPath(data.locationEditor.id));
}));

app.post('/settings/locations/:id/delete', asyncHandler(async (req: Request, res: Response) => {
    if (!req.session.user) {
        return res.redirect('/users/login');
    }
    const data = await settingsController.deleteSavedLocation(req.session.user.id, req.params.id);
    req.flash('success', 'Saved location removed');
    res.redirect(buildSettingsRedirectPath(data.locationEditor.id));
}));

// Global diet heuristic configuration
app.get('/settings/diets', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const data = await settingsController.getDietHeuristicSettings(req.session.user!.id);
    renderer.renderWithData(res, 'users/diet-settings', data);
}));

app.post('/settings/diets', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    await settingsController.saveDietHeuristicSettings(req.session.user!.id, req.body);
    req.flash('success', 'Diet heuristic settings saved');
    res.redirect('/users/settings/diets');
}));

app.get('/oidc/login', asyncHandler(async (req: Request, res: Response) => {
    if (!settings.value.oidcEnabled) throw new ExpectedError('OIDC provider is not enabled!', 'error', 500);
    const redirect = await userController.loginUserWithOidc(req.session);
    res.redirect(redirect);
}));

app.get('/oidc/callback', asyncHandler(async (req: Request, res: Response) => {
    if (!settings.value.oidcEnabled) throw new ExpectedError('OIDC provider is not enabled!', 'error', 500);
    await userController.loginUserWithOidcCallback(req);
    res.redirect('/users/dashboard'); // or wherever you want to land post-login
}));

function buildSettingsRedirectPath(locationId?: string | null): string {
    const normalizedLocationId = typeof locationId === 'string' ? locationId.trim() : '';
    return normalizedLocationId
        ? `/users/settings?locationId=${encodeURIComponent(normalizedLocationId)}`
        : '/users/settings';
}

export default app;
