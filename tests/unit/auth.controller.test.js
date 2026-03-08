import { jest } from '@jest/globals';

const authServiceMock = {
  login: jest.fn(),
  refresh: jest.fn(),
  verifyEmail: jest.fn(),
};

const buildVerifyEmailSuccessPageMock = jest.fn();

jest.unstable_mockModule('../../src/services/auth/index.js', () => authServiceMock);
jest.unstable_mockModule('../../src/templates/email/verify-email-success.js', () => ({
  buildVerifyEmailSuccessPage: buildVerifyEmailSuccessPageMock,
}));

const authController = await import('../../src/controllers/auth.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
}

describe('auth.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('login sets refresh cookie and returns access token', async () => {
    authServiceMock.login.mockResolvedValue({
      accessToken: 'access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token',
    });

    const req = { body: { email: 'user@example.com', password: 'Passw0rd!' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.login(req, res, next);

    expect(authServiceMock.login).toHaveBeenCalledWith(req.body);
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/v1/auth',
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ access_token: 'access-token', expires_in: 900 });
    expect(next).not.toHaveBeenCalled();
  });

  test('refresh uses cookie token and returns rotated credentials', async () => {
    authServiceMock.refresh.mockResolvedValue({
      accessToken: 'new-access-token',
      expiresIn: 900,
      refreshToken: 'new-refresh-token',
    });

    const req = { cookies: { refresh_token: 'old-refresh-token' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.refresh(req, res, next);

    expect(authServiceMock.refresh).toHaveBeenCalledWith({ refreshToken: 'old-refresh-token' });
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh-token',
      expect.objectContaining({ path: '/api/v1/auth' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ access_token: 'new-access-token', expires_in: 900 });
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyEmail returns success html page', async () => {
    authServiceMock.verifyEmail.mockResolvedValue({ email: 'verified@example.com' });
    buildVerifyEmailSuccessPageMock.mockReturnValue('<html>ok</html>');

    const req = { query: { token: 'verify-token' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.verifyEmail(req, res, next);

    expect(authServiceMock.verifyEmail).toHaveBeenCalledWith({ token: 'verify-token' });
    expect(buildVerifyEmailSuccessPageMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'verified@example.com' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(res.send).toHaveBeenCalledWith('<html>ok</html>');
    expect(next).not.toHaveBeenCalled();
  });
});
