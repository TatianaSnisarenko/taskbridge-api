import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

/**
 * Create a platform review
 */
export async function createPlatformReview({ userId, rating, text }) {
  // Check if user exists with profile information
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      developerProfile: {
        select: { displayName: true },
      },
      companyProfile: {
        select: { companyName: true },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  // Check cooldown period
  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - env.platformReviewCooldownDays);

  const recentReview = await prisma.platformReview.findFirst({
    where: {
      userId,
      createdAt: {
        gte: cooldownDate,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (recentReview) {
    const daysRemaining = Math.ceil(
      (recentReview.createdAt.getTime() +
        env.platformReviewCooldownDays * 24 * 60 * 60 * 1000 -
        Date.now()) /
        (24 * 60 * 60 * 1000)
    );
    throw new ApiError(
      429,
      'REVIEW_COOLDOWN',
      `You can submit a new review in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`
    );
  }

  // Create review
  const review = await prisma.platformReview.create({
    data: {
      userId,
      rating,
      text,
      isApproved: false,
    },
    include: {
      user: {
        select: {
          id: true,
          developerProfile: {
            select: { displayName: true },
          },
          companyProfile: {
            select: { companyName: true },
          },
        },
      },
    },
  });

  return {
    review_id: review.id,
    user_id: review.userId,
    author_name:
      review.user.developerProfile?.displayName || review.user.companyProfile?.companyName,
    rating: review.rating,
    text: review.text,
    is_approved: review.isApproved,
    created_at: review.createdAt.toISOString(),
    updated_at: review.updatedAt.toISOString(),
  };
}

/**
 * Get list of platform reviews
 */
export async function getPlatformReviews({
  status = 'approved',
  limit = 20,
  offset = 0,
  sort = 'newest',
  userId = null,
  isAdmin = false,
}) {
  // Build where clause
  const where = {};

  if (!isAdmin) {
    // Non-admin can see approved reviews and their own pending reviews
    if (userId) {
      where.OR = [{ isApproved: true }, { userId }];
    } else {
      where.isApproved = true;
    }
  } else if (status === 'approved') {
    where.isApproved = true;
  } else if (status === 'pending') {
    where.isApproved = false;
  }
  // 'all' status - no filter

  // Build orderBy
  let orderBy = {};
  switch (sort) {
    case 'newest':
      orderBy = { createdAt: 'desc' };
      break;
    case 'oldest':
      orderBy = { createdAt: 'asc' };
      break;
    case 'highest_rated':
      orderBy = { rating: 'desc' };
      break;
    case 'lowest_rated':
      orderBy = { rating: 'asc' };
      break;
    default:
      orderBy = { createdAt: 'desc' };
  }

  const [reviews, total] = await Promise.all([
    prisma.platformReview.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            developerProfile: {
              select: { displayName: true },
            },
            companyProfile: {
              select: { companyName: true },
            },
          },
        },
      },
    }),
    prisma.platformReview.count({ where }),
  ]);

  return {
    reviews: reviews.map((r) => ({
      review_id: r.id,
      user_id: r.userId,
      author_name: r.user.developerProfile?.displayName || r.user.companyProfile?.companyName,
      rating: r.rating,
      text: r.text,
      is_approved: r.isApproved,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    })),
    total,
    limit,
    offset,
  };
}

/**
 * Get single platform review by ID
 */
export async function getPlatformReview({ reviewId, userId = null, isAdmin = false }) {
  const review = await prisma.platformReview.findUnique({
    where: { id: reviewId },
    include: {
      user: {
        select: {
          id: true,
          developerProfile: {
            select: { displayName: true },
          },
          companyProfile: {
            select: { companyName: true },
          },
        },
      },
    },
  });

  if (!review) {
    throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Platform review not found');
  }

  // Check access permissions
  const isOwner = userId && review.userId === userId;
  const canView = isAdmin || review.isApproved || isOwner;

  if (!canView) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to view this review');
  }

  return {
    review_id: review.id,
    user_id: review.userId,
    author_name:
      review.user.developerProfile?.displayName || review.user.companyProfile?.companyName,
    rating: review.rating,
    text: review.text,
    is_approved: review.isApproved,
    created_at: review.createdAt.toISOString(),
    updated_at: review.updatedAt.toISOString(),
  };
}

/**
 * Update platform review (admin only or user can update own unapproved review)
 */
export async function updatePlatformReview({ reviewId, userId, isAdmin, updates }) {
  const review = await prisma.platformReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Platform review not found');
  }

  const isOwner = review.userId === userId;

  // Check permissions
  if (isAdmin) {
    // Admin can update anything including is_approved
  } else if (isOwner && !review.isApproved) {
    // User can update their own unapproved review (but not is_approved field)
    if (updates.is_approved !== undefined) {
      throw new ApiError(403, 'FORBIDDEN', 'You cannot approve your own review');
    }
  } else {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to update this review');
  }

  // Build update data
  const updateData = {};
  if (updates.rating !== undefined) updateData.rating = updates.rating;
  if (updates.text !== undefined) updateData.text = updates.text;
  if (updates.is_approved !== undefined && isAdmin) {
    updateData.isApproved = updates.is_approved;
  }

  const updatedReview = await prisma.platformReview.update({
    where: { id: reviewId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          developerProfile: {
            select: { displayName: true },
          },
          companyProfile: {
            select: { companyName: true },
          },
        },
      },
    },
  });

  return {
    review_id: updatedReview.id,
    user_id: updatedReview.userId,
    author_name:
      updatedReview.user.developerProfile?.displayName ||
      updatedReview.user.companyProfile?.companyName,
    rating: updatedReview.rating,
    text: updatedReview.text,
    is_approved: updatedReview.isApproved,
    created_at: updatedReview.createdAt.toISOString(),
    updated_at: updatedReview.updatedAt.toISOString(),
  };
}

/**
 * Delete platform review (admin only)
 */
export async function deletePlatformReview({ reviewId }) {
  const review = await prisma.platformReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Platform review not found');
  }

  await prisma.platformReview.delete({
    where: { id: reviewId },
  });

  return {
    review_id: reviewId,
    deleted: true,
  };
}

/**
 * Approve platform review (admin only)
 */
export async function approvePlatformReview({ reviewId }) {
  const review = await prisma.platformReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Platform review not found');
  }

  if (review.isApproved) {
    throw new ApiError(400, 'ALREADY_APPROVED', 'Review is already approved');
  }

  const updatedReview = await prisma.platformReview.update({
    where: { id: reviewId },
    data: { isApproved: true },
    include: {
      user: {
        select: {
          id: true,
          developerProfile: {
            select: { displayName: true },
          },
          companyProfile: {
            select: { companyName: true },
          },
        },
      },
    },
  });

  return {
    review_id: updatedReview.id,
    user_id: updatedReview.userId,
    author_name:
      updatedReview.user.developerProfile?.displayName ||
      updatedReview.user.companyProfile?.companyName,
    rating: updatedReview.rating,
    text: updatedReview.text,
    is_approved: updatedReview.isApproved,
    created_at: updatedReview.createdAt.toISOString(),
    updated_at: updatedReview.updatedAt.toISOString(),
  };
}
