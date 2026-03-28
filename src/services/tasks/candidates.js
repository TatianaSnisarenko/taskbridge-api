import { prisma } from '../../db/prisma.js';
import { Prisma } from '@prisma/client';
import { findTaskForOwnership } from '../../db/queries/tasks.queries.js';
import { getTaskForCandidates, buildCandidateOutput } from './helpers.js';
import { getCachedCandidateCount, setCachedCandidateCount } from '../../cache/candidates.js';

/**
 * Build ranked candidates CTE SQL with consistent filtering and scoring.
 */
function buildRankedCandidatesCte({
  taskId,
  taskTechnologyIds,
  acceptedDeveloperUserId,
  search,
  availability,
  experienceLevel,
  minRating,
  excludeApplied,
  excludeInvited,
}) {
  const hasTaskTechFilter = taskTechnologyIds.length > 0;
  const taskTechIdsSql = hasTaskTechFilter
    ? Prisma.join(taskTechnologyIds.map((id) => Prisma.sql`${id}`))
    : Prisma.sql`NULL`;

  const whereFragments = [
    Prisma.sql`EXISTS (
      SELECT 1
      FROM developer_technologies dt_any
      WHERE dt_any.developer_user_id = dp.user_id
    )`,
  ];

  if (availability) {
    whereFragments.push(Prisma.sql`dp.availability = ${availability}::"Availability"`);
  }

  if (experienceLevel) {
    whereFragments.push(Prisma.sql`dp.experience_level = ${experienceLevel}::"ExperienceLevel"`);
  }

  if (minRating !== undefined && minRating !== null) {
    whereFragments.push(Prisma.sql`dp.avg_rating >= ${minRating}`);
  }

  if (acceptedDeveloperUserId) {
    whereFragments.push(Prisma.sql`dp.user_id <> ${acceptedDeveloperUserId}::uuid`);
  }

  if (search) {
    const searchPattern = `%${search}%`;
    whereFragments.push(
      Prisma.sql`(
        dp.display_name ILIKE ${searchPattern}
        OR dp.primary_role ILIKE ${searchPattern}
        OR EXISTS (
          SELECT 1
          FROM developer_technologies dt_search
          JOIN technologies t_search ON t_search.id = dt_search.technology_id
          WHERE dt_search.developer_user_id = dp.user_id
            AND t_search.name ILIKE ${searchPattern}
        )
      )`
    );
  }

  if (excludeApplied) {
    whereFragments.push(
      Prisma.sql`NOT EXISTS (
        SELECT 1
        FROM applications a_ex
        WHERE a_ex.task_id = ${taskId}::uuid
          AND a_ex.developer_user_id = dp.user_id
      )`
    );
  }

  if (excludeInvited) {
    whereFragments.push(
      Prisma.sql`NOT EXISTS (
        SELECT 1
        FROM task_invites ti_ex
        WHERE ti_ex.task_id = ${taskId}::uuid
          AND ti_ex.developer_user_id = dp.user_id
          AND ti_ex.status = 'PENDING'::"TaskInviteStatus"
      )`
    );
  }

  const whereSql = Prisma.join(whereFragments, ' AND ');

  const matchCountExpr = hasTaskTechFilter
    ? Prisma.sql`COUNT(DISTINCT CASE WHEN dt.technology_id IN (${taskTechIdsSql}) THEN dt.technology_id END)`
    : Prisma.sql`0`;

  const havingSql = hasTaskTechFilter
    ? Prisma.sql`HAVING COUNT(DISTINCT CASE WHEN dt.technology_id IN (${taskTechIdsSql}) THEN dt.technology_id END) > 0`
    : Prisma.sql``;

  return Prisma.sql`
    WITH ranked AS (
      SELECT
        dp.user_id AS "userId",
        dp.display_name AS "displayName",
        COALESCE(dp.avg_rating, 0)::float AS "avgRating",
        COALESCE(dp.reviews_count, 0)::int AS "reviewsCount",
        ${matchCountExpr}::int AS "matchCount",
        EXISTS (
          SELECT 1
          FROM applications a
          WHERE a.task_id = ${taskId}::uuid
            AND a.developer_user_id = dp.user_id
        ) AS "alreadyApplied",
        EXISTS (
          SELECT 1
          FROM task_invites ti
          WHERE ti.task_id = ${taskId}::uuid
            AND ti.developer_user_id = dp.user_id
            AND ti.status = 'PENDING'::"TaskInviteStatus"
        ) AS "alreadyInvited",
        (
          ${matchCountExpr} * 10
          + COALESCE(dp.avg_rating, 0)::float * 2
          + LEAST(COALESCE(dp.reviews_count, 0), 20) * 0.2
        )::float AS "score"
      FROM developer_profiles dp
      JOIN developer_technologies dt ON dt.developer_user_id = dp.user_id
      WHERE ${whereSql}
      GROUP BY dp.user_id, dp.display_name, dp.avg_rating, dp.reviews_count
      ${havingSql}
    )
  `;
}

