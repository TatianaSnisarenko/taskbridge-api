import { jest } from '@jest/globals';

async function loadProjectsRoutes() {
  jest.resetModules();

  const routerMock = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };

  const requireAuthMock = jest.fn((req, res, next) => next());
  const requireAuthIfOwnerMock = jest.fn((req, res, next) => next());
  const personaMwMock = jest.fn((req, res, next) => next());
  const requirePersonaMock = jest.fn(() => personaMwMock);
  const validateMock = jest.fn(() => (req, res, next) => next());

  jest.unstable_mockModule('express', () => ({
    Router: () => routerMock,
  }));

  jest.unstable_mockModule('../../src/middleware/auth.middleware.js', () => ({
    requireAuth: requireAuthMock,
    requireAuthIfOwner: requireAuthIfOwnerMock,
  }));

  jest.unstable_mockModule('../../src/middleware/persona.middleware.js', () => ({
    requirePersona: requirePersonaMock,
  }));

  jest.unstable_mockModule('../../src/middleware/validate.middleware.js', () => ({
    validate: validateMock,
  }));

  jest.unstable_mockModule('../../src/controllers/projects.controller.js', () => ({
    getProjects: jest.fn(),
    getProjectById: jest.fn(),
    getProjectTasks: jest.fn(),
    createProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
    reportProject: jest.fn(),
  }));

  jest.unstable_mockModule('../../src/schemas/projects.schemas.js', () => ({
    createProjectSchema: {},
    deleteProjectParamsSchema: {},
    getProjectParamsSchema: {},
    getProjectQuerySchema: {},
    getProjectsQuerySchema: {},
    reportProjectParamsSchema: {},
    reportProjectSchema: {},
    updateProjectParamsSchema: {},
    updateProjectSchema: {},
  }));

  jest.unstable_mockModule('../../src/schemas/tasks.schemas.js', () => ({
    getProjectTasksQuerySchema: {},
  }));

  await import('../../../src/routes/projects.routes.js');

  return {
    routerMock,
    requireAuthMock,
    requirePersonaMock,
  };
}

async function loadTasksRoutes() {
  jest.resetModules();

  const routerMock = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };

  const requireAuthMock = jest.fn((req, res, next) => next());
  const requireAuthIfOwnerMock = jest.fn((req, res, next) => next());
  const personaMwMock = jest.fn((req, res, next) => next());
  const requirePersonaMock = jest.fn(() => personaMwMock);
  const validateMock = jest.fn(() => (req, res, next) => next());

  jest.unstable_mockModule('express', () => ({
    Router: () => routerMock,
  }));

  jest.unstable_mockModule('../../src/middleware/auth.middleware.js', () => ({
    requireAuth: requireAuthMock,
    requireAuthIfOwner: requireAuthIfOwnerMock,
  }));

  jest.unstable_mockModule('../../src/middleware/persona.middleware.js', () => ({
    requirePersona: requirePersonaMock,
  }));

  jest.unstable_mockModule('../../src/middleware/validate.middleware.js', () => ({
    validate: validateMock,
  }));

  jest.unstable_mockModule('../../src/controllers/tasks.controller.js', () => ({
    getTasksCatalog: jest.fn(),
    createTaskDraft: jest.fn(),
    getTaskById: jest.fn(),
    updateTaskDraft: jest.fn(),
    publishTask: jest.fn(),
    applyToTask: jest.fn(),
    getTaskApplications: jest.fn(),
    getRecommendedDevelopers: jest.fn(),
    getTaskCandidates: jest.fn(),
    requestTaskCompletion: jest.fn(),
    confirmTaskCompletion: jest.fn(),
    rejectTaskCompletion: jest.fn(),
    createReview: jest.fn(),
    closeTask: jest.fn(),
    deleteTask: jest.fn(),
  }));

  jest.unstable_mockModule('../../src/controllers/invites.controller.js', () => ({
    createTaskInvite: jest.fn(),
    getTaskInvites: jest.fn(),
  }));

  jest.unstable_mockModule('../../src/schemas/tasks.schemas.js', () => ({
    createTaskDraftSchema: {},
    createTaskApplicationSchema: {},
    updateTaskDraftSchema: {},
    taskIdParamSchema: {},
    getTasksCatalogSchema: {},
    createReviewSchema: {},
    rejectTaskCompletionSchema: {},
    getRecommendedDevelopersQuerySchema: {},
    getTaskCandidatesQuerySchema: {},
  }));

  jest.unstable_mockModule('../../src/schemas/invites.schemas.js', () => ({
    createTaskInviteSchema: {},
    getTaskInvitesQuerySchema: {},
  }));

  await import('../../../src/routes/tasks.routes.js');

  return {
    routerMock,
    requireAuthMock,
    requirePersonaMock,
  };
}

describe('routes inline guard callbacks', () => {
  test('projects routes execute owner/auth conditional callbacks', async () => {
    const { routerMock, requireAuthMock, requirePersonaMock } = await loadProjectsRoutes();

    const rootGet = routerMock.get.mock.calls.find(([path]) => path === '/');
    const rootGuard = rootGet[3];

    const reqOwner = { query: { owner: 'true' }, headers: {} };
    const reqNotOwner = { query: { owner: 'false' }, headers: {} };
    const res = {};
    const next = jest.fn();

    rootGuard(reqOwner, res, next);
    rootGuard(reqNotOwner, res, next);

    expect(requirePersonaMock).toHaveBeenCalledWith('company');
    expect(next).toHaveBeenCalled();

    const byIdGet = routerMock.get.mock.calls.find(([path]) => path === '/:projectId');
    const byIdGuard = byIdGet[3];

    byIdGuard({ query: { include_deleted: true }, headers: {} }, res, next);
    byIdGuard({ query: {}, headers: { authorization: 'Bearer token' } }, res, next);
    byIdGuard({ query: {}, headers: {} }, res, next);

    expect(requireAuthMock).toHaveBeenCalled();

    const tasksGet = routerMock.get.mock.calls.find(([path]) => path === '/:projectId/tasks');
    const tasksGuard = tasksGet[3];

    tasksGuard({ query: { include_deleted: true }, headers: {} }, res, next);
    tasksGuard({ query: {}, headers: { authorization: 'Bearer token' } }, res, next);
    tasksGuard({ query: {}, headers: {} }, res, next);

    expect(requireAuthMock).toHaveBeenCalled();
  });

  test('tasks routes execute owner/auth conditional callbacks', async () => {
    const { routerMock, requireAuthMock, requirePersonaMock } = await loadTasksRoutes();

    const rootGet = routerMock.get.mock.calls.find(([path]) => path === '/');
    const rootGuard = rootGet[3];

    const reqOwner = { query: { owner: true }, headers: {} };
    const reqNotOwner = { query: { owner: false }, headers: {} };
    const res = {};
    const next = jest.fn();

    rootGuard(reqOwner, res, next);
    rootGuard(reqNotOwner, res, next);

    expect(requirePersonaMock).toHaveBeenCalledWith('company');
    expect(next).toHaveBeenCalled();

    const byIdGet = routerMock.get.mock.calls.find(([path]) => path === '/:taskId');
    const byIdGuard = byIdGet[2];

    byIdGuard({ headers: { authorization: 'Bearer token' } }, res, next);
    byIdGuard({ headers: {} }, res, next);

    expect(requireAuthMock).toHaveBeenCalled();
  });
});
