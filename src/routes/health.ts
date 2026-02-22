import express, {Request, Response} from 'express';
import {AppDataSource} from '../modules/database/dataSource';
import {version} from '../../package.json';

const router = express.Router();

/**
 * GET /health
 * Returns application health status including DB connectivity and app version.
 * No secrets or sensitive data are exposed.
 */
router.get('/', async (_req: Request, res: Response) => {
    let dbStatus = 'ok';
    try {
        await AppDataSource.query('SELECT 1');
    } catch {
        dbStatus = 'unavailable';
    }

    const status = dbStatus === 'ok' ? 'healthy' : 'degraded';
    const httpStatus = dbStatus === 'ok' ? 200 : 503;

    res.status(httpStatus).json({
        status,
        version,
        uptime: Math.floor(process.uptime()),
        db: dbStatus,
    });
});

export default router;
