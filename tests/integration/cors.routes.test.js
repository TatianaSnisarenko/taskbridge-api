import request from 'supertest';

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('cors middleware', () => {
  test('allows configured origin', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');

    expect(res.status).toBe(200);
  });

  test('rejects unknown origin', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://evil.test');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CORS_NOT_ALLOWED');
  });
});
