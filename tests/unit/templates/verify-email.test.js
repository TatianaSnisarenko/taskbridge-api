import { buildVerifyEmailTemplate } from '../../../src/templates/email/verify-email.js';

describe('verify email template', () => {
  test('includes link and ttl', () => {
    const result = buildVerifyEmailTemplate({
      link: 'http://localhost/verify?token=abc',
      ttlHours: 24,
    });

    expect(result.subject).toContain('Verify');
    expect(result.text).toContain('http://localhost/verify?token=abc');
    expect(result.text).toContain('24 hours');
    expect(result.html).toContain('http://localhost/verify?token=abc');
  });
});
