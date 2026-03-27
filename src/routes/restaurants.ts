import express, {Request, Response} from 'express';

import * as restaurantController from "../controller/restaurantController";
import * as menuController from "../controller/menuController";
import renderer from "../modules/renderer";
import {asyncHandler} from '../modules/lib/asyncHandler';
import {getSessionUserId} from '../modules/lib/util';
import {requireAdmin} from '../middleware/authMiddleware';
import {handleValidationError} from '../middleware/validationErrorHandler';
import {
    validateRestaurant, validateProviderRef, validateDietOverride,
    validateMenuCategory, validateMenuItem,
} from '../middleware/validationChains';

const app = express.Router();

// GET /restaurants - List restaurants with overview filters
app.get('/', asyncHandler(async (req: Request, res: Response) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const activeFilter = typeof req.query.active === 'string' ? req.query.active : undefined;
    const favoriteFilter = typeof req.query.favorite === 'string' ? req.query.favorite : undefined;
    const suggestionFilter = typeof req.query.suggestion === 'string' ? req.query.suggestion : undefined;
    const openFilter = typeof req.query.open === 'string' ? req.query.open : undefined;
    const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
    const selectedDietTagIds = Array.isArray(req.query.dietTagIds)
        ? req.query.dietTagIds.filter((value): value is string => typeof value === 'string')
        : typeof req.query.dietTagIds === 'string'
            ? [req.query.dietTagIds]
            : [];
    const userId = getSessionUserId(req.session);
    const data = await restaurantController.listRestaurants({
        search,
        activeFilter,
        favoriteFilter,
        suggestionFilter,
        openFilter,
        selectedDietTagIds,
        sort,
        userId,
    });
    renderer.renderWithData(res, 'restaurants/index', data);
}));

// GET /restaurants/new - Show create form
app.get('/new', requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
    renderer.renderWithData(res, 'restaurants/form', {editing: false});
}));

// POST /restaurants/new - Create restaurant
app.post('/new', requireAdmin, validateRestaurant, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantController.createRestaurant(req.body);
    res.redirect(`/restaurants/${restaurant.id}`);
}));

// GET /restaurants/:id - Show detail page
app.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = getSessionUserId(req.session);
    const data = await restaurantController.getRestaurantDetail(req.params.id, userId);
    renderer.renderWithData(res, 'restaurants/detail', data);
}));

// GET /restaurants/:id/edit - Show edit form
app.get('/:id/edit', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const data = await restaurantController.getRestaurantEditData(req.params.id);
    renderer.renderWithData(res, 'restaurants/form', data);
}));

// POST /restaurants/:id/edit - Update restaurant
app.post('/:id/edit', requireAdmin, validateRestaurant, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantController.updateRestaurant(req.params.id, req.body);
    res.redirect(`/restaurants/${restaurant.id}`);
}));

// ── Provider Reference routes ───────────────────────────────

