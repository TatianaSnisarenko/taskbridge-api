import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  loginSchema,
  resendVerificationSchema,
  setPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from '../schemas/auth.schemas.js';

export const authRouter = Router();

authRouter.post('/signup', validate(signupSchema), authController.signup);
authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.get('/verify-email', validate(verifyEmailSchema, 'query'), authController.verifyEmail);
authRouter.post(
  '/resend-verification',
  validate(resendVerificationSchema),
  authController.resendVerification
);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.post('/password', requireAuth, validate(setPasswordSchema), authController.setPassword);
