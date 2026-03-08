import { jest } from '@jest/globals';

const tasksServiceMock = {
  createTaskDraft: jest.fn(),
  updateTaskDraft: jest.fn(),
  publishTask: jest.fn(),
  applyToTask: jest.fn(),
  closeTask: jest.fn(),
  deleteTask: jest.fn(),
  getTaskById: jest.fn(),
  getTasksCatalog: jest.fn(),
  getTaskApplications: jest.fn(),
  getRecommendedDevelopers: jest.fn(),
  getTaskCandidates: jest.fn(),
  acceptApplication: jest.fn(),
  rejectApplication: jest.fn(),
  requestTaskCompletion: jest.fn(),
  confirmTaskCompletion: jest.fn(),
  rejectTaskCompletion: jest.fn(),
  createReview: jest.fn(),
};

jest.unstable_mockModule('../../src/services/tasks/index.js', () => tasksServiceMock);

const tasksController = await import('../../src/controllers/tasks.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('tasks.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createTaskDraft maps service result to response', async () => {
    tasksServiceMock.createTaskDraft.mockResolvedValue({
      taskId: 't-1',
      status: 'DRAFT',
      createdAt: new Date('2026-03-08T10:00:00.000Z'),
    });

    const req = {
      user: { id: 'u-1' },
      body: { title: 'Task title' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.createTaskDraft(req, res, next);

    expect(tasksServiceMock.createTaskDraft).toHaveBeenCalledWith({
      userId: 'u-1',
      task: { title: 'Task title' },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      task_id: 't-1',
      status: 'DRAFT',
      created_at: '2026-03-08T10:00:00.000Z',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('getTasksCatalog parses query params and returns paginated payload', async () => {
    tasksServiceMock.getTasksCatalog.mockResolvedValue({
      items: [{ task_id: 't-1' }],
      page: 2,
      size: 5,
      total: 9,
    });

    const req = {
      user: { id: 'u-1' },
      query: {
        page: '2',
        size: '5',
        search: 'filter',
        technology_ids: 'tech-1',
        tech_match: 'ALL',
        owner: 'true',
        include_deleted: 'true',
      },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.getTasksCatalog(req, res, next);

    expect(tasksServiceMock.getTasksCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u-1',
        page: 2,
        size: 5,
        search: 'filter',
        technology_ids: ['tech-1'],
        tech_match: 'ALL',
        owner: true,
        includeDeleted: true,
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [{ task_id: 't-1' }],
      page: 2,
      size: 5,
      total: 9,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejectTaskCompletion maps completion rejection payload', async () => {
    tasksServiceMock.rejectTaskCompletion.mockResolvedValue({
      taskId: 't-2',
      status: 'IN_PROGRESS',
      rejectionCount: 2,
      isFinalRejection: false,
    });

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-2' },
      body: { feedback: 'Please add tests' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.rejectTaskCompletion(req, res, next);

    expect(tasksServiceMock.rejectTaskCompletion).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-2',
      feedback: 'Please add tests',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      task_id: 't-2',
      status: 'IN_PROGRESS',
      rejection_count: 2,
      is_final_rejection: false,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('updateTaskDraft maps service result to response', async () => {
    tasksServiceMock.updateTaskDraft.mockResolvedValue({
      taskId: 't-1',
      updated: true,
      updatedAt: new Date('2026-03-08T11:00:00.000Z'),
    });

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-1' },
      body: { title: 'Updated title' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.updateTaskDraft(req, res, next);

    expect(tasksServiceMock.updateTaskDraft).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
      task: { title: 'Updated title' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      task_id: 't-1',
      updated: true,
      updated_at: '2026-03-08T11:00:00.000Z',
    });
  });

  test('publishTask maps service result to response', async () => {
    tasksServiceMock.publishTask.mockResolvedValue({
      taskId: 't-1',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-03-08T10:30:00.000Z'),
    });

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.publishTask(req, res, next);

    expect(tasksServiceMock.publishTask).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      task_id: 't-1',
      status: 'PUBLISHED',
      published_at: '2026-03-08T10:30:00.000Z',
    });
  });

  test('applyToTask maps service result to response', async () => {
    tasksServiceMock.applyToTask.mockResolvedValue({
      applicationId: 'app-1',
      taskId: 't-1',
      developerUserId: 'u-2',
      status: 'PENDING',
      createdAt: new Date('2026-03-08T10:15:00.000Z'),
    });

    const req = {
      user: { id: 'u-2' },
      params: { taskId: 't-1' },
      body: { cover_letter: 'I am interested' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.applyToTask(req, res, next);

    expect(tasksServiceMock.applyToTask).toHaveBeenCalledWith({
      userId: 'u-2',
      taskId: 't-1',
      application: { cover_letter: 'I am interested' },
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('closeTask maps service result to response', async () => {
    tasksServiceMock.closeTask.mockResolvedValue({
      taskId: 't-1',
      status: 'CLOSED',
      closedAt: new Date('2026-03-08T12:00:00.000Z'),
    });

    const req = { user: { id: 'u-1' }, params: { taskId: 't-1' } };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.closeTask(req, res, next);

    expect(tasksServiceMock.closeTask).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      task_id: 't-1',
      status: 'CLOSED',
      closed_at: '2026-03-08T12:00:00.000Z',
    });
  });

  test('deleteTask maps service result to response', async () => {
    tasksServiceMock.deleteTask.mockResolvedValue({
      taskId: 't-1',
      status: 'DELETED',
      deletedAt: new Date('2026-03-08T13:00:00.000Z'),
    });

    const req = { user: { id: 'u-1' }, params: { taskId: 't-1' } };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.deleteTask(req, res, next);

    expect(tasksServiceMock.deleteTask).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTaskById passes persona header and user ID', async () => {
    tasksServiceMock.getTaskById.mockResolvedValue({
      task_id: 't-1',
      title: 'Task',
      status: 'PUBLISHED',
    });

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-1' },
      headers: { 'x-persona': 'developer' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.getTaskById(req, res, next);

    expect(tasksServiceMock.getTaskById).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
      persona: 'developer',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTaskApplications parses pagination params', async () => {
    tasksServiceMock.getTaskApplications.mockResolvedValue({
      items: [{ application_id: 'app-1' }],
      page: 2,
      size: 10,
      total: 25,
    });

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-1' },
      query: { page: '2', size: '10' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.getTaskApplications(req, res, next);

    expect(tasksServiceMock.getTaskApplications).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
      page: 2,
      size: 10,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getRecommendedDevelopers parses limit param', async () => {
    tasksServiceMock.getRecommendedDevelopers.mockResolvedValue({
      items: [{ user_id: 'u-2' }],
      total: 1,
    });

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-1' },
      query: { limit: '5' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.getRecommendedDevelopers(req, res, next);

    expect(tasksServiceMock.getRecommendedDevelopers).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
      limit: 5,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTaskCandidates parses boolean query params correctly', async () => {
    tasksServiceMock.getTaskCandidates.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-1' },
      query: {
        page: '1',
        size: '20',
        exclude_invited: 'true',
        exclude_applied: '1',
        min_rating: '4.5',
      },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.getTaskCandidates(req, res, next);

    expect(tasksServiceMock.getTaskCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u-1',
        taskId: 't-1',
        page: 1,
        size: 20,
        excludeInvited: true,
        excludeApplied: true,
        minRating: 4.5,
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('acceptApplication maps service result to response', async () => {
    tasksServiceMock.acceptApplication.mockResolvedValue({
      task_id: 't-1',
      accepted_application_id: 'app-1',
      task_status: 'IN_PROGRESS',
      accepted_developer_user_id: 'u-2',
      thread_id: 'th-1',
    });

    const req = {
      user: { id: 'u-1' },
      params: { applicationId: 'app-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.acceptApplication(req, res, next);

    expect(tasksServiceMock.acceptApplication).toHaveBeenCalledWith({
      userId: 'u-1',
      applicationId: 'app-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('rejectApplication maps service result to response', async () => {
    tasksServiceMock.rejectApplication.mockResolvedValue({
      application_id: 'app-1',
      status: 'REJECTED',
      updated_at: '2026-03-08T14:00:00.000Z',
    });

    const req = {
      user: { id: 'u-1' },
      params: { applicationId: 'app-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.rejectApplication(req, res, next);

    expect(tasksServiceMock.rejectApplication).toHaveBeenCalledWith({
      userId: 'u-1',
      applicationId: 'app-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('requestTaskCompletion maps service result to response', async () => {
    tasksServiceMock.requestTaskCompletion.mockResolvedValue({
      taskId: 't-1',
      status: 'COMPLETION_REQUESTED',
    });

    const req = { user: { id: 'u-1' }, params: { taskId: 't-1' } };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.requestTaskCompletion(req, res, next);

    expect(tasksServiceMock.requestTaskCompletion).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('confirmTaskCompletion maps service result to response', async () => {
    tasksServiceMock.confirmTaskCompletion.mockResolvedValue({
      taskId: 't-1',
      status: 'COMPLETED',
      completedAt: new Date('2026-03-08T15:00:00.000Z'),
    });

    const req = { user: { id: 'u-1' }, params: { taskId: 't-1' } };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.confirmTaskCompletion(req, res, next);

    expect(tasksServiceMock.confirmTaskCompletion).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      task_id: 't-1',
      status: 'COMPLETED',
      completed_at: '2026-03-08T15:00:00.000Z',
    });
  });

  test('createReview maps service result to response', async () => {
    tasksServiceMock.createReview.mockResolvedValue({
      reviewId: 'rev-1',
      taskId: 't-1',
      authorUserId: 'u-1',
      targetUserId: 'u-2',
      rating: 5,
      text: 'Great work!',
      createdAt: new Date('2026-03-08T16:00:00.000Z'),
    });

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-1' },
      body: { rating: 5, text: 'Great work!' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.createReview(req, res, next);

    expect(tasksServiceMock.createReview).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
      review: { rating: 5, text: 'Great work!' },
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
