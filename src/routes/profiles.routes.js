import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePersona } from '../middleware/persona.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as profilesController from '../controllers/profiles.controller.js';
import {
  createCompanyProfileSchema,
  createDeveloperProfileSchema,
  getCompanyProfileParamsSchema,
  getDeveloperProfileParamsSchema,
  updateCompanyProfileSchema,
  updateDeveloperProfileSchema,
} from '../schemas/profiles.schemas.js';

const upload = multer({ storage: multer.memoryStorage() });

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

profilesRouter.post(
  '/company',
  requireAuth,
  validate(createCompanyProfileSchema),
  profilesController.createCompanyProfile
);

profilesRouter.put(
  '/company',
  requireAuth,
  validate(updateCompanyProfileSchema),
  profilesController.updateCompanyProfile
);

profilesRouter.get(
  '/company/:userId',
  validate(getCompanyProfileParamsSchema, 'params'),
  profilesController.getCompanyProfile
);

profilesRouter.post(
  '/developer/avatar',
  requireAuth,
  requirePersona('developer'),
  upload.single('file'),
  profilesController.uploadDeveloperAvatar
);

profilesRouter.delete(
  '/developer/avatar',
  requireAuth,
  requirePersona('developer'),
  profilesController.deleteDeveloperAvatar
);
