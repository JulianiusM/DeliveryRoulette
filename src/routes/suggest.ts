import express, {Request, Response} from 'express';

import * as suggestionController from "../controller/suggestionController";
import renderer from "../modules/renderer";
import {asyncHandler} from '../modules/lib/asyncHandler';
import {getSessionUserId} from '../modules/lib/util';

const app = express.Router();

// GET /suggest - Show suggestion wizard page
app.get('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = getSessionUserId(req.session);
    const data = await suggestionController.getSuggestionFormData(userId);
    renderer.renderWithData(res, 'suggest/index', data);
}));

// POST /suggest - JSON API: returns a random matching restaurant
app.post('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = getSessionUserId(req.session);
    const result = await suggestionController.processSuggestion(req.body, userId);
    res.json(result);
}));

export default app;
