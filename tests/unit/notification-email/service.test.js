import { jest } from '@jest/globals';

const sendEmailMock = jest.fn();
const buildTemplateMock = jest.fn();

async function loadService({
  emailNotificationsEnabled = true,
  frontendBaseUrl = 'http://frontend',
} = {}) {
  jest.resetModules();

  jest.unstable_mockModule('../../src/config/env.js', () => ({
    env: {
      emailNotificationsEnabled,
      frontendBaseUrl,
    },
  }));

  jest.unstable_mockModule('../../src/services/email/index.js', () => ({
    sendEmail: sendEmailMock,
  }));

  jest.unstable_mockModule('../../src/templates/email/notification.js', () => ({
    buildNotificationEmailTemplate: buildTemplateMock,
  }));

  return import('../../../src/services/notification-email/index.js');
}

describe('notification-email.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns early when email notifications are disabled', async () => {
    const service = await loadService({ emailNotificationsEnabled: false });

    await service.sendImportantNotificationEmail({
      type: 'APPLICATION_ACCEPTED',
      recipient: { email: 'user@example.com', name: 'User', email_verified: true },
      task: { id: 't1', title: 'Task 1' },
    });

    expect(buildTemplateMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('returns early when recipient email is not verified', async () => {
    const service = await loadService({ emailNotificationsEnabled: true });

    await service.sendImportantNotificationEmail({
      type: 'APPLICATION_ACCEPTED',
      recipient: { email: 'user@example.com', name: 'User', email_verified: false },
      task: { id: 't1', title: 'Task 1' },
    });

    expect(buildTemplateMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('sends email using default frontend CTA URL', async () => {
    const service = await loadService({
      emailNotificationsEnabled: true,
      frontendBaseUrl: 'http://frontend-default',
    });

    buildTemplateMock.mockReturnValue({
      subject: 'Subject',
      text: 'Text',
      html: '<p>HTML</p>',
    });

    await service.sendImportantNotificationEmail({
      type: 'APPLICATION_ACCEPTED',
      recipient: { email: 'user@example.com', name: 'User', email_verified: true },
      task: { id: 't1', title: 'Task 1' },
    });

    expect(buildTemplateMock).toHaveBeenCalledWith({
      type: 'APPLICATION_ACCEPTED',
      taskTitle: 'Task 1',
      ctaUrl: 'http://frontend-default',
      recipientName: 'User',
    });
    expect(sendEmailMock).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Subject',
      text: 'Text',
      html: '<p>HTML</p>',
    });
  });

  test('uses custom CTA URL when provided', async () => {
    const service = await loadService({ emailNotificationsEnabled: true });

    buildTemplateMock.mockReturnValue({
      subject: 'Subject',
      text: 'Text',
      html: '<p>HTML</p>',
    });

    await service.sendImportantNotificationEmail({
      type: 'TASK_COMPLETED',
      recipient: { email: 'user@example.com', name: 'User', email_verified: true },
      task: { id: 't9', title: 'Task 9' },
      ctaUrl: 'http://custom-cta',
    });

    expect(buildTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({ ctaUrl: 'http://custom-cta' })
    );
  });

  test('swallows template/email errors and logs once', async () => {
    const service = await loadService({ emailNotificationsEnabled: true });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    buildTemplateMock.mockImplementation(() => {
      throw new Error('template failed');
    });

    await expect(
      service.sendImportantNotificationEmail({
        type: 'COMPLETION_REQUESTED',
        recipient: { email: 'user@example.com', name: 'User', email_verified: true },
        task: { id: 't2', title: 'Task 2' },
      })
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
