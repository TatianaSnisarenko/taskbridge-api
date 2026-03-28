import { jest } from '@jest/globals';

const emailOutboxServiceMock = {
  getEmailOutboxOverview: jest.fn(),
};

jest.unstable_mockModule('../../src/services/email-outbox/index.js', () => ({
  ...emailOutboxServiceMock,
}));

const adminController = await import('../../../src/controllers/admin.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('admin.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getEmailOutboxOverview maps payload fields', async () => {
    emailOutboxServiceMock.getEmailOutboxOverview.mockResolvedValue({
      counters: {
        pending: 3,
        retrying: 1,
        processing: 0,
        sent: 10,
        failed: 2,
      },
      items: [
        {
          id: 'msg-1',
          to: 'a@example.com',
          subject: 'Subject',
          status: 'RETRYING',
          attempts: 2,
          maxAttempts: 8,
          nextAttemptAt: new Date('2026-03-28T10:00:00.000Z'),
          lastAttemptAt: new Date('2026-03-28T09:55:00.000Z'),
          sentAt: null,
          expiresAt: new Date('2026-03-29T09:00:00.000Z'),
          lastError: 'throttled',
          createdAt: new Date('2026-03-28T09:00:00.000Z'),
          updatedAt: new Date('2026-03-28T09:55:00.000Z'),
        },
      ],
    });

    const req = {
      query: { limit: '15', status: 'retrying' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await adminController.getEmailOutboxOverview(req, res, next);

    expect(emailOutboxServiceMock.getEmailOutboxOverview).toHaveBeenCalledWith({
      limit: '15',
      status: 'retrying',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      counters: {
        pending: 3,
        retrying: 1,
        processing: 0,
        sent: 10,
        failed: 2,
      },
      items: [
        expect.objectContaining({
          id: 'msg-1',
          to: 'a@example.com',
          status: 'RETRYING',
          max_attempts: 8,
          last_error: 'throttled',
        }),
      ],
    });
  });
});
