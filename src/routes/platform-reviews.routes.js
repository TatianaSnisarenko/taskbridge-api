import { Router } from 'express';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as platformReviewsController from '../controllers/platform-reviews.controller.js';
import {
  createPlatformReviewSchema,
  updatePlatformReviewSchema,
  getPlatformReviewsSchema,
  getPlatformReviewByIdParamsSchema,
} from '../schemas/platform-reviews.schemas.js';

export const platformReviewsRouter = Router();

// Public routes
platformReviewsRouter.get(
  '/',
  optionalAuth,
  validate(getPlatformReviewsSchema, 'query'),
  platformReviewsController.getPlatformReviews
);

platformReviewsRouter.get(
  '/:reviewId',
  optionalAuth,
  validate(getPlatformReviewByIdParamsSchema, 'params'),
  platformReviewsController.getPlatformReview
);

// Protected routes - authenticated users
platformReviewsRouter.post(
  '/',
  requireAuth,
  validate(createPlatformReviewSchema),
  platformReviewsController.createPlatformReview
);

// Update can be done by owner (for unapproved reviews) or admin (for all reviews)
platformReviewsRouter.patch(
  '/:reviewId',
  requireAuth,
  validate(getPlatformReviewByIdParamsSchema, 'params'),
  validate(updatePlatformReviewSchema),
  platformReviewsController.updatePlatformReview
);

// Admin-only routes
platformReviewsRouter.delete(
  '/:reviewId',
  requireAuth,
  requireAdmin,
  validate(getPlatformReviewByIdParamsSchema, 'params'),
  platformReviewsController.deletePlatformReview
);

platformReviewsRouter.patch(
  '/:reviewId/approve',
  requireAuth,
  requireAdmin,
  validate(getPlatformReviewByIdParamsSchema, 'params'),
  platformReviewsController.approvePlatformReview
);
