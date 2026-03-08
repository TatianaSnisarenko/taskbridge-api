import {
  signupSchema,
  loginSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from '../../../src/schemas/auth.schemas.js';

describe('auth.schemas', () => {
  test('signup requires at least one profile', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
    });

    expect(error).toBeTruthy();
  });

  test('signup accepts developer profile', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: { displayName: 'Dev' },
    });

    expect(error).toBeUndefined();
  });

  test('login validates required fields', () => {
    const { error } = loginSchema.validate({ email: 'bad', password: '' });

    expect(error).toBeTruthy();
  });

  test('verifyEmail requires token', () => {
    const { error } = verifyEmailSchema.validate({});
    expect(error).toBeTruthy();
  });

  test('resendVerification validates email', () => {
    const { error } = resendVerificationSchema.validate({ email: 'bad' });
    expect(error).toBeTruthy();
  });
});
