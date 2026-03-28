import {
  enqueueEmailOutbox,
  sendEmailWithRecovery,
  sendVerificationEmailWithRecovery,
  sendResetPasswordEmailWithRecovery,
  processEmailOutboxBatch,
  cleanupEmailOutbox,
  getEmailOutboxOverview,
} from '../../../src/services/email-outbox/index.js';

describe('email-outbox index exports', () => {
  test('re-exports all public functions', () => {
    expect(typeof enqueueEmailOutbox).toBe('function');
    expect(typeof sendEmailWithRecovery).toBe('function');
    expect(typeof sendVerificationEmailWithRecovery).toBe('function');
    expect(typeof sendResetPasswordEmailWithRecovery).toBe('function');
    expect(typeof processEmailOutboxBatch).toBe('function');
    expect(typeof cleanupEmailOutbox).toBe('function');
    expect(typeof getEmailOutboxOverview).toBe('function');
  });
});
