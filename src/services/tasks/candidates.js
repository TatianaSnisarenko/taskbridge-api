import { prisma } from '../../db/prisma.js';
import { findTaskForOwnership } from '../../db/queries/tasks.queries.js';
import { getTaskForCandidates, buildCandidateOutput, sortCandidates } from './helpers.js';

/**
 * Internal helper: Get ranked candidates for a task with filtering
 */
async function getRankedCandidates({
  userId,
  taskId,
  search,
  availability,
  experienceLevel,
  minRating,
}) {
  const task = await getTaskForCandidates({ userId, taskId });
  const taskTechnologyIdSet = new Set(task.technologies.map((tt) => tt.technologyId));

  const profileWhere = {
    technologies: {
      some: {},
    },
  };

  if (availability) {
    profileWhere.availability = availability;
  }

  if (experienceLevel) {
    profileWhere.experienceLevel = experienceLevel;
  }

  if (minRating !== undefined && minRating !== null) {
    profileWhere.avgRating = { gte: minRating };
  }

  if (task.acceptedApplication?.developerUserId) {
    profileWhere.userId = { not: task.acceptedApplication.developerUserId };
  }

  if (search) {
    profileWhere.OR = [
      { displayName: { contains: search, mode: 'insensitive' } },
      { jobTitle: { contains: search, mode: 'insensitive' } },
      {
        technologies: {
          some: {
            technology: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
    ];
  }

  const [profiles, applications, pendingInvites] = await Promise.all([
    prisma.developerProfile.findMany({
      where: profileWhere,
      select: {
        userId: true,
        displayName: true,
        jobTitle: true,
        avatarUrl: true,
        experienceLevel: true,
        availability: true,
        avgRating: true,
        reviewsCount: true,
        technologies: {
          include: {
            technology: {
              select: {
                id: true,
                slug: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    }),
    prisma.application.findMany({
      where: { taskId },
      select: {
        developerUserId: true,
      },
    }),
    prisma.taskInvite.findMany({
      where: { taskId, status: 'PENDING' },
      select: {
        developerUserId: true,
      },
    }),
  ]);

  const appliedSet = new Set(applications.map((item) => item.developerUserId));
  const invitedSet = new Set(pendingInvites.map((item) => item.developerUserId));

  const candidates = profiles
    .map((profile) =>
      buildCandidateOutput({ profile, taskTechnologyIdSet, appliedSet, invitedSet })
    )
    .filter((candidate) => {
      if (taskTechnologyIdSet.size === 0) return true;
      return candidate.matched_technologies.length > 0;
    })
    .sort(sortCandidates);

  return { candidates };
}

/**
 * Get all applications for a task (paginated)
 */
export async function getTaskApplications({ userId, taskId, page = 1, size = 20 }) {
  // Verify task exists and user is the owner
  await findTaskForOwnership(taskId, userId);

  const skip = (page - 1) * size;

  // Fetch applications with developer info
  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where: {
        taskId,
      },
      select: {
        id: true,
        status: true,
        message: true,
        proposedPlan: true,
        availabilityNote: true,
        createdAt: true,
        developer: {
          select: {
            id: true,
            developerProfile: {
              select: {
                displayName: true,
                jobTitle: true,
                avatarUrl: true,
                avgRating: true,
                reviewsCount: true,
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
        taskId,
      },
    }),
  ]);

  return {
    items: items.map((app) => ({
      application_id: app.id,
      status: app.status,
      message: app.message,
      proposed_plan: app.proposedPlan,
      availability_note: app.availabilityNote,
      created_at: app.createdAt.toISOString(),
      developer: {
        user_id: app.developer.id,
        display_name: app.developer.developerProfile?.displayName,
        primary_role: app.developer.developerProfile?.jobTitle,
        avatar_url: app.developer.developerProfile?.avatarUrl ?? null,
        avg_rating: app.developer.developerProfile?.avgRating
          ? Number(app.developer.developerProfile.avgRating)
          : null,
        reviews_count: app.developer.developerProfile?.reviewsCount,
      },
    })),
    page,
    size,
    total,
  };
}

/**
 * Get top recommended developers for a task (invitable only)
 */
export async function getRecommendedDevelopers({ userId, taskId, limit = 3 }) {
  const { candidates } = await getRankedCandidates({ userId, taskId });
  const filtered = candidates.filter((candidate) => candidate.can_invite);

  return {
    items: filtered.slice(0, limit),
    total: filtered.length,
  };
}

/**
 * Get all candidates for a task with filters and pagination
 */
export async function getTaskCandidates({
  userId,
  taskId,
  page = 1,
  size = 20,
  search,
  availability,
  experienceLevel,
  minRating,
  excludeInvited = false,
  excludeApplied = false,
}) {
  const { candidates } = await getRankedCandidates({
    userId,
    taskId,
    search,
    availability,
    experienceLevel,
    minRating,
  });

  const filtered = candidates.filter((candidate) => {
    if (excludeInvited && candidate.already_invited) return false;
    if (excludeApplied && candidate.already_applied) return false;
    return true;
  });

  const skip = (page - 1) * size;
  const paginatedItems = filtered.slice(skip, skip + size);

  return {
    items: paginatedItems,
    page,
    size,
    total: filtered.length,
  };
}
