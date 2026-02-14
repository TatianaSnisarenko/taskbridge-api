import request from 'supertest';

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('health route', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
