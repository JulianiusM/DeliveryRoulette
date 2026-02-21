import express, {Request, Response} from 'express';

import * as suggestionController from "../controller/suggestionController";
import renderer from "../modules/renderer";
import {asyncHandler} from '../modules/lib/asyncHandler';

const app = express.Router();

// GET /suggest - Show suggestion wizard page
app.get('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    const data = await suggestionController.getSuggestionFormData(userId);
    renderer.renderWithData(res, 'suggest/index', data);
}));

// POST /suggest - JSON API: returns a random matching restaurant
app.post('/', asyncHandler(async (req: Request, res: Response) => {
    const result = await suggestionController.processSuggestion(req.body);
    res.json(result);
}));

export default app;
