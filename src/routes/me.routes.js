import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePersona } from '../middleware/persona.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as meController from '../controllers/me.controller.js';
import {
  getMyApplicationsQuerySchema,
  getMyNotificationsQuerySchema,
  getMyThreadsQuerySchema,
  threadIdParamSchema,
  threadMessagesQuerySchema,
  createMessageBodySchema,
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

meRouter.post('/notifications/read-all', requireAuth, meController.markAllNotificationsAsRead);

meRouter.post('/notifications/:id/read', requireAuth, meController.markNotificationAsRead);

meRouter.get(
  '/chat/threads',
  requireAuth,
  requirePersona('developer', 'company'),
  validate(getMyThreadsQuerySchema, 'query'),
  meController.getMyThreads
);

meRouter.get(
  '/chat/threads/:threadId',
  requireAuth,
  requirePersona('developer', 'company'),
  validate(threadIdParamSchema, 'params'),
  meController.getThreadById
);

meRouter.get(
  '/chat/threads/:threadId/messages',
  requireAuth,
  requirePersona('developer', 'company'),
  validate(threadIdParamSchema, 'params'),
  validate(threadMessagesQuerySchema, 'query'),
  meController.getThreadMessages
);

meRouter.post(
  '/chat/threads/:threadId/messages',
  requireAuth,
  requirePersona('developer', 'company'),
  validate(threadIdParamSchema, 'params'),
  validate(createMessageBodySchema, 'body'),
  meController.createMessage
);

meRouter.post(
  '/chat/threads/:threadId/read',
  requireAuth,
  requirePersona('developer', 'company'),
  validate(threadIdParamSchema, 'params'),
  meController.markThreadAsRead
);
