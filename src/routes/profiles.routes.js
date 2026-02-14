import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as profilesController from '../controllers/profiles.controller.js';
import { createDeveloperProfileSchema } from '../schemas/profiles.schemas.js';

export const profilesRouter = Router();

profilesRouter.post(
  '/developer',
  requireAuth,
  validate(createDeveloperProfileSchema),
  profilesController.createDeveloperProfile
);
