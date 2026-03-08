import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

export async function getProjectReviews({ projectId, page = 1, size = 20, authorPersona }) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true },
  });

  if (!project || project.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  const skip = (page - 1) * size;

  const where = {
    task: {
      projectId,
      deletedAt: null,
    },
  };

  if (authorPersona === 'company') {
    where.author = {
      companyProfile: {
        isNot: null,
      },
    };
  } else if (authorPersona === 'developer') {
    where.author = {
      developerProfile: {
        isNot: null,
      },
    };
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: {
        id: true,
        taskId: true,
        task: {
          select: {
            title: true,
          },
        },
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
    prisma.review.count({ where }),
  ]);

  const items = reviews.map((review) => {
    const isCompany = !!review.author.companyProfile;
    return {
      review_id: review.id,
      task_id: review.taskId,
      task_title: review.task.title,
      author_persona: isCompany ? 'company' : 'developer',
      author_user_id: review.authorUserId,
      author_display_name: isCompany
        ? review.author.companyProfile?.companyName
        : review.author.developerProfile?.displayName,
      rating: review.rating,
      text: review.text,
      created_at: review.createdAt.toISOString(),
    };
  });

  // Calculate stats
  const companyCount = await prisma.review.count({
    where: {
      ...where,
      author: {
        companyProfile: {
          isNot: null,
        },
      },
    },
  });

  const developerCount = await prisma.review.count({
    where: {
      ...where,
      author: {
        developerProfile: {
          isNot: null,
        },
      },
    },
  });

  return {
    items,
    page,
    size,
    total,
    stats: {
      company_reviews_count: companyCount,
      developer_reviews_count: developerCount,
    },
  };
}
