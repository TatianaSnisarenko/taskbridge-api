import {
  notificationsServiceMock,
  prismaMock,
  resetDisputeMocks,
  tasksService,
} from './dispute-workflow-test-setup.js';

describe('tasks.service - dispute workflow (open/escalate)', () => {
  beforeEach(() => {
    resetDisputeMocks();
  });

  test('openTaskDispute rejects missing task', async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.openTaskDispute({
        userId: 'owner1',
        taskId: 't1',
        reason: 'Developer is inactive for several days',
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('openTaskDispute rejects when user is not owner', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner2',
      status: 'IN_PROGRESS',
      deletedAt: null,
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });

    await expect(
      tasksService.openTaskDispute({
        userId: 'owner1',
        taskId: 't1',
        reason: 'Developer is inactive for several days',
      })
    ).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });

  test('openTaskDispute rejects when accepted developer is missing', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner1',
      status: 'IN_PROGRESS',
      deletedAt: null,
      acceptedApplicationId: null,
      acceptedApplication: null,
    });

    await expect(
      tasksService.openTaskDispute({
        userId: 'owner1',
        taskId: 't1',
        reason: 'Developer is inactive for several days',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('openTaskDispute rejects invalid status transition', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner1',
      status: 'PUBLISHED',
      deletedAt: null,
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });

    await expect(
      tasksService.openTaskDispute({
        userId: 'owner1',
        taskId: 't1',
        reason: 'Developer is inactive for several days',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('openTaskDispute moves task to DISPUTE', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner1',
      status: 'IN_PROGRESS',
      deletedAt: null,
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'DISPUTE',
    });
    prismaMock.taskDispute.create.mockResolvedValue({ id: 'd1' });

    const result = await tasksService.openTaskDispute({
      userId: 'owner1',
      taskId: 't1',
      reason: 'Developer is inactive for several days',
    });

    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { status: 'DISPUTE' },
      select: { id: true, status: true },
    });

    expect(result).toEqual({
      taskId: 't1',
      status: 'DISPUTE',
      disputeId: 'd1',
    });
  });

  test('requestTaskCompletion works from DISPUTE status', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner1',
      status: 'DISPUTE',
      deletedAt: null,
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      title: 'Test Task',
      status: 'COMPLETION_REQUESTED',
      completionRequestExpiresAt: new Date('2026-03-15T12:00:00.000Z'),
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'owner1',
      email: 'owner@example.com',
      emailVerified: true,
      companyProfile: { companyName: 'Test Company' },
    });

    const result = await tasksService.requestTaskCompletion({
      userId: 'dev1',
      taskId: 't1',
    });

    expect(result).toEqual({
      taskId: 't1',
      status: 'COMPLETION_REQUESTED',
      responseDeadlineAt: new Date('2026-03-15T12:00:00.000Z'),
    });
  });

  test('escalateTaskCompletionDispute rejects when task is missing', async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.escalateTaskCompletionDispute({
        userId: 'dev1',
        taskId: 't1',
        reason: 'Escalation reason',
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('escalateTaskCompletionDispute rejects when task status is invalid', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner1',
      status: 'IN_PROGRESS',
      deletedAt: null,
      completionRequestExpiresAt: new Date(Date.now() - 60_000),
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });

    await expect(
      tasksService.escalateTaskCompletionDispute({
        userId: 'dev1',
        taskId: 't1',
        reason: 'Escalation reason',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('escalateTaskCompletionDispute rejects when caller is not accepted developer', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner1',
      status: 'COMPLETION_REQUESTED',
      deletedAt: null,
      completionRequestExpiresAt: new Date(Date.now() - 60_000),
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev2' },
    });

    await expect(
      tasksService.escalateTaskCompletionDispute({
        userId: 'dev1',
        taskId: 't1',
        reason: 'Escalation reason',
      })
    ).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  test('escalateTaskCompletionDispute rejects when company response deadline has not passed', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner1',
      status: 'COMPLETION_REQUESTED',
      deletedAt: null,
      completionRequestExpiresAt: new Date(Date.now() + 60_000),
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });

    await expect(
      tasksService.escalateTaskCompletionDispute({
        userId: 'dev1',
        taskId: 't1',
        reason: 'Company is not responding.',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'COMPLETION_RESPONSE_PENDING',
    });
  });

  test('escalateTaskCompletionDispute fails when dispute already open', async () => {
    const pastDeadline = new Date(Date.now() - 1 * 60 * 1000);

    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'COMPLETION_REQUESTED',
      ownerUserId: 'owner1',
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
      completionRequestExpiresAt: pastDeadline,
      deletedAt: null,
    });
    prismaMock.taskDispute.findFirst.mockResolvedValue({
      id: 'd1',
      status: 'OPEN',
    });

    await expect(
      tasksService.escalateTaskCompletionDispute({
        userId: 'dev1',
        taskId: 't1',
        reason: 'Escalating',
      })
    ).rejects.toMatchObject({
      code: 'DISPUTE_ALREADY_OPEN',
    });
  });

  test('escalateTaskCompletionDispute creates open dispute after deadline', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner1',
      status: 'COMPLETION_REQUESTED',
      deletedAt: null,
      completionRequestExpiresAt: new Date(Date.now() - 60_000),
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });
    prismaMock.task.update.mockResolvedValue({ id: 't1', status: 'DISPUTE' });
    prismaMock.taskDispute.create.mockResolvedValue({ id: 'd2' });

    const result = await tasksService.escalateTaskCompletionDispute({
      userId: 'dev1',
      taskId: 't1',
      reason: 'Company is not responding after completion request.',
    });

    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { status: 'DISPUTE' },
      select: { id: true, status: true },
    });
    expect(prismaMock.taskDispute.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taskId: 't1',
        initiatorUserId: 'dev1',
        initiatorPersona: 'developer',
        sourceStatus: 'COMPLETION_REQUESTED',
        reasonType: 'COMPLETION_NOT_CONFIRMED',
      }),
      select: { id: true },
    });
    expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith({
      client: prismaMock,
      userId: 'owner1',
      actorUserId: 'dev1',
      taskId: 't1',
      type: 'TASK_DISPUTE_OPENED',
      payload: {
        task_id: 't1',
        status: 'DISPUTE',
        reason: 'Company is not responding after completion request.',
      },
    });
    expect(result).toEqual({
      taskId: 't1',
      status: 'DISPUTE',
      disputeId: 'd2',
    });
  });

  test('openTaskDispute fails when no accepted developer', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'IN_PROGRESS',
      ownerUserId: 'owner1',
      acceptedApplicationId: null,
      acceptedApplication: null,
      deletedAt: null,
    });

    await expect(
      tasksService.openTaskDispute({
        userId: 'owner1',
        taskId: 't1',
        reason: 'Not completed',
      })
    ).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
  });

  test('openTaskDispute fails when dispute already open', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'IN_PROGRESS',
      ownerUserId: 'owner1',
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
      deletedAt: null,
    });
    prismaMock.taskDispute.findFirst.mockResolvedValue({
      id: 'd1',
      status: 'OPEN',
    });

    await expect(
      tasksService.openTaskDispute({
        userId: 'owner1',
        taskId: 't1',
        reason: 'Dispute exists',
      })
    ).rejects.toMatchObject({
      code: 'DISPUTE_ALREADY_OPEN',
    });
  });
});