// POST /restaurants/:id/providers - Add provider reference
app.post('/:id/providers', requireAdmin, validateProviderRef, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    await restaurantController.addProviderRef(req.params.id, req.body);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// POST /restaurants/:id/providers/:refId/delete - Remove provider reference
app.post('/:id/providers/:refId/delete', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    await restaurantController.removeProviderRef(req.params.id, req.params.refId);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// POST /restaurants/:id/providers/:refId/sync-menu - Queue menu-only sync for this provider ref
app.post('/:id/providers/:refId/sync-menu', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const result = await restaurantController.queueProviderRefMenuSync(req.params.id, req.params.refId);
    req.flash('info', `Menu sync queued (${result.jobId}). The restaurant menu will refresh in the background.`);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// POST /restaurants/:id/diet/recompute - Run diet heuristics immediately
app.post('/:id/diet/recompute', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const count = await restaurantController.runDietInference(req.params.id);
    req.flash('info', `Diet analysis rerun completed (${count} tag results updated).`);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// ── Diet Override routes ────────────────────────────────────

// POST /restaurants/:id/diet-overrides - Add/update diet override
app.post('/:id/diet-overrides', requireAdmin, validateDietOverride, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    const userId = getSessionUserId(req.session) ?? 0;
    await restaurantController.addDietOverride(req.params.id, req.body, userId);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// POST /restaurants/:id/diet-overrides/:overrideId/delete - Remove diet override
app.post('/:id/diet-overrides/:overrideId/delete', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    await restaurantController.removeDietOverride(req.params.id, req.params.overrideId);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// ── User Restaurant Preference routes ───────────────────────

// POST /restaurants/:id/toggle-favorite - Toggle favorite flag
app.post('/:id/toggle-favorite', asyncHandler(async (req: Request, res: Response) => {
    const userId = getSessionUserId(req.session);
    if (!userId) {
        req.flash('info', 'Log in to save favorite restaurants.');
        res.redirect(`/restaurants/${req.params.id}`);
        return;
    }
    const preference = await restaurantController.toggleFavorite(req.params.id, userId);
    req.flash('success', preference.isFavorite ? 'Restaurant added to favorites.' : 'Restaurant removed from favorites.');
    res.redirect(`/restaurants/${req.params.id}`);
}));

// POST /restaurants/:id/toggle-do-not-suggest - Toggle do-not-suggest flag
app.post('/:id/toggle-do-not-suggest', asyncHandler(async (req: Request, res: Response) => {
    const userId = getSessionUserId(req.session);
    if (!userId) {
        req.flash('info', 'Log in to save restaurant suggestion preferences.');
        res.redirect(`/restaurants/${req.params.id}`);
        return;
    }
    const preference = await restaurantController.toggleDoNotSuggest(req.params.id, userId);
    req.flash('success', preference.doNotSuggest ? 'Restaurant blocked from suggestions.' : 'Restaurant allowed in suggestions again.');
    res.redirect(`/restaurants/${req.params.id}`);
}));

// ── Menu Category routes ────────────────────────────────────

// GET /restaurants/:id/menu/categories/new
app.get('/:id/menu/categories/new', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const data = await menuController.getCategoryFormData(req.params.id);
    renderer.renderWithData(res, 'restaurants/menu/categoryForm', data);
}));

// POST /restaurants/:id/menu/categories/new
app.post('/:id/menu/categories/new', requireAdmin, validateMenuCategory, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    await menuController.createCategory(req.params.id, req.body);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// GET /restaurants/:id/menu/categories/:catId/edit
app.get('/:id/menu/categories/:catId/edit', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const data = await menuController.getCategoryEditData(req.params.id, req.params.catId);
    renderer.renderWithData(res, 'restaurants/menu/categoryForm', data);
}));

// POST /restaurants/:id/menu/categories/:catId/edit
app.post('/:id/menu/categories/:catId/edit', requireAdmin, validateMenuCategory, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    await menuController.updateCategory(req.params.id, req.params.catId, req.body);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// ── Menu Item routes ────────────────────────────────────────

// GET /restaurants/:id/menu/categories/:catId/items/new
app.get('/:id/menu/categories/:catId/items/new', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const data = await menuController.getItemFormData(req.params.id, req.params.catId);
    renderer.renderWithData(res, 'restaurants/menu/itemForm', data);
}));

// POST /restaurants/:id/menu/categories/:catId/items/new
app.post('/:id/menu/categories/:catId/items/new', requireAdmin, validateMenuItem, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    await menuController.createItem(req.params.id, req.params.catId, req.body);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// GET /restaurants/:id/menu/items/:itemId/edit
app.get('/:id/menu/items/:itemId/edit', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const data = await menuController.getItemEditData(req.params.id, req.params.itemId);
    renderer.renderWithData(res, 'restaurants/menu/itemForm', data);
}));

// POST /restaurants/:id/menu/items/:itemId/edit
app.post('/:id/menu/items/:itemId/edit', requireAdmin, validateMenuItem, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    await menuController.updateItem(req.params.id, req.params.itemId, req.body);
    res.redirect(`/restaurants/${req.params.id}`);
}));

export default app;
