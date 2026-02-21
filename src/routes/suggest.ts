import express, {Request, Response} from 'express';

import * as suggestionController from "../controller/suggestionController";
import renderer from "../modules/renderer";
import {asyncHandler} from '../modules/lib/asyncHandler';

const app = express.Router();

// GET /suggest - Show suggestion form
app.get('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    const data = await suggestionController.getSuggestionFormData(userId);
    renderer.renderWithData(res, 'suggest/form', data);
}));

// POST /suggest - Process suggestion and redirect to result
app.post('/', asyncHandler(async (req: Request, res: Response) => {
    const result = await suggestionController.processSuggestion(req.body);
    (req.session as any).suggestionResult = result;
    res.redirect('/suggest/result');
}));

// GET /suggest/result - Show suggestion result
app.get('/result', asyncHandler(async (req: Request, res: Response) => {
    const result = (req.session as any)?.suggestionResult;
    if (!result) {
        res.redirect('/suggest');
        return;
    }
    // Clear from session after displaying
    delete (req.session as any).suggestionResult;
    renderer.renderWithData(res, 'suggest/result', result);
}));

export default app;
