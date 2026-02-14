import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePersona } from '../middleware/persona.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as projectsController from '../controllers/projects.controller.js';
import {
  createProjectSchema,
  deleteProjectParamsSchema,
  updateProjectParamsSchema,
  updateProjectSchema,
} from '../schemas/projects.schemas.js';

export const projectsRouter = Router();

projectsRouter.post(
  '/',
  requireAuth,
  requirePersona('company'),
  validate(createProjectSchema),
  projectsController.createProject
);

projectsRouter.put(
  '/:projectId',
  requireAuth,
  requirePersona('company'),
  validate(updateProjectParamsSchema, 'params'),
  validate(updateProjectSchema),
  projectsController.updateProject
);

projectsRouter.delete(
  '/:projectId',
  requireAuth,
  requirePersona('company'),
  validate(deleteProjectParamsSchema, 'params'),
  projectsController.deleteProject
);
