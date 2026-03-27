import express, {Request, Response} from 'express';
import multer from 'multer';

import * as importController from '../controller/importController';
import renderer from '../modules/renderer';
import {asyncHandler} from '../modules/lib/asyncHandler';
import settings from '../modules/settings';
import {requireAdmin} from '../middleware/authMiddleware';
import {handleValidationError} from '../middleware/validationErrorHandler';
import {validateImportApply} from '../middleware/validationChains';

const app = express.Router();

// Multer configured for in-memory storage (no disk writes)
const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: settings.value.importMaxFileSizeBytes}});

// GET /import – Upload page
app.get('/', requireAdmin, (_req: Request, res: Response) => {
    const data = importController.getUploadPageData();
    renderer.renderWithData(res, 'import/upload', data);
});

// POST /import/upload – Process uploaded JSON or CSV file
app.post('/upload', requireAdmin, upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
    const data = await importController.handleUpload(req.file?.buffer, req.file?.originalname);
    renderer.renderWithData(res, 'import/preview', data);
}));

// POST /import/apply – Apply the import
app.post('/apply', requireAdmin, validateImportApply, handleValidationError, asyncHandler(async (req: Request, res: Response) => {
    const data = await importController.handleApply(req.body.payloadJson);
    renderer.renderWithData(res, 'import/result', data);
}));

export default app;
