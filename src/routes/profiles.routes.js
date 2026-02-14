import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as profilesController from '../controllers/profiles.controller.js';
import {
  createDeveloperProfileSchema,
  getDeveloperProfileParamsSchema,
  updateDeveloperProfileSchema,
} from '../schemas/profiles.schemas.js';

export const profilesRouter = Router();

profilesRouter.post(
  '/developer',
  requireAuth,
  validate(createDeveloperProfileSchema),
  profilesController.createDeveloperProfile
);

profilesRouter.put(
  '/developer',
  requireAuth,
  validate(updateDeveloperProfileSchema),
  profilesController.updateDeveloperProfile
);

profilesRouter.get(
  '/developer/:userId',
  validate(getDeveloperProfileParamsSchema, 'params'),
  profilesController.getDeveloperProfile
);
