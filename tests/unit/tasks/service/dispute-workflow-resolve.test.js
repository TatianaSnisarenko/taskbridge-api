import {
  notificationsServiceMock,
  prismaMock,
  resetDisputeMocks,
  tasksService,
} from './dispute-workflow-test-setup.js';

describe('tasks.service - dispute workflow (resolve)', () => {
  beforeEach(() => {
    resetDisputeMocks();
  });

  test('resolveTaskDispute rejects missing task', async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.resolveTaskDispute({
        userId: 'admin1',
        taskId: 't1',
        action: 'RETURN_TO_PROGRESS',
        reason: 'Admin decision',
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('resolveTaskDispute rejects invalid status', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'IN_PROGRESS',
      deletedAt: null,
      projectId: null,
      ownerUserId: 'owner1',
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });
    prismaMock.taskDispute.findFirst.mockResolvedValue(null);

    await expect(
      tasksService.resolveTaskDispute({
        userId: 'admin1',
        taskId: 't1',
        action: 'MARK_FAILED',
        reason: 'Admin decision',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('resolveTaskDispute returns task to IN_PROGRESS', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'DISPUTE',
      deletedAt: null,
      projectId: null,
      ownerUserId: 'owner1',
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });
    prismaMock.taskDispute.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'IN_PROGRESS',
      projectId: null,
    });

    const result = await tasksService.resolveTaskDispute({
      userId: 'admin1',
      taskId: 't1',
      action: 'RETURN_TO_PROGRESS',
      reason: 'Admin returned task to progress',
    });

    expect(result).toMatchObject({
      taskId: 't1',
      status: 'IN_PROGRESS',
      action: 'RETURN_TO_PROGRESS',
      resolvedBy: 'admin1',
    });
  });

  test('resolveTaskDispute marks COMPLETED and triggers archive check', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'DISPUTE',
      deletedAt: null,
      projectId: 'p1',
      ownerUserId: 'owner1',
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });
    prismaMock.taskDispute.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'COMPLETED',
      projectId: 'p1',
    });
    prismaMock.project.findUnique.mockResolvedValue(null);

    const result = await tasksService.resolveTaskDispute({
      userId: 'admin1',
      taskId: 't1',
      action: 'MARK_COMPLETED',
      reason: 'Admin approved completion',
    });

    expect(prismaMock.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      })
    );
    expect(result).toMatchObject({
      taskId: 't1',
      status: 'COMPLETED',
      action: 'MARK_COMPLETED',
      resolvedBy: 'admin1',
    });
  });

  test('resolveTaskDispute marks FAILED without archiving when threshold not reached', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'DISPUTE',
      deletedAt: null,
      projectId: 'p1',
      ownerUserId: 'owner1',
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });
    prismaMock.taskDispute.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'FAILED',
      projectId: 'p1',
    });
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      maxTalents: 3,
      status: 'ACTIVE',
    });
    prismaMock.task.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const result = await tasksService.resolveTaskDispute({
      userId: 'admin1',
      taskId: 't1',
      action: 'MARK_FAILED',
      reason: 'Admin marked failed after evidence review',
    });

    expect(prismaMock.project.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      taskId: 't1',
      status: 'FAILED',
      action: 'MARK_FAILED',
      resolvedBy: 'admin1',
    });
  });

  test('resolveTaskDispute marks FAILED and archives project when max talents reached', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'DISPUTE',
      deletedAt: null,
      projectId: 'p1',
      ownerUserId: 'owner1',
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });
    prismaMock.taskDispute.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'FAILED',
      projectId: 'p1',
    });
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      ownerUserId: 'owner1',
      title: 'Disputed Project',
      maxTalents: 2,
      status: 'ACTIVE',
    });
    prismaMock.task.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const result = await tasksService.resolveTaskDispute({
      userId: 'admin1',
      taskId: 't1',
      action: 'MARK_FAILED',
      reason: 'Admin marked failed after evidence review',
    });

    expect(prismaMock.project.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'ARCHIVED' },
    });
    expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner1',
        projectId: 'p1',
        type: 'PROJECT_ARCHIVED_LIMIT_REACHED',
        payload: {
          project_id: 'p1',
          project_title: 'Disputed Project',
          max_talents: 2,
          completed_count: 1,
          failed_count: 1,
        },
      })
    );

    expect(result).toMatchObject({
      taskId: 't1',
      status: 'FAILED',
      action: 'MARK_FAILED',
      resolvedBy: 'admin1',
    });
  });
});