/**
 * Load candidate profile payload for ranked rows and keep row order.
 */
async function buildCandidatesFromRankedRows({ rankedRows, taskTechnologyIds }) {
  const pagedUserIds = rankedRows.map((row) => row.userId);
  if (pagedUserIds.length === 0) return [];

  const profiles = await prisma.developerProfile.findMany({
    where: {
      userId: { in: pagedUserIds },
    },
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
  });

  const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  const taskTechnologyIdSet = new Set(taskTechnologyIds);

  return rankedRows
    .map((row) => {
      const profile = profileByUserId.get(row.userId);
      if (!profile) return null;

      const appliedSet = row.alreadyApplied ? new Set([row.userId]) : new Set();
      const invitedSet = row.alreadyInvited ? new Set([row.userId]) : new Set();

      const candidate = buildCandidateOutput({
        profile,
        taskTechnologyIdSet,
        appliedSet,
        invitedSet,
      });

      return {
        ...candidate,
        score: Number(row.score),
      };
    })
    .filter(Boolean);
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
  const { items, total } = await getTaskCandidates({
    userId,
    taskId,
    page: 1,
    size: limit,
    excludeApplied: true,
    excludeInvited: true,
  });

  return {
    items,
    total,
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
  const skip = (page - 1) * size;

  const task = await getTaskForCandidates({ userId, taskId });
  const taskTechnologyIds = task.technologies.map((tt) => tt.technologyId);

  const rankedCte = buildRankedCandidatesCte({
    taskId,
    taskTechnologyIds,
    acceptedDeveloperUserId: task.acceptedApplication?.developerUserId ?? null,
    search,
    availability,
    experienceLevel,
    minRating,
    excludeApplied,
    excludeInvited,
  });

  const [pagedRanked, totalRows] = await Promise.all([
    prisma.$queryRaw(Prisma.sql`
      ${rankedCte}
      SELECT
        "userId",
        "alreadyApplied",
        "alreadyInvited",
        ROUND("score"::numeric, 2)::float AS "score"
      FROM ranked
      ORDER BY
        "score" DESC,
        "avgRating" DESC,
        "reviewsCount" DESC,
        "displayName" ASC
      OFFSET ${skip}
      LIMIT ${size}
    `),
    prisma.$queryRaw(Prisma.sql`
      ${rankedCte}
      SELECT COUNT(*)::int AS total
      FROM ranked
    `),
  ]);

  const rankedRows = pagedRanked;
  const total = totalRows[0]?.total ?? 0;

  const items = await buildCandidatesFromRankedRows({ rankedRows, taskTechnologyIds });

  // Cache total only for the default (unfiltered) listing to avoid mixed totals across filters
  if (
    !search &&
    !availability &&
    !experienceLevel &&
    (minRating === undefined || minRating === null) &&
    !excludeInvited &&
    !excludeApplied
  ) {
    const cachedTotal = await getCachedCandidateCount(taskId);
    if (cachedTotal === null || cachedTotal !== total) {
      await setCachedCandidateCount(taskId, total);
    }
  }

  return {
    items,
    page,
    size,
    total,
  };
}
