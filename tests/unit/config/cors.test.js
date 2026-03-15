import { jest } from '@jest/globals';

async function loadCorsConfig({ clientOrigin }) {
  jest.resetModules();

  let capturedOptions;
  const corsMock = jest.fn((options) => {
    capturedOptions = options;
    return (req, res, next) => next();
  });

  jest.unstable_mockModule('cors', () => ({
    default: corsMock,
  }));

  jest.unstable_mockModule('../../src/config/env.js', () => ({
    env: {
      clientOrigin,
      nodeEnv: 'development',
    },
  }));

  const corsConfig = await import('../../../src/config/cors.js');

  return { corsConfig, capturedOptions, corsMock };
}

describe('cors config', () => {
  test('parses allowed origins list', async () => {
    const { corsConfig } = await loadCorsConfig({
      clientOrigin: 'http://a.test, http://b.test',
    });

    expect(corsConfig.allowedOriginsList).toEqual(['http://a.test', 'http://b.test']);
  });

  test('origin callback allows missing origin', async () => {
    const { capturedOptions } = await loadCorsConfig({ clientOrigin: 'http://a.test' });
    const cb = jest.fn();

    capturedOptions.origin(undefined, cb);

    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test('origin callback allows listed origin', async () => {
    const { capturedOptions } = await loadCorsConfig({ clientOrigin: 'http://a.test' });
    const cb = jest.fn();

    capturedOptions.origin('http://a.test', cb);

    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test('origin callback allows unknown origin in non-production', async () => {
    const { capturedOptions } = await loadCorsConfig({ clientOrigin: 'http://a.test' });
    const cb = jest.fn();

    capturedOptions.origin('http://evil.test', cb);

    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test('origin callback rejects unknown origin in production', async () => {
    jest.resetModules();

    let capturedOptions;
    const corsMock = jest.fn((options) => {
      capturedOptions = options;
      return (req, res, next) => next();
    });

    jest.unstable_mockModule('cors', () => ({
      default: corsMock,
    }));

    jest.unstable_mockModule('../../src/config/env.js', () => ({
      env: {
        clientOrigin: 'http://a.test',
        nodeEnv: 'production',
      },
    }));

    await import('../../../src/config/cors.js');
    const cb = jest.fn();

    capturedOptions.origin('http://evil.test', cb);

    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });

  test('origin callback allows listed origin in production', async () => {
    jest.resetModules();

    let capturedOptions;
    const corsMock = jest.fn((options) => {
      capturedOptions = options;
      return (req, res, next) => next();
    });

    jest.unstable_mockModule('cors', () => ({
      default: corsMock,
    }));

    jest.unstable_mockModule('../../src/config/env.js', () => ({
      env: {
        clientOrigin: 'http://a.test',
        nodeEnv: 'production',
      },
    }));

    await import('../../../src/config/cors.js');
    const cb = jest.fn();

    capturedOptions.origin('http://a.test', cb);

    expect(cb).toHaveBeenCalledWith(null, true);
  });
});
