import { Router } from 'express';
import { requireAuth, requireAuthIfOwner } from '../middleware/auth.middleware.js';
import { requirePersona } from '../middleware/persona.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as tasksController from '../controllers/tasks.controller.js';
import {
  createTaskDraftSchema,
  createTaskApplicationSchema,
  updateTaskDraftSchema,
  taskIdParamSchema,
  getTasksCatalogSchema,
} from '../schemas/tasks.schemas.js';

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
