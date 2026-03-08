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
  },
  chatMessage: {
    create: jest.fn(),
  },
  chatThreadRead: {
    upsert: jest.fn(),
  },
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

describe('tasks.service - Task Details & Applications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe('getTaskById', () => {
    test('rejects missing task', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(tasksService.getTaskById({ taskId: 't1' })).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted task', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        deletedAt: new Date(),
        status: 'DELETED',
      });

      await expect(tasksService.getTaskById({ taskId: 't1' })).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects non-public task without auth', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'PUBLIC',
        deletedAt: null,
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(tasksService.getTaskById({ taskId: 't1' })).rejects.toMatchObject({
        status: 401,
        code: 'AUTH_REQUIRED',
      });
    });

    test('rejects non-owner access to non-public task', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'UNLISTED',
        deletedAt: null,
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(
        tasksService.getTaskById({ taskId: 't1', userId: 'u2', persona: 'company' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('rejects owner access without persona', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'UNLISTED',
        deletedAt: null,
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(tasksService.getTaskById({ taskId: 't1', userId: 'u1' })).rejects.toMatchObject({
        status: 400,
        code: 'PERSONA_REQUIRED',
      });
    });

    test('rejects owner access with invalid persona', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'UNLISTED',
        deletedAt: null,
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(
        tasksService.getTaskById({ taskId: 't1', userId: 'u1', persona: 'admin' })
      ).rejects.toMatchObject({
        status: 400,
        code: 'PERSONA_INVALID',
      });
    });

    test('rejects owner access with developer persona for non-public task', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'UNLISTED',
        deletedAt: null,
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(
        tasksService.getTaskById({ taskId: 't1', userId: 'u1', persona: 'developer' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
    });

    test('rejects owner access when company profile is missing for non-public task', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'UNLISTED',
        deletedAt: null,
        owner: { companyProfile: null },
      });

      await expect(
        tasksService.getTaskById({ taskId: 't1', userId: 'u1', persona: 'company' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
    });

    test('returns public task details', async () => {
      const task = {
        id: 't1',
        ownerUserId: 'u1',
        status: 'PUBLISHED',
        project: { id: 'p1', title: 'TeamUp MVP' },
        title: 'Add filtering to tasks catalog',
        description: 'Implement filters + pagination.',
        category: 'BACKEND',
        type: 'EXPERIENCE',
        difficulty: 'JUNIOR',
        technologies: [],
        estimatedEffortHours: 6,
        expectedDuration: 'DAYS_8_14',
        communicationLanguage: 'EN',
        timezonePreference: 'Europe/Any',
        applicationDeadline: new Date('2026-02-20'),
        visibility: 'PUBLIC',
        deliverables: 'PR with code + tests',
        requirements: 'REST + pagination',
        niceToHave: 'OpenAPI',
        acceptedApplicationId: null,
        acceptedApplication: null,
        createdAt: new Date('2026-02-14T13:00:00Z'),
        publishedAt: new Date('2026-02-14T13:20:00Z'),
        deletedAt: null,
        owner: {
          companyProfile: {
            companyName: 'TeamUp Studio',
            verified: false,
            avgRating: 4.6,
            reviewsCount: 8,
          },
        },
      };

      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.application.count.mockResolvedValue(0);

      const result = await tasksService.getTaskById({ taskId: 't1' });

      expect(result).toEqual({
        task_id: 't1',
        owner_user_id: 'u1',
        status: 'PUBLISHED',
        project: { project_id: 'p1', title: 'TeamUp MVP' },
        title: 'Add filtering to tasks catalog',
        description: 'Implement filters + pagination.',
        category: 'BACKEND',
        type: 'EXPERIENCE',
        difficulty: 'JUNIOR',
        technologies: [],
        estimated_effort_hours: 6,
        expected_duration: 'DAYS_8_14',
        communication_language: 'EN',
        timezone_preference: 'Europe/Any',
        application_deadline: '2026-02-20',
        visibility: 'PUBLIC',
        deliverables: 'PR with code + tests',
        requirements: 'REST + pagination',
        nice_to_have: 'OpenAPI',
        created_at: new Date('2026-02-14T13:00:00Z').toISOString(),
        published_at: new Date('2026-02-14T13:20:00Z').toISOString(),
        accepted_application_id: null,
        deleted_at: null,
        applications_count: 0,
        can_apply: false,
        is_owner: false,
        is_accepted_developer: false,
        company: {
          user_id: 'u1',
          company_name: 'TeamUp Studio',
          verified: false,
          avg_rating: 4.6,
          reviews_count: 8,
        },
      });
    });

    test('returns can_apply true for eligible developer', async () => {
      const task = {
        id: 't1',
        ownerUserId: 'u1',
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        project: null,
        title: 'Task title',
        description: 'Task description',
        category: 'BACKEND',
        type: 'EXPERIENCE',
        difficulty: 'JUNIOR',

        estimatedEffortHours: 6,
        expectedDuration: 'DAYS_8_14',
        communicationLanguage: 'EN',
        timezonePreference: 'Europe/Any',
        applicationDeadline: new Date('2026-02-20'),
        deliverables: 'PR with code + tests',
        requirements: 'REST + pagination',
        niceToHave: 'OpenAPI',
        acceptedApplicationId: null,
        acceptedApplication: null,
        createdAt: new Date('2026-02-14T13:00:00Z'),
        publishedAt: new Date('2026-02-14T13:20:00Z'),
        deletedAt: null,
        owner: {
          companyProfile: {
            companyName: 'TeamUp Studio',
            verified: false,
            avgRating: 4.6,
            reviewsCount: 8,
          },
        },
      };

      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.application.count.mockResolvedValue(0);
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u2' });
      prismaMock.application.findFirst.mockResolvedValue(null);

      const result = await tasksService.getTaskById({
        taskId: 't1',
        userId: 'u2',
        persona: 'developer',
      });

      expect(result).toMatchObject({
        can_apply: true,
        is_owner: false,
        is_accepted_developer: false,
        applications_count: 0,
      });
    });

    test('returns can_apply false when developer already applied', async () => {
      const task = {
        id: 't1',
        ownerUserId: 'u1',
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        project: null,
        title: 'Task title',
        description: 'Task description',
        category: 'BACKEND',
        type: 'EXPERIENCE',
        difficulty: 'JUNIOR',

        estimatedEffortHours: 6,
        expectedDuration: 'DAYS_8_14',
        communicationLanguage: 'EN',
        timezonePreference: 'Europe/Any',
        applicationDeadline: new Date('2026-02-20'),
        deliverables: 'PR with code + tests',
        requirements: 'REST + pagination',
        niceToHave: 'OpenAPI',
        acceptedApplicationId: null,
        acceptedApplication: null,
        createdAt: new Date('2026-02-14T13:00:00Z'),
        publishedAt: new Date('2026-02-14T13:20:00Z'),
        deletedAt: null,
        owner: {
          companyProfile: {
            companyName: 'TeamUp Studio',
            verified: false,
            avgRating: 4.6,
            reviewsCount: 8,
          },
        },
      };

      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.application.count.mockResolvedValue(1);
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u2' });
      prismaMock.application.findFirst.mockResolvedValue({ id: 'a1' });

      const result = await tasksService.getTaskById({
        taskId: 't1',
        userId: 'u2',
        persona: 'developer',
      });

      expect(result).toMatchObject({
        can_apply: false,
        is_owner: false,
        applications_count: 1,
      });
    });

    test('returns is_accepted_developer true for accepted developer', async () => {
      const task = {
        id: 't1',
        ownerUserId: 'u1',
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        project: null,
        title: 'Task title',
        description: 'Task description',
        category: 'BACKEND',
        type: 'EXPERIENCE',
        difficulty: 'JUNIOR',

        estimatedEffortHours: 6,
        expectedDuration: 'DAYS_8_14',
        communicationLanguage: 'EN',
        timezonePreference: 'Europe/Any',
        applicationDeadline: new Date('2026-02-20'),
        deliverables: 'PR with code + tests',
        requirements: 'REST + pagination',
        niceToHave: 'OpenAPI',
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
        createdAt: new Date('2026-02-14T13:00:00Z'),
        publishedAt: new Date('2026-02-14T13:20:00Z'),
        deletedAt: null,
        owner: {
          companyProfile: {
            companyName: 'TeamUp Studio',
            verified: false,
            avgRating: 4.6,
            reviewsCount: 8,
          },
        },
      };

      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.application.count.mockResolvedValue(1);

      const result = await tasksService.getTaskById({ taskId: 't1', userId: 'u2' });

      expect(result).toMatchObject({
        is_accepted_developer: true,
        can_apply: false,
        applications_count: 1,
      });
    });
  });

  describe('getTaskApplications', () => {
    test('returns applications with developer avatar', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        deletedAt: null,
      });

      prismaMock.application.findMany.mockResolvedValue([
        {
          id: 'a1',
          status: 'APPLIED',
          message: 'Message',
          proposedPlan: 'Plan',
          availabilityNote: 'Evenings',
          createdAt: new Date('2026-02-14T12:00:00Z'),
          developer: {
            id: 'dev1',
            developerProfile: {
              displayName: 'Tetiana',
              jobTitle: 'Java Backend Engineer',
              avatarUrl: 'https://cdn.example.com/dev-avatar.webp',
              avgRating: 4.6,
              reviewsCount: 3,
            },
          },
        },
      ]);
      prismaMock.application.count.mockResolvedValue(1);

      const result = await tasksService.getTaskApplications({
        userId: 'u1',
        taskId: 't1',
        page: 1,
        size: 20,
      });

      expect(result).toEqual({
        items: [
          {
            application_id: 'a1',
            status: 'APPLIED',
            message: 'Message',
            proposed_plan: 'Plan',
            availability_note: 'Evenings',
            created_at: new Date('2026-02-14T12:00:00Z').toISOString(),
            developer: {
              user_id: 'dev1',
              display_name: 'Tetiana',
              primary_role: 'Java Backend Engineer',
              avatar_url: 'https://cdn.example.com/dev-avatar.webp',
              avg_rating: 4.6,
              reviews_count: 3,
            },
          },
        ],
        page: 1,
        size: 20,
        total: 1,
      });
    });
  });
});
