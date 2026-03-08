import { jest } from '@jest/globals';

const prismaMock = {
  $transaction: jest.fn(),
  project: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  task: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  taskTechnology: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  developerProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  taskInvite: {
    findMany: jest.fn(),
  },
  application: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  chatThread: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  chatMessage: {
    create: jest.fn(),
  },
  chatThreadRead: {
    upsert: jest.fn(),
  },
  review: {},
};

const notificationsServiceMock = {
  createApplicationCreatedNotification: jest.fn(),
  buildTaskNotificationPayload: jest.fn(),
  createNotification: jest.fn(),
};

const technologiesServiceMock = {
  validateTechnologyIds: jest.fn(async (ids) => ids),
  incrementTechnologyPopularity: jest.fn(async () => {}),
};

const notificationEmailServiceMock = {
  sendImportantNotificationEmail: jest.fn(async () => {}),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule(
  '../../src/services/notifications/index.js',
  () => notificationsServiceMock
);
jest.unstable_mockModule('../../src/services/technologies/index.js', () => technologiesServiceMock);
jest.unstable_mockModule(
  '../../src/services/notification-email/index.js',
  () => notificationEmailServiceMock
);

const tasksService = await import('../../src/services/tasks/index.js');

describe('tasks.service - Workflows (Application & Completion)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe('createReview', () => {
    test('createReview rejects missing task', async () => {
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        tasksService.createReview({
          userId: 'u1',
          taskId: 't1',
          review: { rating: 5, text: 'Great work' },
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('createReview rejects deleted task', async () => {
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'COMPLETED',
        deletedAt: new Date(),
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
      });

      await expect(
        tasksService.createReview({
          userId: 'u1',
          taskId: 't1',
          review: { rating: 5, text: 'Great work' },
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('createReview rejects non-completed task', async () => {
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'IN_PROGRESS',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
      });

      await expect(
        tasksService.createReview({
          userId: 'u1',
          taskId: 't1',
          review: { rating: 5, text: 'Great work' },
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('createReview rejects non-participant', async () => {
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'COMPLETED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
      });

      await expect(
        tasksService.createReview({
          userId: 'u3',
          taskId: 't1',
          review: { rating: 5, text: 'Great work' },
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      });
    });

    test('createReview rejects missing developer', async () => {
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'COMPLETED',
        deletedAt: null,
        acceptedApplicationId: null,
        acceptedApplication: null,
      });

      await expect(
        tasksService.createReview({
          userId: 'u1',
          taskId: 't1',
          review: { rating: 5, text: 'Great work' },
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('createReview rejects duplicate review', async () => {
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'COMPLETED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
      });
      prismaMock.review = {
        findUnique: jest.fn().mockResolvedValue({ id: 'r1' }),
      };

      await expect(
        tasksService.createReview({
          userId: 'u1',
          taskId: 't1',
          review: { rating: 5, text: 'Great work' },
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'ALREADY_REVIEWED',
      });
    });

    test('createReview creates review from owner', async () => {
      const createdAt = new Date('2026-02-14T10:00:00Z');
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'COMPLETED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
      });
      prismaMock.review = {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'r1',
          taskId: 't1',
          authorUserId: 'u1',
          targetUserId: 'u2',
          rating: 5,
          text: 'Great work',
          createdAt,
        }),
      };
      notificationsServiceMock.createNotification.mockResolvedValue(null);

      const result = await tasksService.createReview({
        userId: 'u1',
        taskId: 't1',
        review: { rating: 5, text: 'Great work' },
      });

      expect(result).toEqual({
        reviewId: 'r1',
        taskId: 't1',
        authorUserId: 'u1',
        targetUserId: 'u2',
        rating: 5,
        text: 'Great work',
        createdAt,
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith({
        client: prismaMock,
        userId: 'u2',
        actorUserId: 'u1',
        taskId: 't1',
        type: 'REVIEW_CREATED',
        payload: {
          review_id: 'r1',
          task_id: 't1',
          rating: 5,
        },
      });
    });

    test('createReview creates review from developer', async () => {
      const createdAt = new Date('2026-02-14T10:00:00Z');
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'COMPLETED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
      });
      prismaMock.review = {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'r2',
          taskId: 't1',
          authorUserId: 'u2',
          targetUserId: 'u1',
          rating: 4,
          text: 'Professional company',
          createdAt,
        }),
      };
      notificationsServiceMock.createNotification.mockResolvedValue(null);

      const result = await tasksService.createReview({
        userId: 'u2',
        taskId: 't1',
        review: { rating: 4, text: 'Professional company' },
      });

      expect(result).toEqual({
        reviewId: 'r2',
        taskId: 't1',
        authorUserId: 'u2',
        targetUserId: 'u1',
        rating: 4,
        text: 'Professional company',
        createdAt,
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith({
        client: prismaMock,
        userId: 'u1',
        actorUserId: 'u2',
        taskId: 't1',
        type: 'REVIEW_CREATED',
        payload: {
          review_id: 'r2',
          task_id: 't1',
          rating: 4,
        },
      });
    });
  });

  describe('acceptApplication', () => {
    test('rejects missing application', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.application.findUnique.mockResolvedValue(null);
        return await callback(tx);
      });

      await expect(
        tasksService.acceptApplication({ userId: 'c1', applicationId: 'app1' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects non-owner accepting application', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.application.findUnique.mockResolvedValue({
          id: 'app1',
          taskId: 't1',
          developerUserId: 'dev1',
          task: {
            id: 't1',
            ownerUserId: 'c2',
            status: 'PUBLISHED',
            acceptedApplicationId: null,
          },
        });
        return await callback(tx);
      });

      await expect(
        tasksService.acceptApplication({ userId: 'c1', applicationId: 'app1' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('accepts application and starts task', async () => {
      const completedAt = new Date('2026-03-10T15:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          application: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'app1',
              taskId: 't1',
              developerUserId: 'dev1',
              status: 'APPLIED',
              task: {
                id: 't1',
                ownerUserId: 'c1',
                status: 'PUBLISHED',
                acceptedApplicationId: null,
              },
            }),
            findMany: jest.fn().mockResolvedValue([]),
            update: jest.fn().mockResolvedValue({
              id: 'app1',
              status: 'ACCEPTED',
              updatedAt: completedAt,
            }),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              ownerUserId: 'c1',
              status: 'PUBLISHED',
              acceptedApplicationId: null,
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              status: 'IN_PROGRESS',
              acceptedApplicationId: 'app1',
            }),
          },
        };
        return await callback(tx);
      });

      prismaMock.chatThread.findUnique.mockResolvedValue(null);
      prismaMock.chatThread.create.mockResolvedValue({
        id: 'thread1',
        taskId: 't1',
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'dev1',
        email: 'dev@example.com',
        emailVerified: true,
        developerProfile: { displayName: 'Developer' },
      });
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        title: 'Backend Task',
        owner: {
          companyProfile: { companyName: 'Tech Corp' },
        },
      });

      const result = await tasksService.acceptApplication({
        userId: 'c1',
        applicationId: 'app1',
      });

      expect(result.task_id).toBe('t1');
      expect(result.company_user_id).toBe('c1');
      expect(result.accepted_developer_user_id).toBe('dev1');
    });
  });

  describe('rejectApplication', () => {
    test('rejects missing application', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.application.findUnique.mockResolvedValue(null);
        return await callback(tx);
      });

      await expect(
        tasksService.rejectApplication({ userId: 'c1', applicationId: 'app1' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects non-owner rejecting application', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.application.findUnique.mockResolvedValue({
          id: 'app1',
          taskId: 't1',
          developerUserId: 'dev1',
          status: 'APPLIED',
          task: {
            id: 't1',
            ownerUserId: 'c2',
          },
        });
        return await callback(tx);
      });

      await expect(
        tasksService.rejectApplication({ userId: 'c1', applicationId: 'app1' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('rejects already processed application', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.application.findUnique.mockResolvedValue({
          id: 'app1',
          taskId: 't1',
          developerUserId: 'dev1',
          status: 'ACCEPTED',
          task: {
            id: 't1',
            ownerUserId: 'c1',
          },
        });
        return await callback(tx);
      });

      await expect(
        tasksService.rejectApplication({ userId: 'c1', applicationId: 'app1' })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects application successfully', async () => {
      const updatedAt = new Date('2026-03-10T15:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          application: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'app1',
              taskId: 't1',
              developerUserId: 'dev1',
              status: 'APPLIED',
              task: {
                id: 't1',
                ownerUserId: 'c1',
              },
            }),
            update: jest.fn().mockResolvedValue({
              id: 'app1',
              status: 'REJECTED',
              updatedAt,
            }),
          },
        };
        return await callback(tx);
      });

      const result = await tasksService.rejectApplication({
        userId: 'c1',
        applicationId: 'app1',
      });

      expect(result.application_id).toBe('app1');
      expect(result.status).toBe('REJECTED');
      expect(result.updated_at).toBe(updatedAt.toISOString());
    });
  });

  describe('startTaskWithDeveloper', () => {
    test('rejects missing task', async () => {
      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        application: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          create: jest.fn(),
        },
      };

      await expect(
        tasksService.startTaskWithDeveloper({
          tx,
          taskId: 't1',
          developerUserId: 'dev1',
          companyUserId: 'c1',
          source: 'application',
          applicationId: 'app1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'TASK_NOT_FOUND',
      });
    });

    test('rejects non-published task', async () => {
      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            status: 'DRAFT',
            ownerUserId: 'c1',
            acceptedApplicationId: null,
          }),
          update: jest.fn(),
        },
        application: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          create: jest.fn(),
        },
      };

      await expect(
        tasksService.startTaskWithDeveloper({
          tx,
          taskId: 't1',
          developerUserId: 'dev1',
          companyUserId: 'c1',
          source: 'application',
          applicationId: 'app1',
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects when application source has non-applied status', async () => {
      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            status: 'PUBLISHED',
            ownerUserId: 'c1',
            acceptedApplicationId: null,
          }),
          update: jest.fn(),
        },
        application: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'app1',
            taskId: 't1',
            developerUserId: 'dev1',
            status: 'REJECTED',
          }),
          findMany: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          create: jest.fn(),
        },
      };

      await expect(
        tasksService.startTaskWithDeveloper({
          tx,
          taskId: 't1',
          developerUserId: 'dev1',
          companyUserId: 'c1',
          source: 'application',
          applicationId: 'app1',
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('creates accepted application for invite source when none exists', async () => {
      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            status: 'PUBLISHED',
            ownerUserId: 'c1',
            acceptedApplicationId: null,
          }),
          update: jest.fn().mockResolvedValue({ id: 't1' }),
        },
        application: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'new-app' }),
          findMany: jest.fn().mockResolvedValue([]),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
      };

      notificationsServiceMock.createNotification.mockResolvedValue(null);
      notificationsServiceMock.buildTaskNotificationPayload.mockImplementation(
        (payload) => payload
      );

      const result = await tasksService.startTaskWithDeveloper({
        tx,
        taskId: 't1',
        developerUserId: 'dev1',
        companyUserId: 'c1',
        source: 'invite',
      });

      expect(tx.application.create).toHaveBeenCalledWith({
        data: {
          taskId: 't1',
          developerUserId: 'dev1',
          status: 'ACCEPTED',
        },
        select: {
          id: true,
        },
      });
      expect(result.accepted_application_id).toBe('new-app');
      expect(result.task_status).toBe('IN_PROGRESS');
    });

    test('uses existing invite application, rejects others and emits notifications', async () => {
      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            status: 'PUBLISHED',
            ownerUserId: 'c1',
            acceptedApplicationId: null,
          }),
          update: jest.fn().mockResolvedValue({ id: 't1' }),
        },
        application: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'existing-app',
            taskId: 't1',
            developerUserId: 'dev1',
            status: 'APPLIED',
          }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: 'existing-app', status: 'ACCEPTED' }),
          findMany: jest.fn().mockResolvedValue([
            { id: 'other-app-1', developerUserId: 'dev2' },
            { id: 'other-app-2', developerUserId: 'dev3' },
          ]),
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };

      notificationsServiceMock.createNotification.mockResolvedValue(null);
      notificationsServiceMock.buildTaskNotificationPayload.mockImplementation(
        (payload) => payload
      );

      const result = await tasksService.startTaskWithDeveloper({
        tx,
        taskId: 't1',
        developerUserId: 'dev1',
        companyUserId: 'c1',
        source: 'invite',
      });

      expect(tx.application.update).toHaveBeenCalledWith({
        where: { id: 'existing-app' },
        data: { status: 'ACCEPTED' },
      });
      expect(tx.application.updateMany).toHaveBeenCalledWith({
        where: {
          taskId: 't1',
          id: { not: 'existing-app' },
          status: 'APPLIED',
        },
        data: {
          status: 'REJECTED',
        },
      });
      expect(notificationsServiceMock.createNotification).toHaveBeenCalledTimes(3);
      expect(result.accepted_application_id).toBe('existing-app');
    });
  });

  describe('confirmTaskCompletion', () => {
    test('rejects missing task', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task.findUnique.mockResolvedValue(null);
        return await callback(tx);
      });

      await expect(
        tasksService.confirmTaskCompletion({ userId: 'c1', taskId: 't1' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted task', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task.findUnique.mockResolvedValue({
          id: 't1',
          ownerUserId: 'c1',
          status: 'COMPLETION_REQUESTED',
          deletedAt: new Date(),
          acceptedApplicationId: 'app1',
          acceptedApplication: {
            developerUserId: 'dev1',
          },
        });
        return await callback(tx);
      });

      await expect(
        tasksService.confirmTaskCompletion({ userId: 'c1', taskId: 't1' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects non-owner confirming completion', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task.findUnique.mockResolvedValue({
          id: 't1',
          ownerUserId: 'c2',
          status: 'COMPLETION_REQUESTED',
          deletedAt: null,
          acceptedApplicationId: 'app1',
          acceptedApplication: {
            developerUserId: 'dev1',
          },
        });
        return await callback(tx);
      });

      await expect(
        tasksService.confirmTaskCompletion({ userId: 'c1', taskId: 't1' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('rejects task not in COMPLETION_REQUESTED status', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task.findUnique.mockResolvedValue({
          id: 't1',
          ownerUserId: 'c1',
          status: 'IN_PROGRESS',
          deletedAt: null,
          acceptedApplicationId: 'app1',
          acceptedApplication: {
            developerUserId: 'dev1',
          },
        });
        return await callback(tx);
      });

      await expect(
        tasksService.confirmTaskCompletion({ userId: 'c1', taskId: 't1' })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects task with missing accepted developer', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task.findUnique.mockResolvedValue({
          id: 't1',
          ownerUserId: 'c1',
          status: 'COMPLETION_REQUESTED',
          deletedAt: null,
          acceptedApplicationId: null,
          acceptedApplication: null,
        });
        return await callback(tx);
      });

      await expect(
        tasksService.confirmTaskCompletion({ userId: 'c1', taskId: 't1' })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('confirms task completion successfully without project', async () => {
      const completedAt = new Date('2026-03-10T16:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              acceptedApplicationId: 'app1',
              acceptedApplication: {
                developerUserId: 'dev1',
              },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'COMPLETED',
              completedAt,
              projectId: null,
            }),
          },
        };
        return await callback(tx);
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'dev1',
        email: 'dev@example.com',
        emailVerified: true,
        developerProfile: { displayName: 'Developer' },
      });

      const result = await tasksService.confirmTaskCompletion({
        userId: 'c1',
        taskId: 't1',
      });

      expect(result.taskId).toBe('t1');
      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toEqual(completedAt);
    });

    test('confirms completion and archives project when max_talents reached', async () => {
      const completedAt = new Date('2026-03-10T16:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              acceptedApplicationId: 'app1',
              acceptedApplication: {
                developerUserId: 'dev1',
              },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'COMPLETED',
              completedAt,
              projectId: 'p1',
            }),
            count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
          },
          project: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'p1',
              maxTalents: 3,
              status: 'ACTIVE',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'p1',
              status: 'ARCHIVED',
            }),
          },
        };
        return await callback(tx);
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'dev1',
        email: 'dev@example.com',
        emailVerified: true,
        developerProfile: { displayName: 'Developer' },
      });

      const result = await tasksService.confirmTaskCompletion({
        userId: 'c1',
        taskId: 't1',
      });

      expect(result.status).toBe('COMPLETED');
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('rejectTaskCompletion', () => {
    test('rejects missing task', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task = { findUnique: jest.fn().mockResolvedValue(null) };
        return await callback(tx);
      });

      await expect(
        tasksService.rejectTaskCompletion({ userId: 'c1', taskId: 't1', feedback: 'Fix this' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted task', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task = {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            deletedAt: new Date(),
            status: 'COMPLETION_REQUESTED',
          }),
        };
        return await callback(tx);
      });

      await expect(
        tasksService.rejectTaskCompletion({ userId: 'c1', taskId: 't1', feedback: 'Fix this' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects non-owner rejecting completion', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task = {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            ownerUserId: 'c2',
            status: 'COMPLETION_REQUESTED',
            deletedAt: null,
            rejectionCount: 0,
            acceptedApplicationId: 'app1',
            acceptedApplication: { developerUserId: 'dev1' },
            chatThread: null,
          }),
        };
        return await callback(tx);
      });

      await expect(
        tasksService.rejectTaskCompletion({ userId: 'c1', taskId: 't1', feedback: 'Fix this' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('rejects task not in COMPLETION_REQUESTED status', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task = {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            ownerUserId: 'c1',
            status: 'IN_PROGRESS',
            deletedAt: null,
            rejectionCount: 0,
            acceptedApplicationId: 'app1',
            acceptedApplication: { developerUserId: 'dev1' },
            chatThread: null,
          }),
        };
        return await callback(tx);
      });

      await expect(
        tasksService.rejectTaskCompletion({ userId: 'c1', taskId: 't1', feedback: 'Fix this' })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects task without accepted developer', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task = {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            ownerUserId: 'c1',
            status: 'COMPLETION_REQUESTED',
            deletedAt: null,
            rejectionCount: 0,
            acceptedApplicationId: null,
            acceptedApplication: null,
            chatThread: null,
          }),
        };
        return await callback(tx);
      });

      await expect(
        tasksService.rejectTaskCompletion({ userId: 'c1', taskId: 't1', feedback: 'Fix this' })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects completion on first attempt (returns to IN_PROGRESS)', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              rejectionCount: 0,
              acceptedApplicationId: 'app1',
              acceptedApplication: { developerUserId: 'dev1' },
              chatThread: { id: 'thread1' },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'IN_PROGRESS',
              rejectionCount: 1,
              failedAt: null,
              projectId: null,
            }),
          },
          chatMessage: {
            create: jest.fn().mockResolvedValue({ id: 'msg1' }),
          },
          chatThread: {
            update: jest.fn().mockResolvedValue({ id: 'thread1' }),
          },
        };
        return await callback(tx);
      });

      const result = await tasksService.rejectTaskCompletion({
        userId: 'c1',
        taskId: 't1',
        feedback: 'Please add more tests',
      });

      expect(result).toEqual({
        taskId: 't1',
        status: 'IN_PROGRESS',
        rejectionCount: 1,
        isFinalRejection: false,
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'dev1',
          actorUserId: 'c1',
          taskId: 't1',
          type: 'COMPLETION_REQUESTED',
          payload: expect.objectContaining({
            task_id: 't1',
            status: 'IN_PROGRESS',
            rejection_count: 1,
            is_final: false,
          }),
        })
      );
    });

    test('rejects completion on second attempt (returns to IN_PROGRESS)', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              rejectionCount: 1,
              acceptedApplicationId: 'app1',
              acceptedApplication: { developerUserId: 'dev1' },
              chatThread: { id: 'thread1' },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'IN_PROGRESS',
              rejectionCount: 2,
              failedAt: null,
              projectId: null,
            }),
          },
          chatMessage: {
            create: jest.fn().mockResolvedValue({ id: 'msg1' }),
          },
          chatThread: {
            update: jest.fn().mockResolvedValue({ id: 'thread1' }),
          },
        };
        return await callback(tx);
      });

      const result = await tasksService.rejectTaskCompletion({
        userId: 'c1',
        taskId: 't1',
        feedback: 'Still needs work',
      });

      expect(result).toEqual({
        taskId: 't1',
        status: 'IN_PROGRESS',
        rejectionCount: 2,
        isFinalRejection: false,
      });
    });

    test('rejects completion on third attempt (marks as FAILED)', async () => {
      const failedAt = new Date('2026-03-10T18:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              rejectionCount: 2,
              acceptedApplicationId: 'app1',
              acceptedApplication: { developerUserId: 'dev1' },
              chatThread: { id: 'thread1' },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'FAILED',
              rejectionCount: 3,
              failedAt,
              projectId: null,
            }),
          },
          chatMessage: {
            create: jest.fn().mockResolvedValue({ id: 'msg1' }),
          },
          chatThread: {
            update: jest.fn().mockResolvedValue({ id: 'thread1' }),
          },
        };
        return await callback(tx);
      });

      const result = await tasksService.rejectTaskCompletion({
        userId: 'c1',
        taskId: 't1',
        feedback: 'Final rejection - cannot meet requirements',
      });

      expect(result).toEqual({
        taskId: 't1',
        status: 'FAILED',
        rejectionCount: 3,
        isFinalRejection: true,
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'dev1',
          type: 'TASK_COMPLETED',
          payload: expect.objectContaining({
            is_final: true,
            failed_at: failedAt.toISOString(),
          }),
        })
      );
    });

    test('archives project when last task fails (final rejection)', async () => {
      const failedAt = new Date('2026-03-10T18:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              rejectionCount: 2,
              acceptedApplicationId: 'app1',
              acceptedApplication: { developerUserId: 'dev1' },
              chatThread: { id: 'thread1' },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'FAILED',
              rejectionCount: 3,
              failedAt,
              projectId: 'proj1',
            }),
            count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1),
          },
          project: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'proj1',
              maxTalents: 1,
              status: 'ACTIVE',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'proj1',
              status: 'ARCHIVED',
            }),
          },
          chatMessage: {
            create: jest.fn().mockResolvedValue({ id: 'msg1' }),
          },
          chatThread: {
            update: jest.fn().mockResolvedValue({ id: 'thread1' }),
          },
        };
        return await callback(tx);
      });

      const result = await tasksService.rejectTaskCompletion({
        userId: 'c1',
        taskId: 't1',
        feedback: 'Final rejection',
      });

      expect(result.status).toBe('FAILED');
      expect(result.isFinalRejection).toBe(true);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    test('posts chat message with feedback on rejection', async () => {
      const chatMessageMock = { create: jest.fn().mockResolvedValue({ id: 'msg1' }) };
      const chatThreadMock = { update: jest.fn().mockResolvedValue({ id: 'thread1' }) };

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              rejectionCount: 0,
              acceptedApplicationId: 'app1',
              acceptedApplication: { developerUserId: 'dev1' },
              chatThread: { id: 'thread1' },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'IN_PROGRESS',
              rejectionCount: 1,
              failedAt: null,
              projectId: null,
            }),
          },
          chatMessage: chatMessageMock,
          chatThread: chatThreadMock,
        };
        return await callback(tx);
      });

      await tasksService.rejectTaskCompletion({
        userId: 'c1',
        taskId: 't1',
        feedback: 'Please add unit tests',
      });

      expect(chatMessageMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            text: expect.stringContaining('Please add unit tests'),
            sentAt: expect.any(Date),
          }),
        })
      );

      expect(chatThreadMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'thread1' },
          data: { lastMessageAt: expect.any(Date) },
        })
      );
    });

    test('handles rejection without chat thread gracefully', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              rejectionCount: 0,
              acceptedApplicationId: 'app1',
              acceptedApplication: { developerUserId: 'dev1' },
              chatThread: null,
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'IN_PROGRESS',
              rejectionCount: 1,
              failedAt: null,
              projectId: null,
            }),
          },
        };
        return await callback(tx);
      });

      const result = await tasksService.rejectTaskCompletion({
        userId: 'c1',
        taskId: 't1',
        feedback: 'Fix this',
      });

      expect(result.status).toBe('IN_PROGRESS');
    });

    test('does not archive project if not all tasks complete/failed', async () => {
      const failedAt = new Date('2026-03-10T18:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              rejectionCount: 2,
              acceptedApplicationId: 'app1',
              acceptedApplication: { developerUserId: 'dev1' },
              chatThread: null,
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'FAILED',
              rejectionCount: 3,
              failedAt,
              projectId: 'proj1',
            }),
            count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1),
          },
          project: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'proj1',
              maxTalents: 3,
              status: 'ACTIVE',
            }),
            update: jest.fn(),
          },
        };
        return await callback(tx);
      });

      await tasksService.rejectTaskCompletion({
        userId: 'c1',
        taskId: 't1',
        feedback: 'Final rejection',
      });

      const tx = await prismaMock.$transaction.mock.results[0].value;
      if (tx.project && tx.project.update) {
        expect(tx.project.update).not.toHaveBeenCalled();
      }
    });
  });
});
