import { Router } from 'express';
import { requireAuth, requireAuthIfOwner } from '../middleware/auth.middleware.js';
import { requirePersona } from '../middleware/persona.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as projectsController from '../controllers/projects.controller.js';
import {
  createProjectSchema,
  deleteProjectParamsSchema,
  getProjectParamsSchema,
  getProjectQuerySchema,
  getProjectsQuerySchema,
  reportProjectParamsSchema,
  reportProjectSchema,
  updateProjectParamsSchema,
  updateProjectSchema,
} from '../schemas/projects.schemas.js';
import { getProjectTasksQuerySchema } from '../schemas/tasks.schemas.js';

export const projectsRouter = Router();

projectsRouter.get(
  '/',
  requireAuthIfOwner,
  validate(getProjectsQuerySchema, 'query'),
  (req, res, next) => {
    // Require persona only if owner=true
    if (req.query.owner === 'true' || req.query.owner === true) {
      return requirePersona('company')(req, res, next);
    }
    return next();
  },
  projectsController.getProjects
);

projectsRouter.get(
  '/:projectId',
  validate(getProjectParamsSchema, 'params'),
  validate(getProjectQuerySchema, 'query'),
  (req, res, next) => {
    if (req.query.include_deleted === true) {
      return requireAuth(req, res, next);
    }
    if (req.headers.authorization) {
      return requireAuth(req, res, next);
    }
    return next();
  },
  projectsController.getProjectById
);

projectsRouter.get(
  '/:projectId/tasks',
  validate(getProjectParamsSchema, 'params'),
  validate(getProjectTasksQuerySchema, 'query'),
  (req, res, next) => {
    if (req.query.include_deleted === true) {
      return requireAuth(req, res, next);
    }
    if (req.headers.authorization) {
      return requireAuth(req, res, next);
    }
    return next();
  },
  projectsController.getProjectTasks
);

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

projectsRouter.post(
  '/:projectId/reports',
  requireAuth,
  requirePersona(),
  validate(reportProjectParamsSchema, 'params'),
  validate(reportProjectSchema),
  projectsController.reportProject
);
