import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePersona } from '../middleware/persona.middleware.js';
import { validateCreateMessageRequest } from '../middleware/validate-chat-message.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as meController from '../controllers/me.controller.js';
import {
  getMyApplicationsQuerySchema,
  getMyInvitesQuerySchema,
  getMyProjectsQuerySchema,
  getMyTasksQuerySchema,
  getMyNotificationsQuerySchema,
  notificationIdParamSchema,
  getMyThreadsQuerySchema,
  threadIdParamSchema,
  threadMessagesQuerySchema,
  favoriteTaskParamSchema,
  getMyFavoriteTasksQuerySchema,
  patchMyOnboardingSchema,
  resetMyOnboardingSchema,
  checkMyOnboardingQuerySchema,
} from '../schemas/me.schemas.js';

export const meRouter = Router();
const chatMessageUpload = multer({ storage: multer.memoryStorage() });

meRouter.get('/', requireAuth, meController.getMe);
meRouter.delete('/', requireAuth, meController.deleteMyAccount);
meRouter.patch(
  '/onboarding',
  requireAuth,
  validate(patchMyOnboardingSchema),
  meController.updateMyOnboarding
);
meRouter.get(
  '/onboarding/check',
  requireAuth,
  validate(checkMyOnboardingQuerySchema, 'query'),
  meController.checkMyOnboarding
);
meRouter.post(
  '/onboarding/reset',
  requireAuth,
  validate(resetMyOnboardingSchema),
  meController.resetMyOnboarding
);

meRouter.get(
  '/applications',
  requireAuth,
  requirePersona('developer'),
  validate(getMyApplicationsQuerySchema, 'query'),
  meController.getMyApplications
);

meRouter.get(
  '/invites',
  requireAuth,
  requirePersona('developer'),
  validate(getMyInvitesQuerySchema, 'query'),
  meController.getMyInvites
);

meRouter.get(
  '/tasks',
  requireAuth,
  requirePersona('developer'),
  validate(getMyTasksQuerySchema, 'query'),
  meController.getMyTasks
);

meRouter.get(
  '/projects',
  requireAuth,
  requirePersona('developer'),
  validate(getMyProjectsQuerySchema, 'query'),
  meController.getMyProjects
);

meRouter.get(
  '/notifications',
  requireAuth,
  requirePersona('developer', 'company'),
  validate(getMyNotificationsQuerySchema, 'query'),
  meController.getMyNotifications
);

meRouter.post(
  '/notifications/read-all',
  requireAuth,
  requirePersona('developer', 'company'),
  meController.markAllNotificationsAsRead
);

meRouter.post(
  '/notifications/:id/read',
  requireAuth,
  requirePersona('developer', 'company'),
  validate(notificationIdParamSchema, 'params'),
  meController.markNotificationAsRead
);

meRouter.post(
  '/notifications/:id/unread',
  requireAuth,
  requirePersona('developer', 'company'),
  validate(notificationIdParamSchema, 'params'),
  meController.markNotificationAsUnread
);

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
  chatMessageUpload.array('files'),
  validateCreateMessageRequest,
  meController.createMessage
);

meRouter.post(
  '/chat/threads/:threadId/read',
  requireAuth,
  requirePersona('developer', 'company'),
  validate(threadIdParamSchema, 'params'),
  meController.markThreadAsRead
);

meRouter.get(
  '/favorites/tasks',
  requireAuth,
  requirePersona('developer'),
  validate(getMyFavoriteTasksQuerySchema, 'query'),
  meController.getMyFavoriteTasks
);

meRouter.post(
  '/favorites/tasks/:taskId',
  requireAuth,
  requirePersona('developer'),
  validate(favoriteTaskParamSchema, 'params'),
  meController.addFavoriteTask
);

meRouter.delete(
  '/favorites/tasks/:taskId',
  requireAuth,
  requirePersona('developer'),
  validate(favoriteTaskParamSchema, 'params'),
  meController.removeFavoriteTask
);
