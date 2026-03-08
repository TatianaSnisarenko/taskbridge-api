import { jest } from '@jest/globals';

describe('service barrel index exports', () => {
  test('loads service index modules and exposes functions', async () => {
    jest.resetModules();

    jest.unstable_mockModule('../../src/db/prisma.js', () => ({
      prisma: {
        $transaction: jest.fn(),
        developerProfile: { findUnique: jest.fn() },
        companyProfile: { findUnique: jest.fn() },
        task: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
        project: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
        application: { findMany: jest.fn(), count: jest.fn() },
        invite: { findMany: jest.fn(), count: jest.fn() },
        notification: {
          findMany: jest.fn(),
          count: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
        chatThread: { findMany: jest.fn(), findUnique: jest.fn() },
        chatMessage: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
        chatThreadRead: { upsert: jest.fn() },
      },
    }));

    const invites = await import('../../../src/services/invites/index.js');
    const me = await import('../../../src/services/me/index.js');
    const projects = await import('../../../src/services/projects/index.js');
    const tasks = await import('../../../src/services/tasks/index.js');
    const taskWorkflows = await import('../../../src/services/tasks/workflows/index.js');
    const profiles = await import('../../../src/services/profiles/index.js');

    expect(invites.createTaskInvite).toEqual(expect.any(Function));
    expect(invites.getTaskInvites).toEqual(expect.any(Function));
    expect(invites.getMyInvites).toEqual(expect.any(Function));
    expect(invites.acceptInvite).toEqual(expect.any(Function));

    expect(me.getMyApplications).toEqual(expect.any(Function));
    expect(me.getMyTasks).toEqual(expect.any(Function));
    expect(me.getMyProjects).toEqual(expect.any(Function));
    expect(me.getMyNotifications).toEqual(expect.any(Function));

    expect(projects.createProject).toEqual(expect.any(Function));
    expect(projects.getProjects).toEqual(expect.any(Function));
    expect(projects.reportProject).toEqual(expect.any(Function));

    expect(tasks.createTaskDraft).toEqual(expect.any(Function));
    expect(tasks.getTaskById).toEqual(expect.any(Function));
    expect(tasks.acceptApplication).toEqual(expect.any(Function));
    expect(tasks.getTaskCandidates).toEqual(expect.any(Function));

    expect(taskWorkflows.applyToTask).toEqual(expect.any(Function));
    expect(taskWorkflows.rejectTaskCompletion).toEqual(expect.any(Function));
    expect(taskWorkflows.createReview).toEqual(expect.any(Function));

    expect(profiles.createDeveloperProfile).toEqual(expect.any(Function));
    expect(profiles.createCompanyProfile).toEqual(expect.any(Function));
    expect(profiles.getUserReviews).toEqual(expect.any(Function));
  });
});
