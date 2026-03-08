import { prisma } from '../../db/prisma.js';
import { ensureUserExists } from '../../db/queries/profiles.queries.js';

export async function getUserReviews({ userId, page = 1, size = 20 }) {
  await ensureUserExists(userId);

  const skip = (page - 1) * size;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { targetUserId: userId },
      select: {
        id: true,
        taskId: true,
        rating: true,
        text: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            developerProfile: {
              select: {
                displayName: true,
              },
            },
            companyProfile: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: size,
    }),
    prisma.review.count({ where: { targetUserId: userId } }),
  ]);

  const items = reviews.map((review) => ({
    review_id: review.id,
    task_id: review.taskId,
    rating: review.rating,
    text: review.text,
    created_at: review.createdAt.toISOString(),
    author: {
      user_id: review.author.id,
      display_name:
        review.author.developerProfile?.displayName || review.author.companyProfile?.companyName,
      company_name: review.author.companyProfile?.companyName || null,
    },
  }));

  return {
    items,
    page,
    size,
    total,
  };
}
