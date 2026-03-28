import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

export const adminRouter = Router();

adminRouter.get('/email-outbox', requireAuth, requireAdmin, adminController.getEmailOutboxOverview);
