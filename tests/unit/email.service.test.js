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
    },
  }));

  const buildTemplateMock = jest.fn(() => ({
    subject: 'Verify',
    text: 'Verify text',
    html: '<p>Verify</p>',
  }));

  jest.unstable_mockModule('../../src/templates/email/verify-email.js', () => ({
    buildVerifyEmailTemplate: buildTemplateMock,
  }));

  const emailService = await import('../../src/services/email.service.js');

  return { emailService, createTransportMock, sendMailMock, buildTemplateMock };
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
    const { emailService, sendMailMock, buildTemplateMock } = await loadEmailService();

    await emailService.sendVerificationEmail({ to: 'user@example.com', token: 'token-123' });

    expect(buildTemplateMock).toHaveBeenCalledWith({
      link: 'http://localhost:3000/api/v1/auth/verify-email?token=token-123',
      ttlHours: 24,
      contactEmail: 'test@example.com',
    });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'TeamUp IT <test@example.com>',
      to: 'user@example.com',
      subject: 'Verify',
      text: 'Verify text',
      html: '<p>Verify</p>',
    });
  });
});
