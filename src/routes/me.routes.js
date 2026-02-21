import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePersona } from '../middleware/persona.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as meController from '../controllers/me.controller.js';
import {
  getMyApplicationsQuerySchema,
  getMyNotificationsQuerySchema,
} from '../schemas/me.schemas.js';

export const meRouter = Router();

meRouter.get('/', requireAuth, meController.getMe);

meRouter.get(
  '/applications',
  requireAuth,
  requirePersona('developer'),
  validate(getMyApplicationsQuerySchema, 'query'),
  meController.getMyApplications
);

meRouter.get(
  '/notifications',
  requireAuth,
  validate(getMyNotificationsQuerySchema, 'query'),
  meController.getMyNotifications
);

meRouter.post('/notifications/:id/read', requireAuth, meController.markNotificationAsRead);
