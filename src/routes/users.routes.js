import { Router } from 'express';
import { validate } from '../middleware/validate.middleware.js';
import * as profilesController from '../controllers/profiles.controller.js';
import {
  getUserReviewsSchema,
  getDeveloperProfileParamsSchema,
} from '../schemas/profiles.schemas.js';

export const usersRouter = Router();

usersRouter.get(
  '/:userId/reviews',
  validate(getDeveloperProfileParamsSchema, 'params'),
  validate(getUserReviewsSchema, 'query'),
  profilesController.getUserReviews
);
