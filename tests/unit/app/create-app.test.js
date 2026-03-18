import { jest } from '@jest/globals';

const appUseMock = jest.fn();
const appGetMock = jest.fn();
const appInstance = { use: appUseMock, get: appGetMock };
const expressJsonMock = jest.fn(() => 'json-mw');
const expressFactoryMock = jest.fn(() => appInstance);
expressFactoryMock.json = expressJsonMock;

const cookieParserMock = jest.fn(() => 'cookie-mw');
const setupMock = jest.fn(() => 'swagger-setup-mw');
const createSwaggerSpecMock = jest.fn(() => ({ openapi: '3.0.0' }));

jest.unstable_mockModule('express', () => ({
  default: expressFactoryMock,
}));

jest.unstable_mockModule('cookie-parser', () => ({
  default: cookieParserMock,
}));

jest.unstable_mockModule('swagger-ui-express', () => ({
  default: {
    serve: 'swagger-serve-mw',
    setup: setupMock,
  },
}));

jest.unstable_mockModule('../../src/config/cors.js', () => ({
  corsMiddleware: 'cors-mw',
}));

jest.unstable_mockModule('../../src/docs/swagger.js', () => ({
  createSwaggerSpec: createSwaggerSpecMock,
}));

jest.unstable_mockModule('../../src/routes/index.js', () => ({
  apiRouter: 'api-router',
}));

jest.unstable_mockModule('../../src/middleware/error.middleware.js', () => ({
  errorMiddleware: 'error-mw',
}));

const { createApp } = await import('../../../src/app.js');

describe('createApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('wires middlewares, docs route, api router, and error middleware', () => {
    const app = createApp('http://example.test');

    expect(expressFactoryMock).toHaveBeenCalled();
    expect(createSwaggerSpecMock).toHaveBeenCalledWith('http://example.test');
    expect(setupMock).toHaveBeenCalledWith({ openapi: '3.0.0' });

    expect(appUseMock).toHaveBeenCalledWith('cors-mw');
    expect(appUseMock).toHaveBeenCalledWith('json-mw');
    expect(appUseMock).toHaveBeenCalledWith('cookie-mw');
    expect(appGetMock).toHaveBeenCalledWith(
      '/api/v1/docs/openapi.json',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(appUseMock).toHaveBeenCalledWith('/api/v1/docs', 'swagger-serve-mw', 'swagger-setup-mw');
    expect(appUseMock).toHaveBeenCalledWith('/api/v1', 'api-router');
    expect(appUseMock).toHaveBeenCalledWith('error-mw');
    expect(app).toBe(appInstance);
  });

  test('uses default base url when not provided', () => {
    createApp();

    expect(createSwaggerSpecMock).toHaveBeenCalledWith('http://localhost:3000');
  });
});
