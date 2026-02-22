import express, {Request, Response} from 'express';
import multer from 'multer';

import * as importController from '../controller/importController';
import renderer from '../modules/renderer';
import {asyncHandler} from '../modules/lib/asyncHandler';

const app = express.Router();

// Multer configured for in-memory storage (no disk writes)
const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: 25 * 1024 * 1024}});

// GET /import – Upload page
app.get('/', (_req: Request, res: Response) => {
    const data = importController.getUploadPageData();
    renderer.renderWithData(res, 'import/upload', data);
});

// POST /import/upload – Process uploaded JSON file
app.post('/upload', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
        renderer.renderWithError(res, 'import/upload', 'Please select a JSON file to upload.');
        return;
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const {diff, payloadJson} = await importController.handleUpload(fileContent);
    const data = importController.getPreviewData(diff, payloadJson);
    renderer.renderWithData(res, 'import/preview', data);
}));

// POST /import/apply – Apply the import
app.post('/apply', asyncHandler(async (req: Request, res: Response) => {
    const {payloadJson} = req.body;
    const {result} = await importController.handleApply(payloadJson);
    const data = importController.getResultData(result);
    renderer.renderWithData(res, 'import/result', data);
}));

export default app;
