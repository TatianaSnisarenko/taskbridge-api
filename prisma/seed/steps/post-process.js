import { DEMO_MAX_TALENTS_PROJECT_TITLE, MIN_PROJECT_MAX_TALENTS } from '../data/projects-tasks.js';
import { platformReviewTemplates } from '../data/engagement.js';
import { createNotificationIfMissing, pickRandom } from '../lib/utils.js';

export async function ensureDemoSignals(prisma, projects, tasks, companies, developers) {
  let favoritesCreated = 0;
  let invitesCreated = 0;
  let reportsCreated = 0;
  let outboxCreated = 0;

  const publishedTasks = tasks.filter((task) => task.status === 'PUBLISHED').slice(0, 12);

  for (const developer of developers.slice(0, 6)) {
    for (const task of publishedTasks.slice(0, 3)) {
      const existingFavorite = await prisma.taskFavorite.findFirst({
        where: {
          userId: developer.user.id,
          taskId: task.id,
        },
      });

      if (existingFavorite) continue;

      await prisma.taskFavorite.create({
        data: {
          userId: developer.user.id,
          taskId: task.id,
        },
      });
      favoritesCreated++;
    }
  }

  const invitationTargets = developers.slice(0, 4);
  for (const company of companies.slice(0, 3)) {
    for (const developer of invitationTargets) {
      const task = publishedTasks.find((t) => t.ownerUserId === company.user.id);
      if (!task) continue;

      await prisma.taskInvite.upsert({
        where: {
          taskId_developerUserId: {
            taskId: task.id,
            developerUserId: developer.user.id,
          },
        },
        update: {
          status: 'PENDING',
          message:
            'We think your profile is a strong fit for this task. Would you like to collaborate?',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        create: {
          taskId: task.id,
          companyUserId: company.user.id,
          developerUserId: developer.user.id,
          status: 'PENDING',
          message:
            'We think your profile is a strong fit for this task. Would you like to collaborate?',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      invitesCreated++;
    }
  }

  const reportProject = projects[0];
  const reportTask = publishedTasks[0];
  if (reportProject && reportTask && developers[0] && companies[0]) {
    await prisma.projectReport.upsert({
      where: {
        projectId_reporterUserId: {
          projectId: reportProject.id,
          reporterUserId: developers[0].user.id,
        },
      },
      update: {
        reason: 'MISLEADING',
        comment: 'Scope description looks outdated compared to current acceptance criteria.',
      },
      create: {
        projectId: reportProject.id,
        reporterUserId: developers[0].user.id,
        reporterPersona: 'developer',
        reason: 'MISLEADING',
        comment: 'Scope description looks outdated compared to current acceptance criteria.',
      },
    });
    reportsCreated++;

    await prisma.taskReport.upsert({
      where: {
        taskId_reporterUserId: {
          taskId: reportTask.id,
          reporterUserId: companies[0].user.id,
        },
      },
      update: {
        reason: 'OTHER',
        comment: 'Demo report for moderation queue visibility.',
      },
      create: {
        taskId: reportTask.id,
        reporterUserId: companies[0].user.id,
        reporterPersona: 'company',
        reason: 'OTHER',
        comment: 'Demo report for moderation queue visibility.',
      },
    });
    reportsCreated++;
  }

  for (const company of companies.slice(0, 3)) {
    const to = `ops+${company.user.id.slice(0, 8)}@example.com`;
    const existingOutbox = await prisma.emailOutbox.findFirst({
      where: {
        to,
        subject: 'Weekly collaboration summary',
      },
    });

    if (existingOutbox) continue;

    await prisma.emailOutbox.create({
      data: {
        to,
        subject: 'Weekly collaboration summary',
        text: 'Seed demo email. This record exists to showcase outbox queue states and moderation workflows.',
        status: 'PENDING',
        attempts: 0,
        maxAttempts: 8,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });
    outboxCreated++;
  }

  console.log(`Task favorites ensured: ${favoritesCreated}`);
  console.log(`Task invites ensured: ${invitesCreated}`);
  console.log(`Content reports ensured: ${reportsCreated}`);
  console.log(`Email outbox records ensured: ${outboxCreated}`);
}

export async function ensureArchivedProjectDemo(prisma, companies) {
  const demoOwner = companies[0]?.user;
  if (!demoOwner) return null;

  const demoDescription =
    'Deterministic project for demo scenarios where archived status is triggered by reaching max talents limit.';

  let demoProject = await prisma.project.findFirst({
    where: {
      ownerUserId: demoOwner.id,
      title: DEMO_MAX_TALENTS_PROJECT_TITLE,
    },
  });

  if (!demoProject) {
    demoProject = await prisma.project.create({
      data: {
        ownerUserId: demoOwner.id,
        title: DEMO_MAX_TALENTS_PROJECT_TITLE,
        shortDescription: 'Demo project archived after reaching max talents limit',
        description: demoDescription,
        maxTalents: 3,
        visibility: 'PUBLIC',
        status: 'ARCHIVED',
        publishedTasksCount: 0,
      },
    });
  }

  const demoTaskTemplates = [
    {
      title: 'Seed Demo: Delivered backend MVP',
      status: 'COMPLETED',
      completedAt: new Date('2026-03-01T09:00:00.000Z'),
      failedAt: null,
    },
    {
      title: 'Seed Demo: Finished frontend integration',
      status: 'COMPLETED',
      completedAt: new Date('2026-03-02T09:00:00.000Z'),
      failedAt: null,
    },
    {
      title: 'Seed Demo: Cancelled analytics rollout',
      status: 'FAILED',
      completedAt: null,
      failedAt: new Date('2026-03-03T09:00:00.000Z'),
    },
  ];

  for (const template of demoTaskTemplates) {
    const existingTask = await prisma.task.findFirst({
      where: {
        projectId: demoProject.id,
        title: template.title,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingTask) continue;

    await prisma.task.create({
      data: {
        ownerUserId: demoOwner.id,
        projectId: demoProject.id,
        title: template.title,
        description: 'Seed demo task for archived project scenario.',
        category: 'BACKEND',
        type: 'VOLUNTEER',
        difficulty: 'MIDDLE',
        communicationLanguage: 'English',
        visibility: 'PUBLIC',
        status: template.status,
        completedAt: template.completedAt,
        failedAt: template.failedAt,
      },
    });
  }

  await createNotificationIfMissing(prisma, {
    userId: demoOwner.id,
    actorUserId: null,
    projectId: demoProject.id,
    taskId: null,
    type: 'PROJECT_ARCHIVED_LIMIT_REACHED',
    payload: {
      project_id: demoProject.id,
      project_title: demoProject.title,
      max_talents: 3,
      completed_count: 2,
      failed_count: 1,
    },
  });

  return demoProject;
}

export async function reconcileProjectCounters(prisma, projects) {
  let reconciledCount = 0;

  for (const project of projects) {
    const [freshProject, taskGroups] = await Promise.all([
      prisma.project.findUnique({
        where: { id: project.id },
        select: {
          id: true,
          title: true,
          maxTalents: true,
          publishedTasksCount: true,
        },
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: {
          projectId: project.id,
          deletedAt: null,
        },
        _count: { _all: true },
      }),
    ]);

    if (!freshProject) continue;
    if (freshProject.title === DEMO_MAX_TALENTS_PROJECT_TITLE) continue;

    const countByStatus = Object.fromEntries(taskGroups.map((g) => [g.status, g._count._all]));
    const publishedCount = countByStatus.PUBLISHED ?? 0;
    const completedCount = countByStatus.COMPLETED ?? 0;
    const failedCount = countByStatus.FAILED ?? 0;
    const usedTalents = completedCount + failedCount;

    const desiredMaxTalents = Math.max(
      freshProject.maxTalents,
      MIN_PROJECT_MAX_TALENTS,
      usedTalents,
      publishedCount
    );

    const updateData = {};
    if (freshProject.maxTalents !== desiredMaxTalents) updateData.maxTalents = desiredMaxTalents;
    if (freshProject.publishedTasksCount !== publishedCount) {
      updateData.publishedTasksCount = publishedCount;
    }

    if (Object.keys(updateData).length === 0) continue;

    await prisma.project.update({
      where: { id: project.id },
      data: updateData,
    });
    reconciledCount++;
  }

  console.log(`Projects reconciled: ${reconciledCount}`);
}

export async function updateProfileStats(prisma, developers, companies) {
  for (const developer of developers) {
    const reviews = await prisma.review.findMany({
      where: { targetUserId: developer.user.id },
      select: { rating: true },
    });

    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
        : '0.0';

    await prisma.developerProfile.update({
      where: { userId: developer.user.id },
      data: {
        avgRating,
        reviewsCount: reviews.length,
      },
    });
  }

  for (const company of companies) {
    const reviews = await prisma.review.findMany({
      where: { targetUserId: company.user.id },
      select: { rating: true },
    });

    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
        : '0.0';

    await prisma.companyProfile.update({
      where: { userId: company.user.id },
      data: {
        avgRating,
        reviewsCount: reviews.length,
      },
    });
  }

  console.log('Profile rating statistics updated');
}

export async function ensurePlatformReviews(prisma, companies, developers) {
  let createdCount = 0;

  for (const company of companies.slice(0, 4)) {
    const templates = pickRandom(platformReviewTemplates.company, 2);

    for (const template of templates) {
      const existing = await prisma.platformReview.findFirst({
        where: {
          userId: company.user.id,
          text: template.text,
        },
      });

      if (existing) continue;

      await prisma.platformReview.create({
        data: {
          userId: company.user.id,
          authorPersona: 'company',
          rating: template.rating,
          text: template.text,
          isApproved: true,
        },
      });
      createdCount++;
    }
  }

  for (const developer of developers.slice(0, 6)) {
    const templates = pickRandom(platformReviewTemplates.developer, 1);

    for (const template of templates) {
      const existing = await prisma.platformReview.findFirst({
        where: {
          userId: developer.user.id,
          text: template.text,
        },
      });

      if (existing) continue;

      await prisma.platformReview.create({
        data: {
          userId: developer.user.id,
          authorPersona: 'developer',
          rating: template.rating,
          text: template.text,
          isApproved: true,
        },
      });
      createdCount++;
    }
  }

  console.log(`Platform reviews ensured: ${createdCount}`);
}
