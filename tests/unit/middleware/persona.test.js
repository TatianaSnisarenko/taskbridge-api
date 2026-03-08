import { jest } from '@jest/globals';

async function loadPersonaMiddleware({ prismaMock }) {
  jest.resetModules();

  jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

  const { requirePersona } = await import('../../../src/middleware/persona.middleware.js');
  return requirePersona;
}

describe('persona.middleware', () => {
  test('rejects missing persona header', async () => {
    const prismaMock = {
      developerProfile: { findUnique: jest.fn() },
      companyProfile: { findUnique: jest.fn() },
    };
    const requirePersona = await loadPersonaMiddleware({ prismaMock });
    const middleware = requirePersona();

    const req = { headers: {}, user: { id: 'u1' } };
    const next = jest.fn();

    await middleware(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.status).toBe(400);
    expect(err.code).toBe('PERSONA_REQUIRED');
  });

  test('rejects invalid persona', async () => {
    const prismaMock = {
      developerProfile: { findUnique: jest.fn() },
      companyProfile: { findUnique: jest.fn() },
    };
    const requirePersona = await loadPersonaMiddleware({ prismaMock });
    const middleware = requirePersona();

    const req = { headers: { 'x-persona': 'admin' }, user: { id: 'u1' } };
    const next = jest.fn();

    await middleware(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.status).toBe(400);
    expect(err.code).toBe('PERSONA_INVALID');
  });

  test('rejects when user missing', async () => {
    const prismaMock = {
      developerProfile: { findUnique: jest.fn() },
      companyProfile: { findUnique: jest.fn() },
    };
    const requirePersona = await loadPersonaMiddleware({ prismaMock });
    const middleware = requirePersona();

    const req = { headers: { 'x-persona': 'developer' } };
    const next = jest.fn();

    await middleware(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.status).toBe(401);
    expect(err.code).toBe('AUTH_REQUIRED');
  });

  test('rejects when developer profile missing', async () => {
    const prismaMock = {
      developerProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      companyProfile: { findUnique: jest.fn() },
    };
    const requirePersona = await loadPersonaMiddleware({ prismaMock });
    const middleware = requirePersona();

    const req = { headers: { 'x-persona': 'developer' }, user: { id: 'u1' } };
    const next = jest.fn();

    await middleware(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.status).toBe(403);
    expect(err.code).toBe('PERSONA_NOT_AVAILABLE');
  });

  test('rejects when company profile missing', async () => {
    const prismaMock = {
      developerProfile: { findUnique: jest.fn() },
      companyProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const requirePersona = await loadPersonaMiddleware({ prismaMock });
    const middleware = requirePersona();

    const req = { headers: { 'x-persona': 'company' }, user: { id: 'u1' } };
    const next = jest.fn();

    await middleware(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.status).toBe(403);
    expect(err.code).toBe('PERSONA_NOT_AVAILABLE');
  });

  test('accepts developer persona when profile exists', async () => {
    const prismaMock = {
      developerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'd1' }) },
      companyProfile: { findUnique: jest.fn() },
    };
    const requirePersona = await loadPersonaMiddleware({ prismaMock });
    const middleware = requirePersona();

    const req = { headers: { 'x-persona': 'developer' }, user: { id: 'u1' } };
    const next = jest.fn();

    await middleware(req, {}, next);

    expect(req.persona).toBe('developer');
    expect(next).toHaveBeenCalledWith();
  });

  test('accepts company persona when profile exists', async () => {
    const prismaMock = {
      developerProfile: { findUnique: jest.fn() },
      companyProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) },
    };
    const requirePersona = await loadPersonaMiddleware({ prismaMock });
    const middleware = requirePersona();

    const req = { headers: { 'x-persona': 'company' }, user: { id: 'u1' } };
    const next = jest.fn();

    await middleware(req, {}, next);

    expect(req.persona).toBe('company');
    expect(next).toHaveBeenCalledWith();
  });

  test('rejects when required persona does not match', async () => {
    const prismaMock = {
      developerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'd1' }) },
      companyProfile: { findUnique: jest.fn() },
    };
    const requirePersona = await loadPersonaMiddleware({ prismaMock });
    const middleware = requirePersona('company');

    const req = { headers: { 'x-persona': 'developer' }, user: { id: 'u1' } };
    const next = jest.fn();

    await middleware(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.status).toBe(403);
    expect(err.code).toBe('PERSONA_NOT_AVAILABLE');
  });
});
