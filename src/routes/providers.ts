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
    const locationId = typeof req.query.locationId === 'string' ? req.query.locationId : '';
    const data = await providerController.getProvidersPageData(userId, locationId);
    renderer.renderWithData(res, 'providers/index', data);
}));

/**
 * POST /providers/:providerKey/sync
 * Trigger sync from listing URL for any provider.
 */
router.post('/:providerKey/sync', requireAuth, validateProviderSync, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    const userId = String(req.session.user!.id);
    const {providerKey} = req.params;
    const {listingUrl, locationId} = req.body;
    const result = await providerController.syncProvider(userId, providerKey, listingUrl, locationId);
    req.flash('info', `Location import queued (${result.jobId}). Restaurants and availability will refresh in the background for the selected saved location.`);

    res.redirect(buildProvidersRedirectPath(locationId));
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
    req.flash('info', `Restaurant import queued (${result.jobId}). The restaurant and menu will refresh in the background.`);

    res.redirect('/providers');
}));

function buildProvidersRedirectPath(locationId?: string): string {
    const normalizedLocationId = typeof locationId === 'string' ? locationId.trim() : '';
    return normalizedLocationId
        ? `/providers?locationId=${encodeURIComponent(normalizedLocationId)}`
        : '/providers';
}

export default router;
