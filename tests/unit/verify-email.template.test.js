import { buildVerifyEmailTemplate } from '../../src/templates/email/verify-email.js';

describe('verify email template', () => {
  test('includes link, ttl, and contact email', () => {
    const result = buildVerifyEmailTemplate({
      link: 'http://localhost/verify?token=abc',
      ttlHours: 24,
      contactEmail: 'support@example.com',
    });

    expect(result.subject).toContain('Verify');
    expect(result.text).toContain('http://localhost/verify?token=abc');
    expect(result.text).toContain('24 hours');
    expect(result.text).toContain('support@example.com');
    expect(result.html).toContain('http://localhost/verify?token=abc');
    expect(result.html).toContain('support@example.com');
  });
});
