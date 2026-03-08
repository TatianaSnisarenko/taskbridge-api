import { jest } from '@jest/globals';

const tasksServiceMock = {
  createTaskDraft: jest.fn(),
  updateTaskDraft: jest.fn(),
  publishTask: jest.fn(),
  closeTask: jest.fn(),
  deleteTask: jest.fn(),
};

jest.unstable_mockModule('../../src/services/tasks/index.js', () => tasksServiceMock);

const tasksController = await import('../../../src/controllers/tasks.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('tasks.controller - CRUD operations', () => {
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
});
