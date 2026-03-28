import { jest } from '@jest/globals';

const authServiceMock = {
  signup: jest.fn(),
  checkEmail: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerificationEmail: jest.fn(),
  setPassword: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

const buildVerifyEmailSuccessPageMock = jest.fn();
const buildVerifyEmailExpiredPageMock = jest.fn();

jest.unstable_mockModule('../../src/services/auth/index.js', () => authServiceMock);
jest.unstable_mockModule('../../src/templates/email/verify-email-success.js', () => ({
  buildVerifyEmailSuccessPage: buildVerifyEmailSuccessPageMock,
}));
jest.unstable_mockModule('../../src/templates/email/verify-email-expired.js', () => ({
  buildVerifyEmailExpiredPage: buildVerifyEmailExpiredPageMock,
}));

const authController = await import('../../../src/controllers/auth.controller.js');

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

  test('signup returns mapped user payload', async () => {
    authServiceMock.signup.mockResolvedValue({
      userId: 'u-1',
      email: 'new@example.com',
      hasDeveloperProfile: true,
      hasCompanyProfile: false,
    });

    const req = { body: { email: 'new@example.com', password: 'Passw0rd!' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.signup(req, res, next);

    expect(authServiceMock.signup).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      user_id: 'u-1',
      email: 'new@example.com',
      hasDeveloperProfile: true,
      hasCompanyProfile: false,
    });
  });

  test('checkEmail returns email usage payload', async () => {
    authServiceMock.checkEmail.mockResolvedValue({
      email: 'new@example.com',
      in_use: false,
    });

    const req = { query: { email: 'new@example.com' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.checkEmail(req, res, next);

    expect(authServiceMock.checkEmail).toHaveBeenCalledWith({ email: 'new@example.com' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      email: 'new@example.com',
      in_use: false,
    });
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

  test('logout clears refresh cookie and returns ok status', async () => {
    const req = { cookies: { refresh_token: 'refresh-token' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.logout(req, res, next);

    expect(authServiceMock.logout).toHaveBeenCalledWith({ refreshToken: 'refresh-token' });
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/api/v1/auth' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
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

  test('verifyEmail returns expired html page when verification link has expired', async () => {
    authServiceMock.verifyEmail.mockRejectedValue({
      code: 'EMAIL_VERIFICATION_EXPIRED',
      details: { email: 'expired@example.com' },
    });
    buildVerifyEmailExpiredPageMock.mockReturnValue('<html>expired</html>');

    const req = { query: { token: 'expired-token' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.verifyEmail(req, res, next);

    expect(authServiceMock.verifyEmail).toHaveBeenCalledWith({ token: 'expired-token' });
    expect(buildVerifyEmailExpiredPageMock).toHaveBeenCalledWith(
      expect.objectContaining({ prefilledEmail: 'expired@example.com' })
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(res.send).toHaveBeenCalledWith('<html>expired</html>');
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyEmail uses empty prefilledEmail when expired error has no details email', async () => {
    authServiceMock.verifyEmail.mockRejectedValue({
      code: 'EMAIL_VERIFICATION_EXPIRED',
      details: {},
    });
    buildVerifyEmailExpiredPageMock.mockReturnValue('<html>expired-no-email</html>');

    const req = { query: { token: 'expired-token-2' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.verifyEmail(req, res, next);

    expect(buildVerifyEmailExpiredPageMock).toHaveBeenCalledWith(
      expect.objectContaining({ prefilledEmail: '' })
    );
    expect(res.send).toHaveBeenCalledWith('<html>expired-no-email</html>');
  });

  test('verifyEmail returns resend html page when verification link is invalid', async () => {
    authServiceMock.verifyEmail.mockRejectedValue({
      code: 'EMAIL_VERIFICATION_INVALID',
    });
    buildVerifyEmailExpiredPageMock.mockReturnValue('<html>invalid</html>');

    const req = { query: { token: 'invalid-token' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.verifyEmail(req, res, next);

    expect(authServiceMock.verifyEmail).toHaveBeenCalledWith({ token: 'invalid-token' });
    expect(buildVerifyEmailExpiredPageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Invalid Link',
        prefilledEmail: '',
      })
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(res.send).toHaveBeenCalledWith('<html>invalid</html>');
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyEmail returns success html page when email is already verified', async () => {
    authServiceMock.verifyEmail.mockRejectedValue({
      code: 'EMAIL_ALREADY_VERIFIED',
      details: { email: 'verified@example.com' },
    });
    buildVerifyEmailSuccessPageMock.mockReturnValue('<html>already-verified</html>');

    const req = { query: { token: 'any-token' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.verifyEmail(req, res, next);

    expect(authServiceMock.verifyEmail).toHaveBeenCalledWith({ token: 'any-token' });
    expect(buildVerifyEmailSuccessPageMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'verified@example.com' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(res.send).toHaveBeenCalledWith('<html>already-verified</html>');
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyEmail forwards unexpected errors to next', async () => {
    const unexpected = new Error('unexpected failure');
    authServiceMock.verifyEmail.mockRejectedValue(unexpected);

    const req = { query: { token: 'any-token' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.verifyEmail(req, res, next);

    expect(next).toHaveBeenCalledWith(unexpected);
    expect(res.send).not.toHaveBeenCalled();
  });

  test('resendVerification returns ok with email', async () => {
    authServiceMock.resendVerificationEmail.mockResolvedValue({ email: 'user@example.com' });

    const req = { body: { email: 'user@example.com' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.resendVerification(req, res, next);

    expect(authServiceMock.resendVerificationEmail).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'ok', email: 'user@example.com' });
  });

  test('setPassword returns mapped payload', async () => {
    authServiceMock.setPassword.mockResolvedValue({
      userId: 'u-1',
      passwordSet: true,
      updatedAt: '2026-03-08T12:00:00.000Z',
    });

    const req = { user: { id: 'u-1' }, body: { password: 'NewPassw0rd!' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.setPassword(req, res, next);

    expect(authServiceMock.setPassword).toHaveBeenCalledWith({
      userId: 'u-1',
      password: 'NewPassw0rd!',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      user_id: 'u-1',
      password_set: true,
      updated_at: '2026-03-08T12:00:00.000Z',
    });
  });

  test('forgotPassword always returns ok true', async () => {
    const req = { body: { email: 'missing-or-existing@example.com' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.forgotPassword(req, res, next);

    expect(authServiceMock.forgotPassword).toHaveBeenCalledWith({
      email: 'missing-or-existing@example.com',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  test('resetPassword returns password_reset true', async () => {
    const req = { body: { token: 'reset-token', new_password: 'ResetPassw0rd!' } };
    const res = createResponseMock();
    const next = jest.fn();

    await authController.resetPassword(req, res, next);

    expect(authServiceMock.resetPassword).toHaveBeenCalledWith({
      token: 'reset-token',
      newPassword: 'ResetPassw0rd!',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ password_reset: true });
  });
});
