import { jest } from '@jest/globals';

const projectsServiceMock = {
  createProject: jest.fn(),
  getProjectById: jest.fn(),
};

const tasksServiceMock = {
  getProjectTasks: jest.fn(),
};

jest.unstable_mockModule('../../src/services/projects/index.js', () => projectsServiceMock);
jest.unstable_mockModule('../../src/services/tasks/index.js', () => tasksServiceMock);

const projectsController = await import('../../src/controllers/projects.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('projects.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createProject returns mapped response with created_at', async () => {
    projectsServiceMock.createProject.mockResolvedValue({
      projectId: 'p-1',
      createdAt: new Date('2026-03-08T12:00:00.000Z'),
    });

    const req = { user: { id: 'u-1' }, body: { title: 'TeamUp' } };
    const res = createResponseMock();
    const next = jest.fn();

    await projectsController.createProject(req, res, next);

    expect(projectsServiceMock.createProject).toHaveBeenCalledWith({
      userId: 'u-1',
      project: { title: 'TeamUp' },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      project_id: 'p-1',
      created_at: '2026-03-08T12:00:00.000Z',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('getProjectById forwards filters and returns service payload', async () => {
    const serviceResult = { project_id: 'p-2', title: 'Platform' };
    projectsServiceMock.getProjectById.mockResolvedValue(serviceResult);

    const req = {
      user: { id: 'u-1' },
      params: { projectId: 'p-2' },
      query: { include_deleted: 'true', preview_limit: '3' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await projectsController.getProjectById(req, res, next);

    expect(projectsServiceMock.getProjectById).toHaveBeenCalledWith({
      userId: 'u-1',
      projectId: 'p-2',
      includeDeleted: 'true',
      previewLimit: '3',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
    expect(next).not.toHaveBeenCalled();
  });

  test('getProjectTasks forwards pagination and status filters', async () => {
    const serviceResult = { items: [], page: 1, size: 20, total: 0 };
    tasksServiceMock.getProjectTasks.mockResolvedValue(serviceResult);

    const req = {
      user: { id: 'u-1' },
      params: { projectId: 'p-2' },
      query: { page: '1', size: '20', status: 'PUBLISHED', include_deleted: 'false' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await projectsController.getProjectTasks(req, res, next);

    expect(tasksServiceMock.getProjectTasks).toHaveBeenCalledWith({
      projectId: 'p-2',
      userId: 'u-1',
      page: '1',
      size: '20',
      status: 'PUBLISHED',
      includeDeleted: 'false',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
    expect(next).not.toHaveBeenCalled();
  });
});
