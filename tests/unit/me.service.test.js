import { jest } from '@jest/globals';

const prismaMock = {
  developerProfile: {
    findUnique: jest.fn(),
  },
  task: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  application: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const meService = await import('../../src/services/me.service.js');

describe('me.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getMyTasks rejects when developer profile is missing', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue(null);

    await expect(meService.getMyTasks({ userId: 'u1', page: 1, size: 20 })).rejects.toMatchObject({
      status: 403,
      code: 'PERSONA_NOT_AVAILABLE',
    });
  });

  test('getMyTasks returns tasks with default status filter', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });

    const publishedAt = new Date('2026-02-10T10:00:00Z');
    const completedAt = new Date('2026-02-12T10:00:00Z');

    prismaMock.task.findMany.mockResolvedValue([
      {
        id: 't1',
        title: 'Task A',
        status: 'COMPLETED',
        publishedAt,
        completedAt,
        project: { id: 'p1', title: 'Project' },
        ownerUserId: 'c1',
        owner: {
          companyProfile: {
            companyName: 'Company',
            verified: false,
            avgRating: 4.6,
            reviewsCount: 3,
          },
        },
      },
    ]);
    prismaMock.task.count.mockResolvedValue(1);

    const result = await meService.getMyTasks({ userId: 'u1', page: 1, size: 20 });

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['IN_PROGRESS', 'COMPLETION_REQUESTED', 'COMPLETED'] },
        }),
        orderBy: { updatedAt: 'desc' },
      })
    );

    expect(result).toEqual({
      items: [
        {
          task_id: 't1',
          title: 'Task A',
          status: 'COMPLETED',
          published_at: publishedAt.toISOString(),
          completed_at: completedAt.toISOString(),
          project: { project_id: 'p1', title: 'Project' },
          company: {
            user_id: 'c1',
            company_name: 'Company',
            verified: false,
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

  test('getMyTasks applies status filter when provided', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
    prismaMock.task.findMany.mockResolvedValue([]);
    prismaMock.task.count.mockResolvedValue(0);

    await meService.getMyTasks({ userId: 'u1', page: 1, size: 20, status: 'IN_PROGRESS' });

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'IN_PROGRESS',
        }),
      })
    );
  });

  test('getMyProjects rejects when developer profile is missing', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue(null);

    await expect(
      meService.getMyProjects({ userId: 'u1', persona: 'developer', page: 1, size: 20 })
    ).rejects.toMatchObject({
      status: 403,
      code: 'PERSONA_NOT_AVAILABLE',
    });
  });

  test('getMyProjects returns worked projects for developer persona', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });

    const createdAt = new Date('2026-02-10T10:00:00Z');
    const updatedAt = new Date('2026-02-11T10:00:00Z');

    prismaMock.project.findMany.mockResolvedValue([
      {
        id: 'p1',
        ownerUserId: 'c1',
        title: 'Archived Project',
        shortDescription: 'Archived short',
        status: 'ARCHIVED',
        visibility: 'PUBLIC',
        maxTalents: 8,
        createdAt,
        updatedAt,
        owner: {
          id: 'c1',
          companyProfile: {
            companyName: 'Company',
            verified: false,
            avgRating: 4.2,
            reviewsCount: 5,
          },
        },
      },
    ]);
    prismaMock.project.count.mockResolvedValue(1);

    const result = await meService.getMyProjects({
      userId: 'u1',
      persona: 'developer',
      page: 1,
      size: 20,
    });

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          tasks: {
            some: {
              deletedAt: null,
              applications: {
                some: {
                  developerUserId: 'u1',
                  status: 'ACCEPTED',
                },
              },
            },
          },
        }),
        orderBy: { updatedAt: 'desc' },
      })
    );

    expect(result).toEqual({
      items: [
        {
          project_id: 'p1',
          owner_user_id: 'c1',
          title: 'Archived Project',
          short_description: 'Archived short',
          status: 'ARCHIVED',
          visibility: 'PUBLIC',
          max_talents: 8,
          created_at: createdAt.toISOString(),
          updated_at: updatedAt.toISOString(),
          company: {
            user_id: 'c1',
            company_name: 'Company',
            verified: false,
            avg_rating: 4.2,
            reviews_count: 5,
          },
        },
      ],
      page: 1,
      size: 20,
      total: 1,
    });
  });

  test('getMyProjects rejects non-developer persona', async () => {
    await expect(
      meService.getMyProjects({ userId: 'c1', persona: 'company', page: 1, size: 20 })
    ).rejects.toMatchObject({
      status: 403,
      code: 'PERSONA_NOT_AVAILABLE',
    });
  });

  describe('getMyApplications', () => {
    test('rejects when developer profile is missing', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue(null);

      await expect(
        meService.getMyApplications({ userId: 'u1', page: 1, size: 20 })
      ).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
    });

    test('returns paginated applications with task and company info', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });

      const createdAt = new Date('2026-02-15T10:00:00Z');

      prismaMock.application.findMany.mockResolvedValue([
        {
          id: 'app1',
          status: 'PENDING',
          createdAt,
          task: {
            id: 't1',
            title: 'Backend Developer',
            status: 'PUBLISHED',
            project: {
              id: 'p1',
              title: 'E-commerce Platform',
            },
            owner: {
              id: 'c1',
              companyProfile: {
                companyName: 'Tech Corp',
              },
            },
          },
        },
      ]);
      prismaMock.application.count.mockResolvedValue(25);

      const result = await meService.getMyApplications({
        userId: 'u1',
        page: 2,
        size: 10,
      });

      expect(result.page).toBe(2);
      expect(result.size).toBe(10);
      expect(result.total).toBe(25);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        application_id: 'app1',
        status: 'PENDING',
        created_at: createdAt.toISOString(),
        task: {
          task_id: 't1',
          title: 'Backend Developer',
          status: 'PUBLISHED',
          project: {
            project_id: 'p1',
            title: 'E-commerce Platform',
          },
        },
        company: {
          user_id: 'c1',
          company_name: 'Tech Corp',
        },
      });
    });

    test('applies pagination correctly', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.application.findMany.mockResolvedValue([]);
      prismaMock.application.count.mockResolvedValue(0);

      const result = await meService.getMyApplications({
        userId: 'u1',
        page: 3,
        size: 15,
      });

      expect(prismaMock.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 30, // (3-1) * 15
          take: 15,
        })
      );
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getMyNotifications', () => {
    test('returns paginated notifications', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');
      const readAt = new Date('2026-02-20T12:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'APPLICATION_ACCEPTED',
          actorUserId: 'u2',
          projectId: 'p1',
          taskId: 't1',
          threadId: null,
          payload: { message: 'Application accepted' },
          createdAt,
          readAt,
          task: { ownerUserId: 'c1' },
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'u2' },
          },
        },
      ]);
      prismaMock.notification.count
        .mockResolvedValueOnce(1) // total count
        .mockResolvedValueOnce(3); // unread count

      const result = await meService.getMyNotifications({
        userId: 'u1',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.size).toBe(20);
      expect(result.unread_total).toBe(3);
      expect(result.items[0]).toEqual({
        id: 'n1',
        type: 'APPLICATION_ACCEPTED',
        actor_user_id: 'u2',
        project_id: 'p1',
        task_id: 't1',
        thread_id: null,
        payload: { message: 'Application accepted' },
        created_at: createdAt.toISOString(),
        read_at: readAt.toISOString(),
      });
    });

    test('filters unread notifications when unreadOnly is true', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValueOnce(0).mockResolvedValueOnce(5);

      await meService.getMyNotifications({
        userId: 'u1',
        persona: 'developer',
        page: 1,
        size: 20,
        unreadOnly: true,
      });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            readAt: null,
          }),
        })
      );
    });

    test('handles null readAt correctly', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'CHAT_MESSAGE',
          actorUserId: 'u2',
          projectId: null,
          taskId: null,
          threadId: 'th1',
          payload: {},
          createdAt,
          readAt: null,
          task: null,
          actor: {
            developerProfile: { userId: 'u2' },
            companyProfile: null,
          },
        },
      ]);
      prismaMock.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      const result = await meService.getMyNotifications({
        userId: 'u1',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.items[0].read_at).toBeNull();
    });
  });
});
