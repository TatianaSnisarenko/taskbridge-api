import { jest } from '@jest/globals';

const tasksServiceMock = {
  applyToTask: jest.fn(),
  getTaskById: jest.fn(),
  getTasksCatalog: jest.fn(),
  getTaskApplications: jest.fn(),
  getTaskCandidates: jest.fn(),
  getRecommendedDevelopers: jest.fn(),
  rejectTaskCompletion: jest.fn(),
};

jest.unstable_mockModule('../../src/services/tasks/index.js', () => tasksServiceMock);

const tasksController = await import('../../../src/controllers/tasks.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('tasks.controller - catalog and matching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(res.json).toHaveBeenCalledWith({
      application_id: 'app-1',
      task_id: 't-1',
      developer_user_id: 'u-2',
      status: 'PENDING',
      created_at: '2026-03-08T10:15:00.000Z',
    });
    expect(next).not.toHaveBeenCalled();
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

  test('getTasksCatalog handles array technology_ids and default query flags', async () => {
    tasksServiceMock.getTasksCatalog.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    const req = {
      user: { id: 'u-1' },
      query: {
        technology_ids: ['tech-1', 'tech-2'],
      },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.getTasksCatalog(req, res, next);

    expect(tasksServiceMock.getTasksCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u-1',
        page: 1,
        size: 20,
        technology_ids: ['tech-1', 'tech-2'],
        tech_match: 'ANY',
        owner: false,
        includeDeleted: false,
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTasksCatalog converts single technology_id string to array', async () => {
    tasksServiceMock.getTasksCatalog.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    const req = {
      user: { id: 'u-1' },
      query: {
        technology_ids: 'tech-single',
      },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.getTasksCatalog(req, res, next);

    expect(tasksServiceMock.getTasksCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        technology_ids: ['tech-single'],
      })
    );
  });

  test('getTasksCatalog uses empty array when technology_ids is undefined', async () => {
    tasksServiceMock.getTasksCatalog.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    const req = {
      user: { id: 'u-1' },
      query: {},
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.getTasksCatalog(req, res, next);

    expect(tasksServiceMock.getTasksCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        technology_ids: [],
      })
    );
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

  test('getTaskApplications defaults to page 1 and size 20 when params are missing', async () => {
    tasksServiceMock.getTaskApplications.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-1' },
      query: {},
    };
    const res = createResponseMock();

    await tasksController.getTaskApplications(req, res, jest.fn());

    expect(tasksServiceMock.getTaskApplications).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
      page: 1,
      size: 20,
    });
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

    await tasksController.getRecommendedDevelopers(req, res, jest.fn());

    expect(tasksServiceMock.getRecommendedDevelopers).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
      limit: 5,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getRecommendedDevelopers defaults to limit 3 when param is invalid', async () => {
    tasksServiceMock.getRecommendedDevelopers.mockResolvedValue({
      items: [],
      total: 0,
    });

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-1' },
      query: { limit: 'invalid' },
    };

    await tasksController.getRecommendedDevelopers(req, createResponseMock(), jest.fn());

    expect(tasksServiceMock.getRecommendedDevelopers).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
      limit: 3,
    });
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

    await tasksController.getTaskCandidates(req, res, jest.fn());

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

  test('getTaskCandidates maps false/undefined query values to false and undefined', async () => {
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
        exclude_invited: 'false',
        exclude_applied: 0,
      },
    };
    const res = createResponseMock();

    await tasksController.getTaskCandidates(req, res, jest.fn());

    expect(tasksServiceMock.getTaskCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u-1',
        taskId: 't-1',
        page: 1,
        size: 20,
        minRating: undefined,
        excludeInvited: false,
        excludeApplied: false,
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
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
});
