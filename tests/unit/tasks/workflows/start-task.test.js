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

const tasksService = await import('../../../../src/services/tasks/index.js');

describe('tasks.service - workflows start task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
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
});
