import { jest } from '@jest/globals';

const tasksServiceMock = {
  getTaskReviews: jest.fn(),
  reportTask: jest.fn(),
  getTaskReports: jest.fn(),
  resolveTaskReport: jest.fn(),
  getTaskDisputes: jest.fn(),
};

jest.unstable_mockModule('../../src/services/tasks/index.js', () => tasksServiceMock);

const tasksController = await import('../../../src/controllers/tasks.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('tasks.controller - reviews and reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getTaskReviews returns service result as-is', async () => {
    tasksServiceMock.getTaskReviews.mockResolvedValue({
      items: [{ review_id: 'rev-1' }],
      page: 2,
      size: 5,
      total: 11,
    });

    const req = {
      params: { taskId: 't-1' },
      query: { page: '2', size: '5' },
    };
    const res = createResponseMock();

    await tasksController.getTaskReviews(req, res, jest.fn());

    expect(tasksServiceMock.getTaskReviews).toHaveBeenCalledWith({
      taskId: 't-1',
      page: '2',
      size: '5',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [{ review_id: 'rev-1' }],
      page: 2,
      size: 5,
      total: 11,
    });
  });

  test('getTaskDisputes maps service result to response', async () => {
    tasksServiceMock.getTaskDisputes.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    const req = {
      query: { page: '1', size: '20', status: 'OPEN', reason_type: 'COMPLETION_NOT_CONFIRMED' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await tasksController.getTaskDisputes(req, res, next);

    expect(tasksServiceMock.getTaskDisputes).toHaveBeenCalledWith({
      page: 1,
      size: 20,
      status: 'OPEN',
      reasonType: 'COMPLETION_NOT_CONFIRMED',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });
  });

  test('getTaskDisputes falls back to default pagination when query is missing', async () => {
    tasksServiceMock.getTaskDisputes.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    await tasksController.getTaskDisputes({ query: {} }, createResponseMock(), jest.fn());

    expect(tasksServiceMock.getTaskDisputes).toHaveBeenCalledWith({
      page: 1,
      size: 20,
      status: undefined,
      reasonType: undefined,
    });
  });

  test('reportTask maps service result to response', async () => {
    const createdAt = new Date('2026-03-08T18:00:00.000Z');
    tasksServiceMock.reportTask.mockResolvedValue({
      reportId: 'report-1',
      createdAt,
    });

    const req = {
      user: { id: 'u-1' },
      persona: 'developer',
      params: { taskId: 't-2' },
      body: { reason: 'SPAM', comment: 'Looks suspicious' },
    };
    const res = createResponseMock();

    await tasksController.reportTask(req, res, jest.fn());

    expect(tasksServiceMock.reportTask).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'developer',
      taskId: 't-2',
      report: { reason: 'SPAM', comment: 'Looks suspicious' },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      report_id: 'report-1',
      created_at: createdAt.toISOString(),
    });
  });

  test('getTaskReports maps nullable and resolved fields', async () => {
    const createdAt = new Date('2026-03-08T19:00:00.000Z');
    const deletedAt = new Date('2026-03-08T19:30:00.000Z');
    const resolvedAt = new Date('2026-03-08T20:00:00.000Z');

    tasksServiceMock.getTaskReports.mockResolvedValue({
      items: [
        {
          id: 'report-1',
          taskId: 't-3',
          task: {
            id: 't-3',
            title: 'Broken task',
            status: 'DELETED',
            deletedAt,
            ownerUserId: 'owner-1',
          },
          reporter: { id: 'u-2', email: 'user@example.com' },
          reporterPersona: 'developer',
          reason: 'OTHER',
          comment: null,
          status: 'RESOLVED',
          resolutionAction: 'DELETE_TASK',
          resolutionNote: null,
          resolvedByUserId: 'admin-1',
          resolvedBy: { email: 'admin@example.com' },
          resolvedAt,
          createdAt,
        },
      ],
      page: 1,
      size: 20,
      total: 1,
    });

    const req = {
      query: { page: '1', size: '20', status: 'RESOLVED', reason: 'OTHER' },
    };
    const res = createResponseMock();

    await tasksController.getTaskReports(req, res, jest.fn());

    expect(tasksServiceMock.getTaskReports).toHaveBeenCalledWith({
      page: '1',
      size: '20',
      status: 'RESOLVED',
      reason: 'OTHER',
    });
    expect(res.json).toHaveBeenCalledWith({
      items: [
        {
          report_id: 'report-1',
          target_type: 'task',
          target_id: 't-3',
          target: {
            id: 't-3',
            title: 'Broken task',
            status: 'DELETED',
            deleted_at: deletedAt.toISOString(),
            owner_user_id: 'owner-1',
          },
          reporter: {
            user_id: 'u-2',
            email: 'user@example.com',
            persona: 'developer',
          },
          reason: 'OTHER',
          comment: '',
          status: 'RESOLVED',
          resolution_action: 'DELETE_TASK',
          resolution_note: '',
          resolved_by_user_id: 'admin-1',
          resolved_by_email: 'admin@example.com',
          resolved_at: resolvedAt.toISOString(),
          created_at: createdAt.toISOString(),
        },
      ],
      page: 1,
      size: 20,
      total: 1,
    });
  });

  test('getTaskReports preserves present optional text fields and null resolution metadata', async () => {
    const createdAt = new Date('2026-03-08T22:00:00.000Z');

    tasksServiceMock.getTaskReports.mockResolvedValue({
      items: [
        {
          id: 'report-2',
          taskId: 't-4',
          task: {
            id: 't-4',
            title: 'Active task',
            status: 'PUBLISHED',
            deletedAt: null,
            ownerUserId: 'owner-2',
          },
          reporter: { id: 'u-3', email: 'reporter@example.com' },
          reporterPersona: 'company',
          reason: 'SPAM',
          comment: 'Contains misleading info',
          status: 'OPEN',
          resolutionAction: null,
          resolutionNote: 'Pending moderation',
          resolvedByUserId: null,
          resolvedBy: null,
          resolvedAt: null,
          createdAt,
        },
      ],
      page: 2,
      size: 10,
      total: 3,
    });

    const res = createResponseMock();
    await tasksController.getTaskReports({ query: {} }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({
      items: [
        {
          report_id: 'report-2',
          target_type: 'task',
          target_id: 't-4',
          target: {
            id: 't-4',
            title: 'Active task',
            status: 'PUBLISHED',
            deleted_at: null,
            owner_user_id: 'owner-2',
          },
          reporter: {
            user_id: 'u-3',
            email: 'reporter@example.com',
            persona: 'company',
          },
          reason: 'SPAM',
          comment: 'Contains misleading info',
          status: 'OPEN',
          resolution_action: null,
          resolution_note: 'Pending moderation',
          resolved_by_user_id: null,
          resolved_by_email: null,
          resolved_at: null,
          created_at: createdAt.toISOString(),
        },
      ],
      page: 2,
      size: 10,
      total: 3,
    });
  });

  test('resolveTaskReport maps service result to response', async () => {
    const resolvedAt = new Date('2026-03-08T21:00:00.000Z');
    tasksServiceMock.resolveTaskReport.mockResolvedValue({
      reportId: 'report-2',
      status: 'RESOLVED',
      action: 'DISMISS',
      resolvedAt,
    });

    const req = {
      user: { id: 'admin-1' },
      params: { reportId: 'report-2' },
      body: { action: 'DISMISS', note: 'No action required' },
    };
    const res = createResponseMock();

    await tasksController.resolveTaskReport(req, res, jest.fn());

    expect(tasksServiceMock.resolveTaskReport).toHaveBeenCalledWith({
      userId: 'admin-1',
      reportId: 'report-2',
      action: 'DISMISS',
      note: 'No action required',
    });
    expect(res.json).toHaveBeenCalledWith({
      report_id: 'report-2',
      status: 'RESOLVED',
      action: 'DISMISS',
      resolved_at: resolvedAt.toISOString(),
    });
  });
});
