import { asyncHandler } from '../utils/asyncHandler.js';
import * as platformReviewsService from '../services/platform-reviews.service.js';

/**
 * POST /api/platform-reviews
 * Create a new platform review
 */
export const createPlatformReview = asyncHandler(async (req, res) => {
  const result = await platformReviewsService.createPlatformReview({
    userId: req.user.id,
    rating: req.body.rating,
    text: req.body.text,
    authorPersona: req.persona,
  });

  return res.status(201).json(result);
});

/**
 * GET /api/platform-reviews
 * Get list of platform reviews
 */
export const getPlatformReviews = asyncHandler(async (req, res) => {
  const result = await platformReviewsService.getPlatformReviews({
    status: req.query.status,
    limit: req.query.limit,
    offset: req.query.offset,
    sort: req.query.sort,
    userId: req.user?.id,
    isAdmin: req.user?.isAdminOrModerator || false,
  });

  return res.status(200).json(result);
});

/**
 * GET /api/platform-reviews/:reviewId
 * Get single platform review by ID
 */
export const getPlatformReview = asyncHandler(async (req, res) => {
  const result = await platformReviewsService.getPlatformReview({
    reviewId: req.params.reviewId,
    userId: req.user?.id,
    isAdmin: req.user?.isAdminOrModerator || false,
  });

  return res.status(200).json(result);
});

/**
 * PATCH /api/platform-reviews/:reviewId
 * Update platform review (admin or owner of unapproved review)
 */
export const updatePlatformReview = asyncHandler(async (req, res) => {
  const result = await platformReviewsService.updatePlatformReview({
    reviewId: req.params.reviewId,
    userId: req.user.id,
    isAdmin: req.user?.isAdminOrModerator || false,
    updates: {
      rating: req.body.rating,
      text: req.body.text,
      is_approved: req.body.is_approved,
    },
  });

  return res.status(200).json(result);
});

/**
 * DELETE /api/platform-reviews/:reviewId
 * Delete platform review (admin only)
 */
export const deletePlatformReview = asyncHandler(async (req, res) => {
  const result = await platformReviewsService.deletePlatformReview({
    reviewId: req.params.reviewId,
  });

  return res.status(200).json(result);
});

/**
 * PATCH /api/platform-reviews/:reviewId/approve
 * Approve platform review (admin only)
 */
export const approvePlatformReview = asyncHandler(async (req, res) => {
  const result = await platformReviewsService.approvePlatformReview({
    reviewId: req.params.reviewId,
  });

  return res.status(200).json(result);
});
