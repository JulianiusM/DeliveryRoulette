import type {Request} from 'express';

/**
 * Persist the current session state before continuing the response cycle.
 *
 * Express-session writes changes asynchronously via the configured store.
 * When a handler mutates the session (for example after logging in or out)
 * and immediately redirects, the follow-up request can occasionally arrive
 * before the store has finished writing.  By explicitly awaiting `save()` we
 * make sure the session data has been committed and is visible to the next
 * HTTP request.
 */
export function persistSession(session: Request['session']): Promise<void> {
    return new Promise((resolve, reject) => {
        const save = session.save?.bind(session);
        if (!save) {
            resolve();
            return;
        }

        save((err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

export function regenerateSession(session: Request['session']): Promise<void> {
    return new Promise((resolve, reject) => {
        const regenerate = session.regenerate?.bind(session);
        if (!regenerate) {
            resolve();
            return;
        }

        regenerate((err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

export function destroySession(session: Request['session']): Promise<void> {
    return new Promise((resolve, reject) => {
        const destroy = session.destroy?.bind(session);
        if (!destroy) {
            resolve();
            return;
        }

        destroy((err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

