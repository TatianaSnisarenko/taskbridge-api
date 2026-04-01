import { jest } from '@jest/globals';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
  },
  developerProfile: {
    findUnique: jest.fn(),
  },
  companyProfile: {
    findUnique: jest.fn(),
  },
};

const meServiceMock = {
  getMyApplications: jest.fn(),
  getMyTasks: jest.fn(),
  getMyProjects: jest.fn(),
  getMyOnboardingState: jest.fn(),
  updateMyOnboardingState: jest.fn(),
  resetMyOnboardingState: jest.fn(),
  checkShouldShowOnboarding: jest.fn(),
};

const invitesServiceMock = {
  getMyInvites: jest.fn(),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/services/me/index.js', () => meServiceMock);
jest.unstable_mockModule('../../src/services/invites/index.js', () => invitesServiceMock);

const meController = await import('../../../src/controllers/me.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('me.controller - profile and catalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getMe returns profile availability flags', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ roles: ['USER', 'ADMIN'] });
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u-1' });
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);
    meServiceMock.getMyOnboardingState.mockResolvedValue({
      developer: {
        status: 'completed',
        version: 1,
        completed_at: '2026-03-14T10:00:00.000Z',
        skipped_at: null,
      },
      company: {
        status: 'not_started',
        version: 1,
        completed_at: null,
        skipped_at: null,
      },
    });

    const req = { user: { id: 'u-1', email: 'user@example.com' } };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMe(req, res, next);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u-1' },
      select: { roles: true },
    });
    expect(prismaMock.developerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 'u-1' },
    });
    expect(prismaMock.companyProfile.findUnique).toHaveBeenCalledWith({ where: { userId: 'u-1' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      user_id: 'u-1',
      email: 'user@example.com',
      roles: ['USER', 'ADMIN'],
      hasDeveloperProfile: true,
      hasCompanyProfile: false,
      onboarding: {
        developer: {
          status: 'completed',
          version: 1,
          completed_at: '2026-03-14T10:00:00.000Z',
          skipped_at: null,
        },
        company: {
          status: 'not_started',
          version: 1,
          completed_at: null,
          skipped_at: null,
        },
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('updateMyOnboarding delegates to service and returns payload', async () => {
    meServiceMock.updateMyOnboardingState.mockResolvedValue({
      role: 'developer',
      status: 'completed',
      version: 2,
      completed_at: '2026-03-14T10:30:00.000Z',
      skipped_at: null,
      updated_at: '2026-03-14T10:30:00.000Z',
    });

    const req = {
      user: { id: 'u-1' },
      body: { role: 'developer', status: 'completed', version: 2 },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.updateMyOnboarding(req, res, next);

    expect(meServiceMock.updateMyOnboardingState).toHaveBeenCalledWith({
      userId: 'u-1',
      role: 'developer',
      status: 'completed',
      version: 2,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  test('resetMyOnboarding delegates to service and returns payload', async () => {
    meServiceMock.resetMyOnboardingState.mockResolvedValue({
      role: 'company',
      status: 'not_started',
      version: 1,
      completed_at: null,
      skipped_at: null,
      updated_at: '2026-03-14T10:40:00.000Z',
    });

    const req = {
      user: { id: 'u-1' },
      body: { role: 'company' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.resetMyOnboarding(req, res, next);

    expect(meServiceMock.resetMyOnboardingState).toHaveBeenCalledWith({
      userId: 'u-1',
      role: 'company',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  test('checkMyOnboarding calls service and returns result', async () => {
    meServiceMock.checkShouldShowOnboarding.mockResolvedValue({
      should_show: true,
      current_status: 'not_started',
      current_version: 1,
    });

    const req = {
      user: { id: 'u-1' },
      query: { role: 'developer', version: '2' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.checkMyOnboarding(req, res, next);

    expect(meServiceMock.checkShouldShowOnboarding).toHaveBeenCalledWith({
      userId: 'u-1',
      role: 'developer',
      version: 2,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      should_show: true,
      current_status: 'not_started',
      current_version: 1,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('getMyApplications parses pagination params and persona', async () => {
    meServiceMock.getMyApplications.mockResolvedValue({
      items: [{ id: 'app-1' }],
      page: 2,
      size: 15,
      total: 30,
    });

    const req = {
      user: { id: 'u-1' },
      query: { page: '2', size: '15' },
      persona: 'developer',
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyApplications(req, res, next);

    expect(meServiceMock.getMyApplications).toHaveBeenCalledWith({
      userId: 'u-1',
      page: 2,
      size: 15,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getMyApplications defaults to page 1 and size 20 when query params are missing or invalid', async () => {
    meServiceMock.getMyApplications.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    const req = {
      user: { id: 'u-1' },
      query: { page: 'invalid', size: 'notanumber' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyApplications(req, res, next);

    expect(meServiceMock.getMyApplications).toHaveBeenCalledWith({
      userId: 'u-1',
      page: 1,
      size: 20,
    });
  });

  test('getMyInvites delegates to invites service loaded via dynamic import', async () => {
    invitesServiceMock.getMyInvites.mockResolvedValue({ items: [], page: 1, size: 20, total: 0 });

    const req = {
      user: { id: 'u-1' },
      query: { page: '1', size: '20', status: 'PENDING' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyInvites(req, res, next);

    expect(invitesServiceMock.getMyInvites).toHaveBeenCalledWith({
      userId: 'u-1',
      page: 1,
      size: 20,
      status: 'PENDING',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [], page: 1, size: 20, total: 0 });
    expect(next).not.toHaveBeenCalled();
  });

  test('getMyInvites passes undefined status when not provided', async () => {
    invitesServiceMock.getMyInvites.mockResolvedValue({
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

    await meController.getMyInvites(req, res, next);

    expect(invitesServiceMock.getMyInvites).toHaveBeenCalledWith({
      userId: 'u-1',
      page: 1,
      size: 20,
      status: undefined,
    });
  });

  test('getMyTasks parses status filter and pagination', async () => {
    meServiceMock.getMyTasks.mockResolvedValue({
      items: [{ id: 't-1' }],
      page: 1,
      size: 20,
      total: 5,
    });

    const req = {
      user: { id: 'u-1' },
      query: { page: '1', size: '20', status: 'PUBLISHED' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyTasks(req, res, next);

    expect(meServiceMock.getMyTasks).toHaveBeenCalledWith({
      userId: 'u-1',
      page: 1,
      size: 20,
      status: 'PUBLISHED',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getMyTasks passes undefined status when not provided and defaults pagination', async () => {
    meServiceMock.getMyTasks.mockResolvedValue({
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

    await meController.getMyTasks(req, res, next);

    expect(meServiceMock.getMyTasks).toHaveBeenCalledWith({
      userId: 'u-1',
      page: 1,
      size: 20,
      status: undefined,
    });
  });

  test('getMyProjects passes persona from middleware', async () => {
    meServiceMock.getMyProjects.mockResolvedValue({
      items: [{ id: 'p-1' }],
      page: 1,
      size: 20,
      total: 3,
    });

    const req = {
      user: { id: 'u-1' },
      persona: 'company',
      query: { page: '1', size: '20' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyProjects(req, res, next);

    expect(meServiceMock.getMyProjects).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'company',
      page: 1,
      size: 20,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getMyProjects defaults to page 1 and size 20 when pagination params are missing', async () => {
    meServiceMock.getMyProjects.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    const req = {
      user: { id: 'u-1' },
      persona: 'developer',
      query: {},
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyProjects(req, res, next);

    expect(meServiceMock.getMyProjects).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'developer',
      page: 1,
      size: 20,
    });
  });
});
