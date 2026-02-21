import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePersona } from '../middleware/persona.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import Joi from 'joi';
import * as tasksController from '../controllers/tasks.controller.js';

const applicationIdParamSchema = Joi.object({
  applicationId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'Application id is required',
    'string.guid': 'Application id must be a valid UUID',
    'any.required': 'Application id is required',
  }),
});

export const applicationsRouter = Router();

applicationsRouter.post(
  '/:applicationId/accept',
  requireAuth,
  requirePersona('company'),
  validate(applicationIdParamSchema, 'params'),
  tasksController.acceptApplication
);

applicationsRouter.post(
  '/:applicationId/reject',
  requireAuth,
  requirePersona('company'),
  validate(applicationIdParamSchema, 'params'),
  tasksController.rejectApplication
);
