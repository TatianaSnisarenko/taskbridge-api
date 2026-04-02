import { Router } from 'express';
import {
  requireAuth,
  requireAdmin,
  requireAdminOrModerator,
} from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as profilesController from '../controllers/profiles.controller.js';
import * as usersController from '../controllers/users.controller.js';
import {
  getUserReviewsSchema,
  getDeveloperProfileParamsSchema,
} from '../schemas/profiles.schemas.js';
import {
  userIdParamsSchema,
  toggleModeratorRoleSchema,
  usersCatalogQuerySchema,
} from '../schemas/users.schemas.js';

export const usersRouter = Router();

usersRouter.get(
  '/',
  requireAuth,
  requireAdminOrModerator,
  validate(usersCatalogQuerySchema, 'query'),
  usersController.getUsersCatalog
);

usersRouter.patch(
  '/:userId/moderator',
  requireAuth,
  requireAdmin,
  validate(userIdParamsSchema, 'params'),
  validate(toggleModeratorRoleSchema),
  usersController.toggleModeratorRole
);

usersRouter.get(
  '/:userId/reviews',
  validate(getDeveloperProfileParamsSchema, 'params'),
  validate(getUserReviewsSchema, 'query'),
  profilesController.getUserReviews
);
