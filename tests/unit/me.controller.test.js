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
  getMyInvites: jest.fn(),
  getMyTasks: jest.fn(),
  getMyProjects: jest.fn(),
  getMyNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
  getMyThreads: jest.fn(),
  getThreadById: jest.fn(),
  getThreadMessages: jest.fn(),
  createMessage: jest.fn(),
  markThreadAsRead: jest.fn(),
};

const invitesServiceMock = {
  getMyInvites: jest.fn(),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/services/me/index.js', () => meServiceMock);
jest.unstable_mockModule('../../src/services/invites/index.js', () => invitesServiceMock);

const meController = await import('../../src/controllers/me.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('me.controller', () => {
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

  test('getMyNotifications maps unread flag and pagination', async () => {
    meServiceMock.getMyNotifications.mockResolvedValue({
      items: [{ id: 'n-1' }],
      page: 3,
      size: 7,
      total: 10,
      unread_total: 4,
    });

    const req = {
      user: { id: 'u-1' },
      query: { page: '3', size: '7', unread_only: 'true' },
      persona: 'developer',
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyNotifications(req, res, next);

    expect(meServiceMock.getMyNotifications).toHaveBeenCalledWith({
      userId: 'u-1',
      page: 3,
      size: 7,
      unreadOnly: true,
      persona: 'developer',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [{ id: 'n-1' }],
      page: 3,
      size: 7,
      total: 10,
      unread_total: 4,
    });
    expect(next).not.toHaveBeenCalled();
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

  test('markNotificationAsRead maps service result to response', async () => {
    meServiceMock.markNotificationAsRead.mockResolvedValue({
      id: 'n-1',
      read_at: '2026-03-08T10:00:00.000Z',
    });

    const req = {
      user: { id: 'u-1' },
      params: { id: 'n-1' },
      persona: 'developer',
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.markNotificationAsRead(req, res, next);

    expect(meServiceMock.markNotificationAsRead).toHaveBeenCalledWith({
      userId: 'u-1',
      notificationId: 'n-1',
      persona: 'developer',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('markAllNotificationsAsRead maps service result to response', async () => {
    meServiceMock.markAllNotificationsAsRead.mockResolvedValue({
      updated: 5,
      read_at: '2026-03-08T11:00:00.000Z',
    });

    const req = {
      user: { id: 'u-1' },
      persona: 'company',
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.markAllNotificationsAsRead(req, res, next);

    expect(meServiceMock.markAllNotificationsAsRead).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'company',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      updated: 5,
      read_at: '2026-03-08T11:00:00.000Z',
    });
  });

  test('getMyThreads parses search query and persona header', async () => {
    meServiceMock.getMyThreads.mockResolvedValue({
      items: [{ id: 'th-1' }],
      page: 1,
      size: 20,
      total: 1,
    });

    const req = {
      user: { id: 'u-1' },
      headers: { 'x-persona': 'developer' },
      query: { page: '1', size: '20', search: 'keyword' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyThreads(req, res, next);

    expect(meServiceMock.getMyThreads).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'developer',
      page: 1,
      size: 20,
      search: 'keyword',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getThreadById retrieves thread by ID with persona', async () => {
    meServiceMock.getThreadById.mockResolvedValue({
      id: 'th-1',
      participants: ['u-1', 'u-2'],
    });

    const req = {
      user: { id: 'u-1' },
      headers: { 'x-persona': 'company' },
      params: { threadId: 'th-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getThreadById(req, res, next);

    expect(meServiceMock.getThreadById).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'company',
      threadId: 'th-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getThreadMessages parses pagination and persona header', async () => {
    meServiceMock.getThreadMessages.mockResolvedValue({
      items: [{ id: 'm-1', text: 'Hello' }],
      page: 1,
      size: 50,
      total: 1,
    });

    const req = {
      user: { id: 'u-1' },
      headers: { 'x-persona': 'developer' },
      params: { threadId: 'th-1' },
      query: { page: '1', size: '50' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getThreadMessages(req, res, next);

    expect(meServiceMock.getThreadMessages).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'developer',
      threadId: 'th-1',
      page: 1,
      size: 50,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('createMessage creates message with text and persona', async () => {
    meServiceMock.createMessage.mockResolvedValue({
      id: 'm-1',
      threadId: 'th-1',
      text: 'Message text',
    });

    const req = {
      user: { id: 'u-1' },
      headers: { 'x-persona': 'company' },
      params: { threadId: 'th-1' },
      body: { text: 'Message text' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.createMessage(req, res, next);

    expect(meServiceMock.createMessage).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'company',
      threadId: 'th-1',
      text: 'Message text',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('markThreadAsRead marks thread as read with persona', async () => {
    meServiceMock.markThreadAsRead.mockResolvedValue({
      id: 'th-1',
      read_at: '2026-03-08T12:00:00.000Z',
    });

    const req = {
      user: { id: 'u-1' },
      headers: { 'x-persona': 'developer' },
      params: { threadId: 'th-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.markThreadAsRead(req, res, next);

    expect(meServiceMock.markThreadAsRead).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'developer',
      threadId: 'th-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
