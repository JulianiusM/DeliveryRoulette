import express from 'express';
import {requireAuth} from '../middleware/authMiddleware';
import * as syncController from '../controller/syncController';
import {SyncJobStatus} from '../modules/database/entities/sync/SyncJob';

const router = express.Router();

/**
 * POST /api/sync
 * Trigger a provider sync run.
 * Accepts optional JSON body `{ providerKey: "uber_eats" }`.
 * When providerKey is omitted, all registered connectors are synced.
 */
router.post('/', requireAuth, async (req, res, next) => {
    try {
        const {providerKey} = req.body ?? {};
        const result = await syncController.triggerSync(providerKey);
        res.status(202).json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/sync/jobs
 * List recent sync jobs for status polling.
 */
router.get('/jobs', requireAuth, async (req, res, next) => {
    try {
        const providerKey = typeof req.query.providerKey === 'string' ? req.query.providerKey : undefined;
        const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
        const validStatuses: Array<SyncJobStatus | 'all'> = ['all', 'pending', 'in_progress', 'completed', 'failed'];
        const status = statusRaw && validStatuses.includes(statusRaw as SyncJobStatus | 'all')
            ? statusRaw as SyncJobStatus | 'all'
            : undefined;
        const limitRaw = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw!)) : undefined;
        const jobs = await syncController.getSyncJobs({
            providerKey,
            status,
            limit,
        });
        res.json({jobs});
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/sync/jobs/:id
 * Get one sync job by ID.
 */
router.get('/jobs/:id', requireAuth, async (req, res, next) => {
    try {
        const job = await syncController.getSyncJob(req.params.id);
        res.json({job});
    } catch (err) {
        next(err);
    }
});

export default router;
