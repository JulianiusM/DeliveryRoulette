import express, {Request, Response} from 'express';
import {requireAuth} from '../middleware/authMiddleware';
import * as syncAlertController from '../controller/syncAlertController';
import renderer from '../modules/renderer';
import {asyncHandler} from '../modules/lib/asyncHandler';

const router = express.Router();

// GET /sync/alerts - List sync alerts with filters
router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const data = await syncAlertController.getAlertsPageData({type, provider, status});
    renderer.renderWithData(res, 'sync/alerts', data);
}));

// POST /sync/alerts/:id/dismiss - Dismiss a single alert
router.post('/:id/dismiss', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    await syncAlertController.dismissOne(req.params.id);
    // Redirect back to the alerts page preserving current filters
    const referer = req.get('referer');
    res.redirect(referer || '/sync/alerts');
}));

// POST /sync/alerts/dismiss-all - Dismiss all active alerts matching current filter
router.post('/dismiss-all', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const {type, provider} = req.body;
    await syncAlertController.dismissFiltered({type, provider});
    // Build redirect URL preserving filters
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (provider) params.set('provider', provider);
    params.set('status', 'active');
    res.redirect(`/sync/alerts?${params.toString()}`);
}));

export default router;
