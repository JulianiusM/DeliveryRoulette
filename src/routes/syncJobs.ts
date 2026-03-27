import express, {Request, Response} from 'express';
import {requireAdmin} from '../middleware/authMiddleware';
import * as syncJobController from '../controller/syncJobController';
import renderer from '../modules/renderer';
import {asyncHandler} from '../modules/lib/asyncHandler';

const router = express.Router();

// GET /sync/jobs - Show queued/running/completed sync jobs
router.get('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
    const data = await syncJobController.getSyncJobsPageData({status, provider});
    renderer.renderWithData(res, 'sync/jobs', data);
}));

export default router;
