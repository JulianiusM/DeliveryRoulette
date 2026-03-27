import express, {Request, Response} from 'express';
import {requireAdmin} from '../middleware/authMiddleware';
import * as providerController from '../controller/providerController';
import renderer from '../modules/renderer';
import {asyncHandler} from '../modules/lib/asyncHandler';

const router = express.Router();

router.get('/operations', requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
    renderer.renderWithData(res, 'admin/operations', {
        maintenance: providerController.getProviderMaintenanceInfo(),
    });
}));

router.post('/maintenance/heuristics', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const result = providerController.triggerHeuristicRefresh();
    if (result.started) {
        req.flash('info', 'Heuristic refresh started in the background for all restaurants.');
    } else {
        req.flash('info', 'A heuristic refresh is already running.');
    }

    res.redirect('/admin/operations');
}));

router.post('/maintenance/reimport', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const result = await providerController.triggerProviderRefresh();
    req.flash('info', `Provider refresh job queued (${result.jobId}).`);
    res.redirect('/admin/operations');
}));

export default router;
