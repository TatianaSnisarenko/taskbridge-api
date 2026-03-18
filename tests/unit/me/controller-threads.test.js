import { jest } from '@jest/globals';

const meServiceMock = {
  getMyThreads: jest.fn(),
  getThreadById: jest.fn(),
  getThreadMessages: jest.fn(),
  createMessage: jest.fn(),
  markThreadAsRead: jest.fn(),
  markThreadAsImportant: jest.fn(),
  markThreadAsUnimportant: jest.fn(),
  markMessageAsImportant: jest.fn(),
  markMessageAsUnimportant: jest.fn(),
};

jest.unstable_mockModule('../../src/services/me/index.js', () => meServiceMock);

const meController = await import('../../../src/controllers/me.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('me.controller - chat threads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      query: { page: '1', size: '20', search: 'keyword', important_only: 'true' },
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
      importantOnly: true,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getMyThreads uses default search and pagination values', async () => {
    meServiceMock.getMyThreads.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    const req = {
      user: { id: 'u-1' },
      headers: { 'x-persona': 'company' },
      query: {},
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyThreads(req, res, next);

    expect(meServiceMock.getMyThreads).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'company',
      page: 1,
      size: 20,
      search: '',
      importantOnly: false,
    });
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
      importantOnly: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getThreadMessages defaults to page 1 and size 50 when invalid params provided', async () => {
    meServiceMock.getThreadMessages.mockResolvedValue({
      items: [],
      page: 1,
      size: 50,
      total: 0,
    });

    const req = {
      user: { id: 'u-1' },
      headers: { 'x-persona': 'company' },
      params: { threadId: 'th-1' },
      query: { page: 'abc', size: null },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getThreadMessages(req, res, next);

    expect(meServiceMock.getThreadMessages).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'company',
      threadId: 'th-1',
      page: 1,
      size: 50,
      importantOnly: false,
    });
  });

  test('getThreadMessages parses important_only query flag', async () => {
    meServiceMock.getThreadMessages.mockResolvedValue({
      items: [],
      page: 1,
      size: 50,
      total: 0,
    });

    const req = {
      user: { id: 'u-1' },
      headers: { 'x-persona': 'developer' },
      params: { threadId: 'th-1' },
      query: { important_only: 'true' },
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
      importantOnly: true,
    });
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
      files: [],
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.createMessage(req, res, next);

    expect(meServiceMock.createMessage).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'company',
      threadId: 'th-1',
      text: 'Message text',
      files: [],
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('createMessage passes uploaded files to service', async () => {
    meServiceMock.createMessage.mockResolvedValue({
      id: 'm-2',
      threadId: 'th-1',
      text: 'Message with file',
    });

    const req = {
      user: { id: 'u-1' },
      headers: { 'x-persona': 'developer' },
      params: { threadId: 'th-1' },
      body: { text: 'Message with file' },
      files: [{ originalname: 'spec.pdf', size: 512, mimetype: 'application/pdf' }],
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.createMessage(req, res, next);

    expect(meServiceMock.createMessage).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'developer',
      threadId: 'th-1',
      text: 'Message with file',
      files: req.files,
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

  test('markMessageAsImportant marks message as important in thread', async () => {
    meServiceMock.markMessageAsImportant.mockResolvedValue({
      id: 'm-1',
      important_at: '2026-03-18T09:15:00.000Z',
    });

    const req = {
      user: { id: 'u-1' },
      persona: 'developer',
      params: { threadId: 'th-1', messageId: 'm-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.markMessageAsImportant(req, res, next);

    expect(meServiceMock.markMessageAsImportant).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'developer',
      threadId: 'th-1',
      messageId: 'm-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 'm-1',
      important_at: '2026-03-18T09:15:00.000Z',
    });
  });

  test('markMessageAsUnimportant removes important mark from message', async () => {
    meServiceMock.markMessageAsUnimportant.mockResolvedValue({
      id: 'm-1',
      important_at: null,
    });

    const req = {
      user: { id: 'u-1' },
      persona: 'company',
      params: { threadId: 'th-1', messageId: 'm-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.markMessageAsUnimportant(req, res, next);

    expect(meServiceMock.markMessageAsUnimportant).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'company',
      threadId: 'th-1',
      messageId: 'm-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 'm-1',
      important_at: null,
    });
  });

  test('markThreadAsImportant marks thread as important', async () => {
    meServiceMock.markThreadAsImportant.mockResolvedValue({
      thread_id: 'th-1',
      important_at: '2026-03-18T12:40:00.000Z',
    });

    const req = {
      user: { id: 'u-1' },
      persona: 'developer',
      params: { threadId: 'th-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.markThreadAsImportant(req, res, next);

    expect(meServiceMock.markThreadAsImportant).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'developer',
      threadId: 'th-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      thread_id: 'th-1',
      important_at: '2026-03-18T12:40:00.000Z',
    });
  });

  test('markThreadAsUnimportant clears thread important mark', async () => {
    meServiceMock.markThreadAsUnimportant.mockResolvedValue({
      thread_id: 'th-1',
      important_at: null,
    });

    const req = {
      user: { id: 'u-1' },
      persona: 'company',
      params: { threadId: 'th-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.markThreadAsUnimportant(req, res, next);

    expect(meServiceMock.markThreadAsUnimportant).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'company',
      threadId: 'th-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      thread_id: 'th-1',
      important_at: null,
    });
  });
});
