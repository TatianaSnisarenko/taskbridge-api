import { jest } from '@jest/globals';

const prismaMock = {
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
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u-1' });
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    const req = { user: { id: 'u-1', email: 'user@example.com' } };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMe(req, res, next);

    expect(prismaMock.developerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 'u-1' },
    });
    expect(prismaMock.companyProfile.findUnique).toHaveBeenCalledWith({ where: { userId: 'u-1' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      user_id: 'u-1',
      email: 'user@example.com',
      hasDeveloperProfile: true,
      hasCompanyProfile: false,
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
