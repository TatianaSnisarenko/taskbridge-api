import { chatMessages, reviewTexts } from '../data/engagement.js';
import { buildNotificationPayload, createNotificationIfMissing, pickRandom } from '../lib/utils.js';

function pickReviewText(score) {
  if (score >= 5) return pickRandom(reviewTexts.excellent, 1)[0];
  if (score >= 4) return pickRandom(reviewTexts.good, 1)[0];
  return pickRandom(reviewTexts.acceptable, 1)[0];
}

export async function createApplicationsChatsAndReviews(prisma, newlyCreatedTasks, developers) {
  let applicationCount = 0;
  let chatThreadCount = 0;
  let reviewCount = 0;

  for (const task of newlyCreatedTasks) {
    const hasAccepted = await prisma.application.findFirst({
      where: { taskId: task.id, status: 'ACCEPTED' },
      select: { id: true },
    });

    if (hasAccepted) continue;

    const shouldCreateAcceptedApp = Math.random() < 0.7;
    const applicants = pickRandom(developers, Math.floor(Math.random() * 2) + 2);

    for (let i = 0; i < applicants.length; i++) {
      const developer = applicants[i];

      const existingApp = await prisma.application.findFirst({
        where: {
          taskId: task.id,
          developerUserId: developer.user.id,
        },
      });

      if (existingApp) continue;

      const application = await prisma.application.create({
        data: {
          taskId: task.id,
          developerUserId: developer.user.id,
          message:
            'I reviewed the scope and can deliver incrementally with clear updates. I will start with baseline tests and core implementation before polish.',
          proposedPlan:
            i === 0 && shouldCreateAcceptedApp
              ? 'Week 1: architecture + baseline. Week 2: feature implementation + tests. Week 3: stabilization and docs.'
              : null,
          status: i === 0 && shouldCreateAcceptedApp ? 'ACCEPTED' : 'APPLIED',
        },
      });
      applicationCount++;

      await createNotificationIfMissing(prisma, {
        userId: task.ownerUserId,
        actorUserId: developer.user.id,
        taskId: task.id,
        type: 'APPLICATION_CREATED',
        payload: buildNotificationPayload({ taskId: task.id, applicationId: application.id }),
      });

      if (application.status !== 'ACCEPTED') continue;

      await prisma.task.update({
        where: { id: task.id },
        data: {
          acceptedApplicationId: application.id,
          status: 'IN_PROGRESS',
        },
      });

      await createNotificationIfMissing(prisma, {
        userId: developer.user.id,
        actorUserId: task.ownerUserId,
        taskId: task.id,
        type: 'APPLICATION_ACCEPTED',
        payload: buildNotificationPayload({ taskId: task.id, applicationId: application.id }),
      });

      const existingChat = await prisma.chatThread.findUnique({
        where: { taskId: task.id },
      });

      let chatThread = existingChat;
      if (!chatThread) {
        chatThread = await prisma.chatThread.create({
          data: {
            taskId: task.id,
            companyUserId: task.ownerUserId,
            developerUserId: developer.user.id,
            lastMessageAt: new Date(),
          },
        });
        chatThreadCount++;
      }

      const messageCount = Math.floor(Math.random() * 3) + 2;
      for (let j = 0; j < messageCount; j++) {
        const senderIsDev = Math.random() > 0.5;
        const senderId = senderIsDev ? developer.user.id : task.ownerUserId;

        await prisma.chatMessage.create({
          data: {
            threadId: chatThread.id,
            senderUserId: senderId,
            senderPersona: senderIsDev ? 'developer' : 'company',
            text: pickRandom(chatMessages, 1)[0],
          },
        });

        await createNotificationIfMissing(prisma, {
          userId: senderIsDev ? task.ownerUserId : developer.user.id,
          actorUserId: senderId,
          taskId: task.id,
          threadId: chatThread.id,
          type: 'CHAT_MESSAGE',
          payload: buildNotificationPayload({ taskId: task.id, threadId: chatThread.id }),
        });
      }

      await prisma.chatThreadRead.upsert({
        where: {
          threadId_userId: {
            threadId: chatThread.id,
            userId: task.ownerUserId,
          },
        },
        update: { lastReadAt: new Date() },
        create: {
          threadId: chatThread.id,
          userId: task.ownerUserId,
          lastReadAt: new Date(),
        },
      });

      await prisma.chatThreadRead.upsert({
        where: {
          threadId_userId: {
            threadId: chatThread.id,
            userId: developer.user.id,
          },
        },
        update: { lastReadAt: new Date() },
        create: {
          threadId: chatThread.id,
          userId: developer.user.id,
          lastReadAt: new Date(),
        },
      });

      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'COMPLETION_REQUESTED' },
      });

      await createNotificationIfMissing(prisma, {
        userId: task.ownerUserId,
        actorUserId: developer.user.id,
        taskId: task.id,
        type: 'COMPLETION_REQUESTED',
        payload: buildNotificationPayload({ taskId: task.id }),
      });

      const completedAt = new Date();
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          completedAt,
        },
      });

      await createNotificationIfMissing(prisma, {
        userId: developer.user.id,
        actorUserId: task.ownerUserId,
        taskId: task.id,
        type: 'TASK_COMPLETED',
        payload: buildNotificationPayload({
          taskId: task.id,
          completedAt: completedAt.toISOString(),
        }),
      });

      const existingCompanyReview = await prisma.review.findFirst({
        where: {
          taskId: task.id,
          authorUserId: task.ownerUserId,
        },
      });

      if (!existingCompanyReview) {
        const companyRating = pickRandom([4, 5, 5, 4, 5], 1)[0];

        const createdCompanyReview = await prisma.review.create({
          data: {
            taskId: task.id,
            authorUserId: task.ownerUserId,
            targetUserId: developer.user.id,
            rating: companyRating,
            text: pickReviewText(companyRating),
          },
        });
        reviewCount++;

        await createNotificationIfMissing(prisma, {
          userId: developer.user.id,
          actorUserId: task.ownerUserId,
          taskId: task.id,
          type: 'REVIEW_CREATED',
          payload: buildNotificationPayload({
            taskId: task.id,
            reviewId: createdCompanyReview.id,
            rating: companyRating,
          }),
        });
      }

      const existingDeveloperReview = await prisma.review.findFirst({
        where: {
          taskId: task.id,
          authorUserId: developer.user.id,
        },
      });

      if (!existingDeveloperReview) {
        const devRating = pickRandom([4, 5, 4, 5, 5], 1)[0];

        const createdDeveloperReview = await prisma.review.create({
          data: {
            taskId: task.id,
            authorUserId: developer.user.id,
            targetUserId: task.ownerUserId,
            rating: devRating,
            text: pickReviewText(devRating),
          },
        });
        reviewCount++;

        await createNotificationIfMissing(prisma, {
          userId: task.ownerUserId,
          actorUserId: developer.user.id,
          taskId: task.id,
          type: 'REVIEW_CREATED',
          payload: buildNotificationPayload({
            taskId: task.id,
            reviewId: createdDeveloperReview.id,
            rating: devRating,
          }),
        });
      }

      break;
    }
  }

  console.log(`Applications created: ${applicationCount}`);
  console.log(`Chat threads ensured: ${chatThreadCount}`);
  console.log(`Task reviews created: ${reviewCount}`);
}
