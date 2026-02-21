import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/api/v1/auth',
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  };
}

export const signup = asyncHandler(async (req, res) => {
  const { userId, email, hasDeveloperProfile, hasCompanyProfile } = await authService.signup(
    req.body
  );
  return res.status(201).json({
    user_id: userId,
    email,
    hasDeveloperProfile,
    hasCompanyProfile,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { accessToken, expiresIn, refreshToken } = await authService.login(req.body);
  res.cookie('refresh_token', refreshToken, refreshCookieOptions());
  return res.status(200).json({ access_token: accessToken, expires_in: expiresIn });
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  const {
    accessToken,
    expiresIn,
    refreshToken: nextRefresh,
  } = await authService.refresh({
    refreshToken,
  });

  res.cookie('refresh_token', nextRefresh, refreshCookieOptions());
  return res.status(200).json({ access_token: accessToken, expires_in: expiresIn });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  await authService.logout({ refreshToken });
  res.clearCookie('refresh_token', { path: '/api/v1/auth' });
  return res.status(200).json({ status: 'ok' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email } = await authService.verifyEmail({ token: req.query?.token });

  // Return HTML page instead of JSON
  const { buildVerifyEmailSuccessPage } =
    await import('../templates/email/verify-email-success.js');
  const html = buildVerifyEmailSuccessPage({
    email,
    frontendUrl: env.frontendBaseUrl,
  });

  return res.status(200).set('Content-Type', 'text/html').send(html);
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = await authService.resendVerificationEmail({ email: req.body.email });
  return res.status(200).json({ status: 'ok', email });
});
