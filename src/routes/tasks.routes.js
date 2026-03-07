import { Router } from 'express';
import { requireAuth, requireAuthIfOwner } from '../middleware/auth.middleware.js';
import { requirePersona } from '../middleware/persona.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as tasksController from '../controllers/tasks.controller.js';
import * as invitesController from '../controllers/invites.controller.js';
import {
  createTaskDraftSchema,
  createTaskApplicationSchema,
  updateTaskDraftSchema,
  taskIdParamSchema,
  getTasksCatalogSchema,
  createReviewSchema,
  rejectTaskCompletionSchema,
  getRecommendedDevelopersQuerySchema,
  getTaskCandidatesQuerySchema,
} from '../schemas/tasks.schemas.js';
import { createTaskInviteSchema, getTaskInvitesQuerySchema } from '../schemas/invites.schemas.js';

export const tasksRouter = Router();

tasksRouter.get(
  '/',
  requireAuthIfOwner,
  validate(getTasksCatalogSchema, 'query'),
  (req, res, next) => {
    // Require persona only if owner=true
    if (req.query.owner === 'true' || req.query.owner === true) {
      return requirePersona('company')(req, res, next);
    }
    return next();
  },
  tasksController.getTasksCatalog
);

tasksRouter.post(
  '/',
  requireAuth,
  requirePersona('company'),
  validate(createTaskDraftSchema),
  tasksController.createTaskDraft
);

tasksRouter.get(
  '/:taskId',
  validate(taskIdParamSchema, 'params'),
  (req, res, next) => {
    if (req.headers.authorization) {
      return requireAuth(req, res, next);
    }
    return next();
  },
  tasksController.getTaskById
);

tasksRouter.put(
  '/:taskId',
  requireAuth,
  requirePersona('company'),
  validate(taskIdParamSchema, 'params'),
  validate(updateTaskDraftSchema),
  tasksController.updateTaskDraft
);

tasksRouter.post(
  '/:taskId/publish',
  requireAuth,
  requirePersona('company'),
  validate(taskIdParamSchema, 'params'),
  tasksController.publishTask
);

tasksRouter.post(
  '/:taskId/applications',
  requireAuth,
  requirePersona('developer'),
  validate(taskIdParamSchema, 'params'),
  validate(createTaskApplicationSchema),
  tasksController.applyToTask
);

tasksRouter.get(
  '/:taskId/applications',
  requireAuth,
  requirePersona('company'),
  validate(taskIdParamSchema, 'params'),
  validate(getTasksCatalogSchema, 'query'),
  tasksController.getTaskApplications
);

tasksRouter.get(
  '/:taskId/recommended-developers',
  requireAuth,
  requirePersona('company'),
  validate(taskIdParamSchema, 'params'),
  validate(getRecommendedDevelopersQuerySchema, 'query'),
  tasksController.getRecommendedDevelopers
);

tasksRouter.get(
  '/:taskId/candidates',
  requireAuth,
  requirePersona('company'),
  validate(taskIdParamSchema, 'params'),
  validate(getTaskCandidatesQuerySchema, 'query'),
  tasksController.getTaskCandidates
);

tasksRouter.post(
  '/:taskId/invites',
  requireAuth,
  requirePersona('company'),
  validate(taskIdParamSchema, 'params'),
  validate(createTaskInviteSchema),
  invitesController.createTaskInvite
);

tasksRouter.get(
  '/:taskId/invites',
  requireAuth,
  requirePersona('company'),
  validate(taskIdParamSchema, 'params'),
  validate(getTaskInvitesQuerySchema, 'query'),
  invitesController.getTaskInvites
);

tasksRouter.post(
  '/:taskId/completion/request',
  requireAuth,
  requirePersona('developer'),
  validate(taskIdParamSchema, 'params'),
  tasksController.requestTaskCompletion
);

tasksRouter.post(
  '/:taskId/completion/confirm',
  requireAuth,
  requirePersona('company'),
  validate(taskIdParamSchema, 'params'),
  tasksController.confirmTaskCompletion
);

tasksRouter.post(
  '/:taskId/completion/reject',
  requireAuth,
  requirePersona('company'),
  validate(taskIdParamSchema, 'params'),
  validate(rejectTaskCompletionSchema),
  tasksController.rejectTaskCompletion
);

tasksRouter.post(
  '/:taskId/reviews',
  requireAuth,
  validate(taskIdParamSchema, 'params'),
  validate(createReviewSchema),
  tasksController.createReview
);

tasksRouter.post(
  '/:taskId/close',
  requireAuth,
  requirePersona('company'),
  validate(taskIdParamSchema, 'params'),
  tasksController.closeTask
);

tasksRouter.delete(
  '/:taskId',
  requireAuth,
  requirePersona('company'),
  validate(taskIdParamSchema, 'params'),
  tasksController.deleteTask
);
