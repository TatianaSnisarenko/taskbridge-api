import { jest } from '@jest/globals';

const prismaMock = {
  chatThread: {
    upsert: jest.fn(),
  },
};

const threadsCacheMock = {
  invalidateCachedMyThreadsCatalog: jest.fn(),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/cache/threads-catalog.js', () => threadsCacheMock);

const chatService = await import('../../../src/services/chat/index.js');

describe('chat.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    threadsCacheMock.invalidateCachedMyThreadsCatalog.mockResolvedValue(true);
  });

  test('getOrCreateChatThread returns created thread when upsert succeeds', async () => {
    prismaMock.chatThread.upsert.mockResolvedValue({ id: 'th-1' });

    const result = await chatService.getOrCreateChatThread({
      taskId: 't-1',
      companyUserId: 'c-1',
      developerUserId: 'd-1',
    });

    expect(prismaMock.chatThread.upsert).toHaveBeenCalledWith({
      where: { taskId: 't-1' },
      update: {},
      create: expect.objectContaining({
        taskId: 't-1',
        companyUserId: 'c-1',
        developerUserId: 'd-1',
      }),
    });
    expect(result).toEqual({ id: 'th-1' });
    expect(threadsCacheMock.invalidateCachedMyThreadsCatalog).toHaveBeenCalledWith('c-1');
    expect(threadsCacheMock.invalidateCachedMyThreadsCatalog).toHaveBeenCalledWith('d-1');
  });

  test('getOrCreateChatThread returns null when upsert fails', async () => {
    prismaMock.chatThread.upsert.mockRejectedValue(new Error('upsert failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await chatService.getOrCreateChatThread({
      taskId: 't-1',
      companyUserId: 'c-1',
      developerUserId: 'd-1',
    });

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
