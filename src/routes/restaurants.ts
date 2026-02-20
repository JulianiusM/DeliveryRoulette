import express, {Request, Response} from 'express';

import * as restaurantController from "../controller/restaurantController";
import * as menuController from "../controller/menuController";
import * as restaurantService from "../modules/database/services/RestaurantService";
import * as menuService from "../modules/database/services/MenuService";
import renderer from "../modules/renderer";
import {asyncHandler} from '../modules/lib/asyncHandler';
import {ExpectedError} from "../modules/lib/errors";

const app = express.Router();

// GET /restaurants - List restaurants with search and active filter
app.get('/', asyncHandler(async (req: Request, res: Response) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const activeFilter = req.query.active;

    let isActive: boolean | undefined;
    if (activeFilter === 'true') isActive = true;
    else if (activeFilter === 'false') isActive = false;

    const restaurants = await restaurantService.listRestaurants({search, isActive});
    renderer.renderWithData(res, 'restaurants/index', {restaurants, search, active: activeFilter});
}));

// GET /restaurants/new - Show create form
app.get('/new', asyncHandler(async (req: Request, res: Response) => {
    renderer.renderWithData(res, 'restaurants/form', {editing: false});
}));

// POST /restaurants/new - Create restaurant
app.post('/new', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantController.createRestaurant(req.body);
    res.redirect(`/restaurants/${restaurant.id}`);
}));

// GET /restaurants/:id - Show detail page
app.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantService.getRestaurantById(req.params.id as string);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    const categories = await menuService.listCategoriesByRestaurant(restaurant.id);
    renderer.renderWithData(res, 'restaurants/detail', {restaurant, categories});
}));

// GET /restaurants/:id/edit - Show edit form
app.get('/:id/edit', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantService.getRestaurantById(req.params.id as string);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    renderer.renderWithData(res, 'restaurants/form', {
        editing: true,
        id: restaurant.id,
        name: restaurant.name,
        addressLine1: restaurant.addressLine1,
        addressLine2: restaurant.addressLine2,
        city: restaurant.city,
        postalCode: restaurant.postalCode,
        country: restaurant.country,
        isActive: restaurant.isActive,
    });
}));

// POST /restaurants/:id/edit - Update restaurant
app.post('/:id/edit', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantController.updateRestaurant(req.params.id as string, req.body);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    res.redirect(`/restaurants/${restaurant.id}`);
}));

// ── Menu Category routes ────────────────────────────────────

// GET /restaurants/:id/menu/categories/new
app.get('/:id/menu/categories/new', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantService.getRestaurantById(req.params.id as string);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    renderer.renderWithData(res, 'restaurants/menu/categoryForm', {editing: false, restaurantId: restaurant.id});
}));

// POST /restaurants/:id/menu/categories/new
app.post('/:id/menu/categories/new', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantService.getRestaurantById(req.params.id as string);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    await menuController.createCategory(restaurant.id, req.body);
    res.redirect(`/restaurants/${restaurant.id}`);
}));

// GET /restaurants/:id/menu/categories/:catId/edit
app.get('/:id/menu/categories/:catId/edit', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantService.getRestaurantById(req.params.id as string);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    const category = await menuService.getCategoryById(req.params.catId as string);
    if (!category) {
        throw new ExpectedError('Category not found', 'error', 404);
    }
    renderer.renderWithData(res, 'restaurants/menu/categoryForm', {
        editing: true,
        restaurantId: restaurant.id,
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
    });
}));

// POST /restaurants/:id/menu/categories/:catId/edit
app.post('/:id/menu/categories/:catId/edit', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantService.getRestaurantById(req.params.id as string);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    const category = await menuController.updateCategory(req.params.catId as string, req.body);
    if (!category) {
        throw new ExpectedError('Category not found', 'error', 404);
    }
    res.redirect(`/restaurants/${restaurant.id}`);
}));

// ── Menu Item routes ────────────────────────────────────────

// GET /restaurants/:id/menu/categories/:catId/items/new
app.get('/:id/menu/categories/:catId/items/new', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantService.getRestaurantById(req.params.id as string);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    const category = await menuService.getCategoryById(req.params.catId as string);
    if (!category) {
        throw new ExpectedError('Category not found', 'error', 404);
    }
    renderer.renderWithData(res, 'restaurants/menu/itemForm', {
        editing: false,
        restaurantId: restaurant.id,
        categoryId: category.id,
    });
}));

// POST /restaurants/:id/menu/categories/:catId/items/new
app.post('/:id/menu/categories/:catId/items/new', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantService.getRestaurantById(req.params.id as string);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    const category = await menuService.getCategoryById(req.params.catId as string);
    if (!category) {
        throw new ExpectedError('Category not found', 'error', 404);
    }
    await menuController.createItem(category.id, req.body);
    res.redirect(`/restaurants/${restaurant.id}`);
}));

// GET /restaurants/:id/menu/items/:itemId/edit
app.get('/:id/menu/items/:itemId/edit', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantService.getRestaurantById(req.params.id as string);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    const item = await menuService.getItemById(req.params.itemId as string);
    if (!item) {
        throw new ExpectedError('Item not found', 'error', 404);
    }
    renderer.renderWithData(res, 'restaurants/menu/itemForm', {
        editing: true,
        restaurantId: restaurant.id,
        categoryId: item.categoryId,
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        currency: item.currency,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
    });
}));

// POST /restaurants/:id/menu/items/:itemId/edit
app.post('/:id/menu/items/:itemId/edit', asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantService.getRestaurantById(req.params.id as string);
    if (!restaurant) {
        throw new ExpectedError('Restaurant not found', 'error', 404);
    }
    const item = await menuController.updateItem(req.params.itemId as string, req.body);
    if (!item) {
        throw new ExpectedError('Item not found', 'error', 404);
    }
    res.redirect(`/restaurants/${restaurant.id}`);
}));

export default app;
