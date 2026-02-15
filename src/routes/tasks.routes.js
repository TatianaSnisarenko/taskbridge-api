import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePersona } from '../middleware/persona.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as tasksController from '../controllers/tasks.controller.js';
import { createTaskDraftSchema } from '../schemas/tasks.schemas.js';

export const tasksRouter = Router();

tasksRouter.post(
  '/',
  requireAuth,
  requirePersona('company'),
  validate(createTaskDraftSchema),
  tasksController.createTaskDraft
);
