import { jest } from '@jest/globals';

const invitesServiceMock = {
  createTaskInvite: jest.fn(),
  getTaskInvites: jest.fn(),
  acceptInvite: jest.fn(),
  declineInvite: jest.fn(),
  cancelInvite: jest.fn(),
};

jest.unstable_mockModule('../../src/services/invites/index.js', () => invitesServiceMock);

const invitesController = await import('../../../src/controllers/invites.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('invites.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createTaskInvite forwards payload and returns 201', async () => {
    const serviceResult = { invite_id: 'i-1', status: 'PENDING' };
    invitesServiceMock.createTaskInvite.mockResolvedValue(serviceResult);

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-1' },
      body: { developer_id: 'd-1', message: 'Join us' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await invitesController.createTaskInvite(req, res, next);

    expect(invitesServiceMock.createTaskInvite).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
      developerId: 'd-1',
      message: 'Join us',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
    expect(next).not.toHaveBeenCalled();
  });

  test('getTaskInvites parses pagination and returns 200', async () => {
    const serviceResult = { items: [], page: 2, size: 5, total: 0 };
    invitesServiceMock.getTaskInvites.mockResolvedValue(serviceResult);

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-1' },
      query: { page: '2', size: '5', status: 'PENDING' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await invitesController.getTaskInvites(req, res, next);

    expect(invitesServiceMock.getTaskInvites).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
      page: 2,
      size: 5,
      status: 'PENDING',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
    expect(next).not.toHaveBeenCalled();
  });

  test('acceptInvite forwards IDs and returns 200', async () => {
    const serviceResult = { invite_id: 'i-1', status: 'ACCEPTED' };
    invitesServiceMock.acceptInvite.mockResolvedValue(serviceResult);

    const req = {
      user: { id: 'u-1' },
      params: { inviteId: 'i-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await invitesController.acceptInvite(req, res, next);

    expect(invitesServiceMock.acceptInvite).toHaveBeenCalledWith({
      userId: 'u-1',
      inviteId: 'i-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
    expect(next).not.toHaveBeenCalled();
  });

  test('declineInvite forwards IDs and returns 200', async () => {
    const serviceResult = { invite_id: 'i-2', status: 'DECLINED' };
    invitesServiceMock.declineInvite.mockResolvedValue(serviceResult);

    const req = {
      user: { id: 'u-1' },
      params: { inviteId: 'i-2' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await invitesController.declineInvite(req, res, next);

    expect(invitesServiceMock.declineInvite).toHaveBeenCalledWith({
      userId: 'u-1',
      inviteId: 'i-2',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  test('cancelInvite forwards IDs and returns 200', async () => {
    const serviceResult = { invite_id: 'i-3', status: 'CANCELED' };
    invitesServiceMock.cancelInvite.mockResolvedValue(serviceResult);

    const req = {
      user: { id: 'u-1' },
      params: { inviteId: 'i-3' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await invitesController.cancelInvite(req, res, next);

    expect(invitesServiceMock.cancelInvite).toHaveBeenCalledWith({
      userId: 'u-1',
      inviteId: 'i-3',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  test('getTaskInvites falls back to default pagination for invalid values', async () => {
    const serviceResult = { items: [], page: 1, size: 20, total: 0 };
    invitesServiceMock.getTaskInvites.mockResolvedValue(serviceResult);

    const req = {
      user: { id: 'u-1' },
      params: { taskId: 't-1' },
      query: { page: 'abc', size: 'not-a-number' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await invitesController.getTaskInvites(req, res, next);

    expect(invitesServiceMock.getTaskInvites).toHaveBeenCalledWith({
      userId: 'u-1',
      taskId: 't-1',
      page: 1,
      size: 20,
      status: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});
