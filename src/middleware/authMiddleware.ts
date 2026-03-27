import {NextFunction, Request, Response} from 'express';
import {ExpectedError} from '../modules/lib/errors';
import settings from '../modules/settings';
import {User} from '../modules/database/entities/user/User';

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (!req.session.user) {
        if (req.path.startsWith('/api/')) {
            throw new ExpectedError('Authentication required', 'error', 401);
        }
        req.flash('error', 'Please log in to access this page');
        res.redirect('/users/login');
        return;
    }
    next();
}

export function isAdminUser(user?: Partial<User> | null): boolean {
    if (!user) {
        return false;
    }

    if (user.role === 'admin') {
        return true;
    }

    const adminUsernames = new Set(settings.value.adminUsernames.map((entry) => entry.toLowerCase()));
    const adminEmails = new Set(settings.value.adminEmails.map((entry) => entry.toLowerCase()));
    const username = typeof user.username === 'string' ? user.username.trim().toLowerCase() : '';
    const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';

    return (username.length > 0 && adminUsernames.has(username))
        || (email.length > 0 && adminEmails.has(email));
}

export function isAdminSession(session: Request['session'] | undefined | null): boolean {
    return isAdminUser(session?.user ?? null);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    requireAuth(req, res, () => {
        if (!isAdminSession(req.session)) {
            throw new ExpectedError('Administrator permissions are required.', 'error', 403);
        }
        next();
    });
}

/**
 * Middleware factory to check if user owns a resource
 * Use after fetching the resource and attaching it to res.locals
 */
export function requireOwnership(resourceKey: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const resource = res.locals[resourceKey];
        const userId = req.session.user?.id;

        if (!resource) {
            throw new ExpectedError('Resource not found', 'error', 404);
        }

        // Check ownerId on the resource
        if (resource.ownerId !== userId) {
            throw new ExpectedError('You do not have permission to access this resource', 'error', 403);
        }

        next();
    };
}

/**
 * Check ownership in controller context (not middleware)
 * Throws an error if user doesn't own the resource
 */
export function checkOwnership(resource: { ownerId?: number | null }, userId?: number): void {
    if (!userId) {
        throw new ExpectedError('Authentication required', 'error', 401);
    }
    if (resource.ownerId !== userId) {
        throw new ExpectedError('You do not have permission to access this resource', 'error', 403);
    }
}

/**
 * Check if user is authenticated (for controller use)
 */
export function requireAuthenticatedUser(userId?: number): asserts userId is number {
    if (!userId) {
        throw new ExpectedError('Authentication required', 'error', 401);
    }
}

export function requireAdminUser(session: Request['session'] | undefined | null): void {
    if (!isAdminSession(session)) {
        throw new ExpectedError('Administrator permissions are required.', 'error', 403);
    }
}
