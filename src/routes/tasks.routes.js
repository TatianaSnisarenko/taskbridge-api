import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePersona } from '../middleware/persona.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as tasksController from '../controllers/tasks.controller.js';
import {
  createTaskDraftSchema,
  updateTaskDraftSchema,
  taskIdParamSchema,
} from '../schemas/tasks.schemas.js';

export const tasksRouter = Router();

tasksRouter.post(
  '/',
  requireAuth,
  requirePersona('company'),
  validate(createTaskDraftSchema),
  tasksController.createTaskDraft
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
