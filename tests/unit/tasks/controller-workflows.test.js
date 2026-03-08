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

const tasksController = await import('../../../src/controllers/tasks.controller.js');

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
