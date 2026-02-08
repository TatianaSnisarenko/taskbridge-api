import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as meController from '../controllers/me.controller.js';

export const meRouter = Router();

meRouter.get('/', requireAuth, meController.getMe);
