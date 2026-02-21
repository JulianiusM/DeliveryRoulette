import express, {Request, Response} from 'express';

import * as suggestionController from "../controller/suggestionController";
import renderer from "../modules/renderer";
import {asyncHandler} from '../modules/lib/asyncHandler';
import {APIError} from '../modules/lib/errors';

const app = express.Router();

// GET /suggest - Show suggestion dashboard page
app.get('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    const data = await suggestionController.getSuggestionFormData(userId);
    renderer.renderWithData(res, 'suggest/index', data);
}));

// POST /suggest - Process suggestion and render SSR result page
app.post('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    try {
        const data = await suggestionController.processSuggestion(req.body, userId);
        renderer.renderWithData(res, 'suggest/result', data);
    } catch (err) {
        // On no-match, re-render dashboard with error message
        if (err instanceof APIError) {
            const formData = await suggestionController.getSuggestionFormData(userId);
            renderer.renderWithErrorData(res, 'suggest/index', err.message, formData);
            return;
        }
        throw err;
    }
}));

export default app;
