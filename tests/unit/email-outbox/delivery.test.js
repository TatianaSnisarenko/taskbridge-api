import { jest } from '@jest/globals';

const sendEmailMock = jest.fn();
const prismaMock = {
  emailOutbox: {
    create: jest.fn(),
  },
};
const verifyTemplateMock = jest.fn();
const resetTemplateMock = jest.fn();

function mockEnv(overrides = {}) {
  return {
    emailOutboxEnabled: true,
    emailOutboxMaxAttempts: 8,
    emailOutboxMessageTtlHours: 24,
    appBaseUrl: 'http://localhost:3000',
    frontendBaseUrl: 'http://localhost:5173',
    emailVerificationTtlHours: 24,
    passwordResetTokenTtlMinutes: 60,
    ...overrides,
  };
}

async function importDeliveryWithEnv(envOverrides = {}) {
  jest.resetModules();

  jest.unstable_mockModule('../../src/services/email/index.js', () => ({
    sendEmail: sendEmailMock,
  }));

  jest.unstable_mockModule('../../src/db/prisma.js', () => ({
    prisma: prismaMock,
  }));

  jest.unstable_mockModule('../../src/templates/email/verify-email.js', () => ({
    buildVerifyEmailTemplate: verifyTemplateMock,
  }));

  jest.unstable_mockModule('../../src/templates/email/reset-password.js', () => ({
    buildResetPasswordTemplate: resetTemplateMock,
  }));

  jest.unstable_mockModule('../../src/config/env.js', () => ({
    env: mockEnv(envOverrides),
  }));

  return import('../../../src/services/email-outbox/delivery.js');
}

describe('email-outbox delivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyTemplateMock.mockReturnValue({
      subject: 'Verify subject',
      text: 'Verify text',
      html: '<p>Verify</p>',
    });
    resetTemplateMock.mockReturnValue({
      subject: 'Reset subject',
      text: 'Reset text',
      html: '<p>Reset</p>',
    });
  });

  test('sendEmailWithRecovery returns sent=true on success', async () => {
    const { sendEmailWithRecovery } = await importDeliveryWithEnv();
    sendEmailMock.mockResolvedValue(undefined);

    const result = await sendEmailWithRecovery({
      to: 'a@example.com',
      subject: 'S',
      text: 'T',
      html: '<p>H</p>',
    });

    expect(result).toEqual({ sent: true, queued: false });
    expect(prismaMock.emailOutbox.create).not.toHaveBeenCalled();
  });

  test('sendEmailWithRecovery queues on recoverable error', async () => {
    const { sendEmailWithRecovery } = await importDeliveryWithEnv();
    sendEmailMock.mockRejectedValue({ code: 'ETIMEDOUT', message: 'timeout' });
    prismaMock.emailOutbox.create.mockResolvedValue({ id: 'm1' });

    const result = await sendEmailWithRecovery({
      to: 'a@example.com',
      subject: 'S',
      text: 'T',
      html: '<p>H</p>',
      maxAttempts: 5,
    });

    expect(result).toEqual({ sent: false, queued: true });
    expect(prismaMock.emailOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          to: 'a@example.com',
          maxAttempts: 5,
          status: 'PENDING',
        }),
      })
    );
  });

  test('sendEmailWithRecovery throws on non-recoverable error', async () => {
    const { sendEmailWithRecovery } = await importDeliveryWithEnv();
    sendEmailMock.mockRejectedValue({ responseCode: 550, message: 'mailbox unavailable' });

    await expect(
      sendEmailWithRecovery({
        to: 'a@example.com',
        subject: 'S',
        text: 'T',
        html: '<p>H</p>',
      })
    ).rejects.toMatchObject({ responseCode: 550 });
  });

  test('enqueueEmailOutbox returns null when outbox disabled', async () => {
    const { enqueueEmailOutbox } = await importDeliveryWithEnv({ emailOutboxEnabled: false });

    const result = await enqueueEmailOutbox({
      to: 'a@example.com',
      subject: 'S',
      text: 'T',
      html: '<p>H</p>',
    });

    expect(result).toBeNull();
    expect(prismaMock.emailOutbox.create).not.toHaveBeenCalled();
  });

  test('enqueueEmailOutbox falls back to default maxAttempts and sanitizes ttlHours', async () => {
    const { enqueueEmailOutbox } = await importDeliveryWithEnv();
    prismaMock.emailOutbox.create.mockResolvedValue({ id: 'm2' });

    await enqueueEmailOutbox({
      to: 'a@example.com',
      subject: 'S',
      text: 'T',
      html: '<p>H</p>',
      maxAttempts: 0,
      ttlHours: 0,
    });

    const payload = prismaMock.emailOutbox.create.mock.calls[0][0];
    expect(payload.data.maxAttempts).toBe(8);
    expect(payload.data.expiresAt).toEqual(expect.any(Date));
  });

  test('sendVerificationEmailWithRecovery builds verify link with token', async () => {
    const { sendVerificationEmailWithRecovery } = await importDeliveryWithEnv();
    sendEmailMock.mockResolvedValue(undefined);

    await sendVerificationEmailWithRecovery({
      to: 'a@example.com',
      token: 'verify-token',
    });

    expect(verifyTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        link: expect.stringContaining('/api/v1/auth/verify-email'),
      })
    );
    const link = verifyTemplateMock.mock.calls[0][0].link;
    expect(link).toContain('token=verify-token');
  });

  test('sendResetPasswordEmailWithRecovery builds reset link with token', async () => {
    const { sendResetPasswordEmailWithRecovery } = await importDeliveryWithEnv();
    sendEmailMock.mockResolvedValue(undefined);

    await sendResetPasswordEmailWithRecovery({
      to: 'a@example.com',
      token: 'reset-token',
    });

    expect(resetTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        link: expect.stringContaining('/reset-password'),
      })
    );
    const link = resetTemplateMock.mock.calls[0][0].link;
    expect(link).toContain('token=reset-token');
  });
});
