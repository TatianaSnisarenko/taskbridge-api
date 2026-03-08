import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

export async function getTaskReviews({ taskId }) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, deletedAt: true },
  });

  if (!task || task.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found');
  }

  const [company_review, developer_review] = await Promise.all([
    prisma.review.findFirst({
      where: {
        taskId,
        author: {
          companyProfile: {
            isNot: null,
          },
        },
      },
      select: {
        id: true,
        authorUserId: true,
        rating: true,
        text: true,
        createdAt: true,
        author: {
          select: {
            companyProfile: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
    }),
    prisma.review.findFirst({
      where: {
        taskId,
        author: {
          developerProfile: {
            isNot: null,
          },
        },
      },
      select: {
        id: true,
        authorUserId: true,
        rating: true,
        text: true,
        createdAt: true,
        author: {
          select: {
            developerProfile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    company_review: company_review
      ? {
          review_id: company_review.id,
          author_user_id: company_review.authorUserId,
          author_display_name: company_review.author.companyProfile?.companyName,
          rating: company_review.rating,
          text: company_review.text,
          created_at: company_review.createdAt.toISOString(),
        }
      : null,
    developer_review: developer_review
      ? {
          review_id: developer_review.id,
          author_user_id: developer_review.authorUserId,
          author_display_name: developer_review.author.developerProfile?.displayName,
          rating: developer_review.rating,
          text: developer_review.text,
          created_at: developer_review.createdAt.toISOString(),
        }
      : null,
  };
}
