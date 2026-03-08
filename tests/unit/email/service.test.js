import { jest } from '@jest/globals';

async function loadEmailService() {
  jest.resetModules();

  const sendMailMock = jest.fn();
  const createTransportMock = jest.fn(() => ({ sendMail: sendMailMock }));

  jest.unstable_mockModule('nodemailer', () => ({
    default: { createTransport: createTransportMock },
    createTransport: createTransportMock,
  }));

  jest.unstable_mockModule('../../src/config/env.js', () => ({
    env: {
      emailHost: 'localhost',
      emailPort: 1025,
      emailSecure: false,
      emailAddress: 'test@example.com',
      emailPassword: 'test-password',
      appBaseUrl: 'http://localhost:3000',
      emailVerificationTtlHours: 24,
      frontendBaseUrl: 'http://localhost:5173',
      passwordResetTokenTtlMinutes: 30,
    },
  }));

  const buildVerifyTemplateMock = jest.fn(() => ({
    subject: 'Verify',
    text: 'Verify text',
    html: '<p>Verify</p>',
  }));

  const buildResetTemplateMock = jest.fn(() => ({
    subject: 'Reset',
    text: 'Reset text',
    html: '<p>Reset</p>',
  }));

  jest.unstable_mockModule('../../src/templates/email/verify-email.js', () => ({
    buildVerifyEmailTemplate: buildVerifyTemplateMock,
  }));

  jest.unstable_mockModule('../../src/templates/email/reset-password.js', () => ({
    buildResetPasswordTemplate: buildResetTemplateMock,
  }));

  const emailService = await import('../../../src/services/email/index.js');

  return {
    emailService,
    createTransportMock,
    sendMailMock,
    buildVerifyTemplateMock,
    buildResetTemplateMock,
  };
}

describe('email.service', () => {
  test('sendEmail sends mail with from/to/subject', async () => {
    const { emailService, createTransportMock, sendMailMock } = await loadEmailService();

    await emailService.sendEmail({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Text',
      html: '<p>Html</p>',
    });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: { user: 'test@example.com', pass: 'test-password' },
    });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'TeamUp IT <test@example.com>',
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Text',
      html: '<p>Html</p>',
    });
  });

  test('sendVerificationEmail builds template and sends', async () => {
    const { emailService, sendMailMock, buildVerifyTemplateMock } = await loadEmailService();

    await emailService.sendVerificationEmail({ to: 'user@example.com', token: 'token-123' });

    expect(buildVerifyTemplateMock).toHaveBeenCalledWith({
      link: 'http://localhost:3000/api/v1/auth/verify-email?token=token-123',
      ttlHours: 24,
    });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'TeamUp IT <test@example.com>',
      to: 'user@example.com',
      subject: 'Verify',
      text: 'Verify text',
      html: '<p>Verify</p>',
    });
  });

  test('sendResetPasswordEmail builds template and sends', async () => {
    const { emailService, sendMailMock, buildResetTemplateMock } = await loadEmailService();

    await emailService.sendResetPasswordEmail({ to: 'user@example.com', token: 'reset-abc' });

    expect(buildResetTemplateMock).toHaveBeenCalledWith({
      link: 'http://localhost:5173/reset-password?token=reset-abc',
      ttlMinutes: 30,
    });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'TeamUp IT <test@example.com>',
      to: 'user@example.com',
      subject: 'Reset',
      text: 'Reset text',
      html: '<p>Reset</p>',
    });
  });
});
