import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  checkEmailAddressRateLimit,
  checkEmailIpRateLimit,
} from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  checkEmailSchema,
  loginSchema,
  resendVerificationSchema,
  setPasswordSchema,
  signupSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.schemas.js';

export const authRouter = Router();

authRouter.post('/signup', validate(signupSchema), authController.signup);
authRouter.get(
  '/check-email',
  checkEmailIpRateLimit,
  checkEmailAddressRateLimit,
  validate(checkEmailSchema, 'query'),
  authController.checkEmail
);
authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.get('/verify-email', validate(verifyEmailSchema, 'query'), authController.verifyEmail);
authRouter.post(
  '/resend-verification',
  validate(resendVerificationSchema),
  authController.resendVerification
);
authRouter.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
authRouter.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.post('/password', requireAuth, validate(setPasswordSchema), authController.setPassword);
