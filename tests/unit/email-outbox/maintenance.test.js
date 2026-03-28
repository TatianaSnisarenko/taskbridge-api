import { jest } from '@jest/globals';

const prismaMock = {
  emailOutbox: {
    deleteMany: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

async function importMaintenance() {
  jest.resetModules();

  jest.unstable_mockModule('../../src/db/prisma.js', () => ({
    prisma: prismaMock,
  }));

  jest.unstable_mockModule('../../src/config/env.js', () => ({
    env: {
      emailOutboxSentRetentionDays: 3,
      emailOutboxFailedRetentionDays: 7,
    },
  }));

  return import('../../../src/services/email-outbox/maintenance.js');
}

describe('email-outbox maintenance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('cleanupEmailOutbox returns deleted counters', async () => {
    const { cleanupEmailOutbox } = await importMaintenance();
    prismaMock.$transaction.mockResolvedValue([{ count: 2 }, { count: 3 }, { count: 4 }]);

    const result = await cleanupEmailOutbox();

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(result).toEqual({ deletedExpired: 2, deletedSent: 3, deletedFailed: 4 });
  });

  test('getEmailOutboxOverview returns counters and items', async () => {
    const { getEmailOutboxOverview } = await importMaintenance();

    prismaMock.emailOutbox.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5);

    prismaMock.emailOutbox.findMany.mockResolvedValueOnce([{ id: 'm1', status: 'PENDING' }]);

    const result = await getEmailOutboxOverview({ limit: 50, status: 'retrying' });

    expect(prismaMock.emailOutbox.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'RETRYING' },
        take: 50,
      })
    );
    expect(result.counters).toEqual({
      pending: 1,
      retrying: 2,
      processing: 3,
      sent: 4,
      failed: 5,
    });
    expect(result.items).toEqual([{ id: 'm1', status: 'PENDING' }]);
  });

  test('getEmailOutboxOverview normalizes negative limits and empty status', async () => {
    const { getEmailOutboxOverview } = await importMaintenance();

    prismaMock.emailOutbox.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    prismaMock.emailOutbox.findMany.mockResolvedValueOnce([]);

    await getEmailOutboxOverview({ limit: -5, status: '   ' });

    expect(prismaMock.emailOutbox.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        take: 1,
      })
    );
  });

  test('getEmailOutboxOverview clamps large limits to 100', async () => {
    const { getEmailOutboxOverview } = await importMaintenance();

    prismaMock.emailOutbox.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    prismaMock.emailOutbox.findMany.mockResolvedValueOnce([]);

    await getEmailOutboxOverview({ limit: 999, status: 'SENT' });

    expect(prismaMock.emailOutbox.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'SENT' },
        take: 100,
      })
    );
  });

  test('getEmailOutboxOverview uses default limit when provided zero', async () => {
    const { getEmailOutboxOverview } = await importMaintenance();

    prismaMock.emailOutbox.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    prismaMock.emailOutbox.findMany.mockResolvedValueOnce([]);

    await getEmailOutboxOverview({ limit: 0, status: 'PENDING' });

    expect(prismaMock.emailOutbox.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PENDING' },
        take: 20,
      })
    );
  });

  test('getEmailOutboxOverview handles non-string status and non-numeric limit', async () => {
    const { getEmailOutboxOverview } = await importMaintenance();

    prismaMock.emailOutbox.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    prismaMock.emailOutbox.findMany.mockResolvedValueOnce([]);

    await getEmailOutboxOverview({ limit: 'abc', status: 123 });

    expect(prismaMock.emailOutbox.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        take: 20,
      })
    );
  });
});
