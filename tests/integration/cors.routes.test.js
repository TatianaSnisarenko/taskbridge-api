import { jest } from '@jest/globals';
import request from 'supertest';

jest.unstable_mockModule('../../src/services/email/index.js', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn(),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('cors middleware', () => {
  test('allows configured origin', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');

    expect(res.status).toBe(200);
  });

  test('allows unknown origin in non-production', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://evil.test');

    expect(res.status).toBe(200);
  });
});
