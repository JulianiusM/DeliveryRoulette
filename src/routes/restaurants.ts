import express, {Request, Response} from 'express';

import * as restaurantController from "../controller/restaurantController";
import * as restaurantService from "../modules/database/services/RestaurantService";
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
    renderer.renderWithData(res, 'restaurants/detail', {restaurant});
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

export default app;
