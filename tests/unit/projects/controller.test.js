import { jest } from '@jest/globals';

const projectsServiceMock = {
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  getProjects: jest.fn(),
  getProjectById: jest.fn(),
  reportProject: jest.fn(),
  getProjectReports: jest.fn(),
  resolveProjectReport: jest.fn(),
  getProjectReviews: jest.fn(),
};

const tasksServiceMock = {
  getProjectTasks: jest.fn(),
};

jest.unstable_mockModule('../../src/services/projects/index.js', () => projectsServiceMock);
jest.unstable_mockModule('../../src/services/tasks/index.js', () => tasksServiceMock);

const projectsController = await import('../../../src/controllers/projects.controller.js');

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

  test('updateProject returns mapped response with updated_at', async () => {
    projectsServiceMock.updateProject.mockResolvedValue({
      projectId: 'p-1',
      updated: true,
      updatedAt: new Date('2026-03-08T12:10:00.000Z'),
    });

    const req = {
      user: { id: 'u-1' },
      params: { projectId: 'p-1' },
      body: { title: 'Updated' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await projectsController.updateProject(req, res, next);

    expect(projectsServiceMock.updateProject).toHaveBeenCalledWith({
      userId: 'u-1',
      projectId: 'p-1',
      project: { title: 'Updated' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      project_id: 'p-1',
      updated: true,
      updated_at: '2026-03-08T12:10:00.000Z',
    });
  });

  test('deleteProject returns mapped response with deleted_at', async () => {
    projectsServiceMock.deleteProject.mockResolvedValue({
      projectId: 'p-1',
      deletedAt: new Date('2026-03-08T12:20:00.000Z'),
    });

    const req = {
      user: { id: 'u-1' },
      params: { projectId: 'p-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await projectsController.deleteProject(req, res, next);

    expect(projectsServiceMock.deleteProject).toHaveBeenCalledWith({
      userId: 'u-1',
      projectId: 'p-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      project_id: 'p-1',
      deleted_at: '2026-03-08T12:20:00.000Z',
    });
  });

  test('getProjects forwards optional user and query to service', async () => {
    const serviceResult = { items: [], page: 1, size: 20, total: 0 };
    projectsServiceMock.getProjects.mockResolvedValue(serviceResult);

    const req = {
      user: { id: 'u-1' },
      query: { page: '1', size: '20', search: 'abc' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await projectsController.getProjects(req, res, next);

    expect(projectsServiceMock.getProjects).toHaveBeenCalledWith({
      userId: 'u-1',
      query: { page: '1', size: '20', search: 'abc' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  test('getProjects forwards undefined user id for public request', async () => {
    projectsServiceMock.getProjects.mockResolvedValue({ items: [], page: 1, size: 20, total: 0 });

    const req = { query: { page: '2' } };
    const res = createResponseMock();
    const next = jest.fn();

    await projectsController.getProjects(req, res, next);

    expect(projectsServiceMock.getProjects).toHaveBeenCalledWith({
      userId: undefined,
      query: { page: '2' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
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

  test('reportProject returns mapped response with created_at', async () => {
    projectsServiceMock.reportProject.mockResolvedValue({
      reportId: 'r-1',
      createdAt: new Date('2026-03-08T12:30:00.000Z'),
    });

    const req = {
      user: { id: 'u-2' },
      persona: 'developer',
      params: { projectId: 'p-2' },
      body: { reason: 'SPAM', details: 'Not relevant' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await projectsController.reportProject(req, res, next);

    expect(projectsServiceMock.reportProject).toHaveBeenCalledWith({
      userId: 'u-2',
      persona: 'developer',
      projectId: 'p-2',
      report: { reason: 'SPAM', details: 'Not relevant' },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      report_id: 'r-1',
      created_at: '2026-03-08T12:30:00.000Z',
    });
  });

  test('getProjectReports maps nullable fields correctly', async () => {
    projectsServiceMock.getProjectReports.mockResolvedValue({
      items: [
        {
          id: 'rep-1',
          projectId: 'p-1',
          project: {
            id: 'p-1',
            title: 'Project One',
            status: 'ACTIVE',
            deletedAt: null,
            ownerUserId: 'u-owner',
          },
          reporter: {
            id: 'u-reporter',
            email: 'reporter@example.com',
          },
          reporterPersona: 'developer',
          reason: 'SPAM',
          comment: null,
          status: 'OPEN',
          resolutionAction: null,
          resolutionNote: null,
          resolvedByUserId: null,
          resolvedBy: null,
          resolvedAt: null,
          createdAt: new Date('2026-03-10T10:00:00.000Z'),
        },
      ],
      page: 1,
      size: 20,
      total: 1,
    });

    const req = { query: { page: '1', size: '20', status: 'OPEN', reason: 'SPAM' } };
    const res = createResponseMock();
    const next = jest.fn();

    await projectsController.getProjectReports(req, res, next);

    expect(projectsServiceMock.getProjectReports).toHaveBeenCalledWith({
      page: '1',
      size: '20',
      status: 'OPEN',
      reason: 'SPAM',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [
        {
          report_id: 'rep-1',
          target_type: 'project',
          target_id: 'p-1',
          target: {
            id: 'p-1',
            title: 'Project One',
            status: 'ACTIVE',
            deleted_at: null,
            owner_user_id: 'u-owner',
          },
          reporter: {
            user_id: 'u-reporter',
            email: 'reporter@example.com',
            persona: 'developer',
          },
          reason: 'SPAM',
          comment: '',
          status: 'OPEN',
          resolution_action: null,
          resolution_note: '',
          resolved_by_user_id: null,
          resolved_by_email: null,
          resolved_at: null,
          created_at: '2026-03-10T10:00:00.000Z',
        },
      ],
      page: 1,
      size: 20,
      total: 1,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('getProjectReports maps populated resolution fields', async () => {
    projectsServiceMock.getProjectReports.mockResolvedValue({
      items: [
        {
          id: 'rep-2',
          projectId: 'p-2',
          project: {
            id: 'p-2',
            title: 'Project Two',
            status: 'ARCHIVED',
            deletedAt: new Date('2026-03-09T10:00:00.000Z'),
            ownerUserId: 'u-owner-2',
          },
          reporter: {
            id: 'u-reporter-2',
            email: 'reporter2@example.com',
          },
          reporterPersona: 'company',
          reason: 'MISLEADING',
          comment: 'Needs review',
          status: 'RESOLVED',
          resolutionAction: 'DELETE',
          resolutionNote: 'Confirmed',
          resolvedByUserId: 'u-admin',
          resolvedBy: { email: 'admin@example.com' },
          resolvedAt: new Date('2026-03-11T10:00:00.000Z'),
          createdAt: new Date('2026-03-10T10:00:00.000Z'),
        },
      ],
      page: 2,
      size: 10,
      total: 3,
    });

    const req = { query: { page: '2', size: '10' } };
    const res = createResponseMock();

    await projectsController.getProjectReports(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            comment: 'Needs review',
            resolution_action: 'DELETE',
            resolution_note: 'Confirmed',
            resolved_by_user_id: 'u-admin',
            resolved_by_email: 'admin@example.com',
            resolved_at: '2026-03-11T10:00:00.000Z',
          }),
        ],
      })
    );
  });

  test('resolveProjectReport maps response fields', async () => {
    projectsServiceMock.resolveProjectReport.mockResolvedValue({
      reportId: 'rep-1',
      status: 'RESOLVED',
      action: 'DISMISS',
      resolvedAt: new Date('2026-03-12T10:00:00.000Z'),
    });

    const req = {
      user: { id: 'u-admin' },
      params: { reportId: 'rep-1' },
      body: { action: 'DISMISS', note: 'Not enough evidence' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await projectsController.resolveProjectReport(req, res, next);

    expect(projectsServiceMock.resolveProjectReport).toHaveBeenCalledWith({
      userId: 'u-admin',
      reportId: 'rep-1',
      action: 'DISMISS',
      note: 'Not enough evidence',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      report_id: 'rep-1',
      status: 'RESOLVED',
      action: 'DISMISS',
      resolved_at: '2026-03-12T10:00:00.000Z',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('getProjectReviews forwards query filters', async () => {
    const serviceResult = { items: [], page: 1, size: 20, total: 0 };
    projectsServiceMock.getProjectReviews.mockResolvedValue(serviceResult);

    const req = {
      params: { projectId: 'p-9' },
      query: { page: '3', size: '5', author_persona: 'developer' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await projectsController.getProjectReviews(req, res, next);

    expect(projectsServiceMock.getProjectReviews).toHaveBeenCalledWith({
      projectId: 'p-9',
      page: '3',
      size: '5',
      authorPersona: 'developer',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
    expect(next).not.toHaveBeenCalled();
  });
});
