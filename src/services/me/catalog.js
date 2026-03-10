import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Get applications created by the current developer user with pagination
 */
export async function getMyApplications({ userId, page = 1, size = 20 }) {
  const developerProfile = await prisma.developerProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });

  if (!developerProfile) {
    throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Developer profile does not exist');
  }

  const skip = (page - 1) * size;

  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where: {
        developerUserId: userId,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            deadline: true,
            project: {
              select: {
                id: true,
                title: true,
              },
            },
            owner: {
              select: {
                id: true,
                companyProfile: {
                  select: {
                    companyName: true,
                  },
                },
              },
            },
          },
        },
      },
      skip,
      take: size,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.application.count({
      where: {
        developerUserId: userId,
      },
    }),
  ]);

  return {
    items: items.map((app) => ({
      application_id: app.id,
      status: app.status,
      created_at: app.createdAt.toISOString(),
      task: {
        task_id: app.task.id,
        title: app.task.title,
        status: app.task.status,
        deadline: app.task.deadline ? app.task.deadline.toISOString().slice(0, 10) : null,
        project: app.task.project
          ? {
              project_id: app.task.project.id,
              title: app.task.project.title,
            }
          : null,
      },
      company: {
        user_id: app.task.owner.id,
        company_name: app.task.owner.companyProfile?.companyName,
      },
    })),
    page,
    size,
    total,
  };
}

/**
 * Get tasks where the current developer is accepted
 */
export async function getMyTasks({ userId, page = 1, size = 20, status }) {
  const developerProfile = await prisma.developerProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });

  if (!developerProfile) {
    throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Developer profile does not exist');
  }

  const allowedStatuses = ['IN_PROGRESS', 'DISPUTE', 'COMPLETION_REQUESTED', 'COMPLETED'];
  const skip = (page - 1) * size;

  const where = {
    deletedAt: null,
    acceptedApplication: {
      developerUserId: userId,
    },
    status: status ?? { in: allowedStatuses },
  };

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        deadline: true,
        publishedAt: true,
        completedAt: true,
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        ownerUserId: true,
        owner: {
          select: {
            companyProfile: {
              select: {
                companyName: true,
                verified: true,
                avgRating: true,
                reviewsCount: true,
              },
            },
          },
        },
      },
      skip,
      take: size,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.task.count({ where }),
  ]);

  return {
    items: items.map((task) => {
      const companyProfile = task.owner.companyProfile;
      const avgRating = companyProfile?.avgRating;

      return {
        task_id: task.id,
        title: task.title,
        status: task.status,
        deadline: task.deadline ? task.deadline.toISOString().slice(0, 10) : null,
        published_at: task.publishedAt ? task.publishedAt.toISOString() : null,
        completed_at: task.completedAt ? task.completedAt.toISOString() : null,
        project: task.project ? { project_id: task.project.id, title: task.project.title } : null,
        company: {
          user_id: task.ownerUserId,
          company_name: companyProfile?.companyName,
          verified: companyProfile?.verified,
          avg_rating: avgRating === null || avgRating === undefined ? null : Number(avgRating),
          reviews_count: companyProfile?.reviewsCount,
        },
      };
    }),
    page,
    size,
    total,
  };
}

export async function getMyProjects({ userId, persona, page = 1, size = 20 }) {
  const skip = (page - 1) * size;

  if (persona !== 'developer') {
    throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Developer profile does not exist');
  }

  const where = {
    deletedAt: null,
  };

  const developerProfile = await prisma.developerProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });

  if (!developerProfile) {
    throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Developer profile does not exist');
  }

  where.tasks = {
    some: {
      deletedAt: null,
      applications: {
        some: {
          developerUserId: userId,
          status: 'ACCEPTED',
        },
      },
    },
  };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true,
        ownerUserId: true,
        title: true,
        shortDescription: true,
        status: true,
        visibility: true,
        maxTalents: true,
        deadline: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            companyProfile: {
              select: {
                companyName: true,
                verified: true,
                avgRating: true,
                reviewsCount: true,
              },
            },
          },
        },
      },
      skip,
      take: size,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    items: items.map((project) => ({
      project_id: project.id,
      owner_user_id: project.ownerUserId,
      title: project.title,
      short_description: project.shortDescription,
      status: project.status,
      visibility: project.visibility,
      max_talents: project.maxTalents,
      deadline: project.deadline ? project.deadline.toISOString().slice(0, 10) : null,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
      company: {
        user_id: project.owner.id,
        company_name: project.owner.companyProfile?.companyName,
        verified: project.owner.companyProfile?.verified,
        avg_rating:
          project.owner.companyProfile?.avgRating === null ||
          project.owner.companyProfile?.avgRating === undefined
            ? null
            : Number(project.owner.companyProfile.avgRating),
        reviews_count: project.owner.companyProfile?.reviewsCount,
      },
    })),
    page,
    size,
    total,
  };
}
