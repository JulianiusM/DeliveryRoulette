import express, {Request, Response} from 'express';
import {requireAuth} from '../middleware/authMiddleware';
import * as providerController from '../controller/providerController';
import renderer from '../modules/renderer';
import {asyncHandler} from '../modules/lib/asyncHandler';
import {handleValidationError} from '../middleware/validationErrorHandler';
import {validateProviderSync, validateProviderImportUrl} from '../middleware/validationChains';

const router = express.Router();

/**
 * GET /providers
 * Generic settings page for all provider connectors.
 * Dynamically renders fields/actions based on connector capabilities.
 */
router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = String(req.session.user!.id);
    const data = await providerController.getProvidersPageData(userId);
    renderer.renderWithData(res, 'providers/index', data);
}));

router.post('/maintenance/heuristics', requireAuth, asyncHandler(async (_req: Request, res: Response) => {
    const result = providerController.triggerHeuristicRefresh();
    if (result.started) {
        _req.flash('info', 'Heuristic refresh started in the background for all restaurants.');
    } else {
        _req.flash('info', 'A heuristic refresh is already running.');
    }

    res.redirect('/providers');
}));

router.post('/maintenance/reimport', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const result = await providerController.triggerProviderRefresh();
    req.flash('info', `Provider refresh job queued (${result.jobId}). Track progress on Sync Jobs.`);
    res.redirect('/sync/jobs');
}));

/**
 * POST /providers/:providerKey/sync
 * Trigger sync from listing URL for any provider.
 */
router.post('/:providerKey/sync', requireAuth, validateProviderSync, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    const userId = String(req.session.user!.id);
    const {providerKey} = req.params;
    const {listingUrl} = req.body;
    const result = await providerController.syncProvider(userId, providerKey, listingUrl);
    req.flash('info', `Sync job queued (${result.jobId}). Track progress on Sync Jobs.`);

    res.redirect('/sync/jobs');
}));

/**
 * POST /providers/:providerKey/import-url
 * Import a single restaurant from a pasted menu URL for any provider.
 */
router.post('/:providerKey/import-url', requireAuth, validateProviderImportUrl, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    const userId = String(req.session.user!.id);
    const {providerKey} = req.params;
    const {menuUrl} = req.body;
    const result = await providerController.importFromUrl(userId, providerKey, menuUrl);
    req.flash('info', `Import job queued (${result.jobId}). Track progress on Sync Jobs.`);

    res.redirect('/sync/jobs');
}));

export default router;
