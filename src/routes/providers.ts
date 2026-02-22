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

/**
 * POST /providers/:providerKey/sync
 * Trigger sync from listing URL for any provider.
 */
router.post('/:providerKey/sync', requireAuth, validateProviderSync, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    const userId = String(req.session.user!.id);
    const {providerKey} = req.params;
    const {listingUrl} = req.body;
    const result = await providerController.syncProvider(userId, providerKey, listingUrl);

    if (result.restaurants.some(r => !r.success)) {
        const errors = result.restaurants.filter(r => !r.success).map(r => r.error).join('; ');
        req.flash('error', `Synced ${result.restaurantsSynced} restaurants. Errors: ${errors}`);
    } else {
        req.flash('success', `Successfully synced ${result.restaurantsSynced} restaurants.`);
    }

    res.redirect('/providers');
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

    if (result.restaurantsSynced > 0) {
        req.flash('success', `Successfully imported ${result.restaurantsSynced} restaurant(s).`);
    } else {
        req.flash('info', 'Import completed but no restaurants were found at the given URL.');
    }

    res.redirect('/providers');
}));

export default router;
