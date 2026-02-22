import {NextFunction, Request, Response} from 'express';
import {v4 as uuidv4} from 'uuid';
import logger from '../modules/logger';

/**
 * Middleware that assigns a unique request ID to each incoming request.
 * If the client sends an X-Request-Id header, it is reused; otherwise a new UUID is generated.
 * The ID is attached to the request object and set as a response header.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    (req as any).id = requestId;
    res.setHeader('X-Request-Id', requestId);
    (req as any).log = logger.child({requestId});
    next();
}
