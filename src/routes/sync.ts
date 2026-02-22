import express from 'express';
import {requireAuth} from '../middleware/authMiddleware';
import * as syncController from '../controller/syncController';

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
        res.json(result);
    } catch (err) {
        next(err);
    }
});

export default router;
