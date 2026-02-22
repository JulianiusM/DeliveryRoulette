import express, {Request, Response} from 'express';
import {requireAuth} from '../middleware/authMiddleware';
import * as lieferandoController from '../controller/lieferandoController';
import renderer from '../modules/renderer';
import {asyncHandler} from '../modules/lib/asyncHandler';

const router = express.Router();

/**
 * GET /providers/lieferando
 * Settings page for Lieferando provider configuration.
 */
router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = String(req.session.user!.id);
    const data = await lieferandoController.getSettingsPageData(userId);
    renderer.renderWithData(res, 'providers/lieferando', data);
}));

/**
 * POST /providers/lieferando/sync
 * Trigger sync from configured listing URL.
 */
router.post('/sync', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = String(req.session.user!.id);
    const {listingUrl} = req.body;
    const result = await lieferandoController.syncListing(userId, listingUrl);

    if (result.errors.length > 0) {
        req.flash('error', `Synced ${result.imported}/${result.discovered} restaurants. Errors: ${result.errors.join('; ')}`);
    } else {
        req.flash('success', `Successfully synced ${result.imported} restaurants from Lieferando.`);
    }

    res.redirect('/providers/lieferando');
}));

/**
 * POST /providers/lieferando/import-url
 * Import a single restaurant from a pasted menu URL.
 */
router.post('/import-url', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = String(req.session.user!.id);
    const {menuUrl} = req.body;
    const result = await lieferandoController.importUrl(userId, menuUrl);

    if (result.warning) {
        req.flash('info', `Imported "${result.name}". ${result.warning}`);
    } else {
        req.flash('success', `Successfully imported "${result.name}" with menu.`);
    }

    res.redirect('/providers/lieferando');
}));

export default router;
