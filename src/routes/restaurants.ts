import express, {Request, Response} from 'express';

import * as restaurantController from "../controller/restaurantController";
import * as menuController from "../controller/menuController";
import renderer from "../modules/renderer";
import {asyncHandler} from '../modules/lib/asyncHandler';

const app = express.Router();

// GET /restaurants - List restaurants with search and active filter
app.get('/', asyncHandler(async (req: Request, res: Response) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const activeFilter = typeof req.query.active === 'string' ? req.query.active : undefined;
    const data = await restaurantController.listRestaurants({search, activeFilter});
    renderer.renderWithData(res, 'restaurants/index', data);
}));

// GET /restaurants/new - Show create form
app.get('/new', asyncHandler(async (_req: Request, res: Response) => {
    renderer.renderWithData(res, 'restaurants/form', {editing: false});
}));

// POST /restaurants/new - Create restaurant
app.post('/new', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantController.createRestaurant(req.body);
    res.redirect(`/restaurants/${restaurant.id}`);
}));

// GET /restaurants/:id - Show detail page
app.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const data = await restaurantController.getRestaurantDetail(req.params.id);
    renderer.renderWithData(res, 'restaurants/detail', data);
}));

// GET /restaurants/:id/edit - Show edit form
app.get('/:id/edit', asyncHandler(async (req: Request, res: Response) => {
    const data = await restaurantController.getRestaurantEditData(req.params.id);
    renderer.renderWithData(res, 'restaurants/form', data);
}));

// POST /restaurants/:id/edit - Update restaurant
app.post('/:id/edit', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantController.updateRestaurant(req.params.id, req.body);
    res.redirect(`/restaurants/${restaurant.id}`);
}));

// ── Provider Reference routes ───────────────────────────────

// POST /restaurants/:id/providers - Add provider reference
app.post('/:id/providers', asyncHandler(async (req: Request, res: Response) => {
    await restaurantController.addProviderRef(req.params.id, req.body);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// POST /restaurants/:id/providers/:refId/delete - Remove provider reference
app.post('/:id/providers/:refId/delete', asyncHandler(async (req: Request, res: Response) => {
    await restaurantController.removeProviderRef(req.params.id, req.params.refId);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// ── Diet Override routes ────────────────────────────────────

// POST /restaurants/:id/diet-overrides - Add/update diet override
app.post('/:id/diet-overrides', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId ?? 0;
    await restaurantController.addDietOverride(req.params.id, req.body, userId);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// POST /restaurants/:id/diet-overrides/:overrideId/delete - Remove diet override
app.post('/:id/diet-overrides/:overrideId/delete', asyncHandler(async (req: Request, res: Response) => {
    await restaurantController.removeDietOverride(req.params.id, req.params.overrideId);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// ── Menu Category routes ────────────────────────────────────

// GET /restaurants/:id/menu/categories/new
app.get('/:id/menu/categories/new', asyncHandler(async (req: Request, res: Response) => {
    const data = await menuController.getCategoryFormData(req.params.id);
    renderer.renderWithData(res, 'restaurants/menu/categoryForm', data);
}));

// POST /restaurants/:id/menu/categories/new
app.post('/:id/menu/categories/new', asyncHandler(async (req: Request, res: Response) => {
    await menuController.createCategory(req.params.id, req.body);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// GET /restaurants/:id/menu/categories/:catId/edit
app.get('/:id/menu/categories/:catId/edit', asyncHandler(async (req: Request, res: Response) => {
    const data = await menuController.getCategoryEditData(req.params.id, req.params.catId);
    renderer.renderWithData(res, 'restaurants/menu/categoryForm', data);
}));

// POST /restaurants/:id/menu/categories/:catId/edit
app.post('/:id/menu/categories/:catId/edit', asyncHandler(async (req: Request, res: Response) => {
    await menuController.updateCategory(req.params.id, req.params.catId, req.body);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// ── Menu Item routes ────────────────────────────────────────

// GET /restaurants/:id/menu/categories/:catId/items/new
app.get('/:id/menu/categories/:catId/items/new', asyncHandler(async (req: Request, res: Response) => {
    const data = await menuController.getItemFormData(req.params.id, req.params.catId);
    renderer.renderWithData(res, 'restaurants/menu/itemForm', data);
}));

// POST /restaurants/:id/menu/categories/:catId/items/new
app.post('/:id/menu/categories/:catId/items/new', asyncHandler(async (req: Request, res: Response) => {
    await menuController.createItem(req.params.id, req.params.catId, req.body);
    res.redirect(`/restaurants/${req.params.id}`);
}));

// GET /restaurants/:id/menu/items/:itemId/edit
app.get('/:id/menu/items/:itemId/edit', asyncHandler(async (req: Request, res: Response) => {
    const data = await menuController.getItemEditData(req.params.id, req.params.itemId);
    renderer.renderWithData(res, 'restaurants/menu/itemForm', data);
}));

// POST /restaurants/:id/menu/items/:itemId/edit
app.post('/:id/menu/items/:itemId/edit', asyncHandler(async (req: Request, res: Response) => {
    await menuController.updateItem(req.params.id, req.params.itemId, req.body);
    res.redirect(`/restaurants/${req.params.id}`);
}));

export default app;
