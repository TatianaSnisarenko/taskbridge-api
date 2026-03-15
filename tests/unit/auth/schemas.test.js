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

  test('signup accepts company profile', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      companyProfile: { companyName: 'ACME' },
    });

    expect(error).toBeUndefined();
  });

  test('signup allows optional developer profile fields', () => {
    const { error, value } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: {
        displayName: 'John Developer',
        jobTitle: 'Senior Developer',
        bio: 'I am a senior full stack developer',
        experienceLevel: 'SENIOR',
        location: 'Kyiv, Ukraine',
        timezone: 'Europe/Kyiv',
        availability: 'FULL_TIME',
        preferredTaskCategories: ['BACKEND', 'FRONTEND'],
        portfolioUrl: 'https://johndeveloper.com',
        linkedinUrl: 'https://linkedin.com/in/john',
      },
    });

    expect(error).toBeUndefined();
    expect(value.developerProfile.displayName).toBe('John Developer');
    expect(value.developerProfile.jobTitle).toBe('Senior Developer');
    expect(value.developerProfile.experienceLevel).toBe('SENIOR');
  });

  test('signup allows optional company profile fields', () => {
    const { error, value } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      companyProfile: {
        companyName: 'Tech Startup',
        companyType: 'STARTUP',
        description: 'We are an innovative tech startup',
        teamSize: 15,
        country: 'Ukraine',
        timezone: 'Europe/Kyiv',
        contactEmail: 'contact@techstartup.com',
        websiteUrl: 'https://techstartup.com',
        links: {
          github: 'https://github.com/techstartup',
          linkedin: 'https://linkedin.com/company/techstartup',
        },
      },
    });

    expect(error).toBeUndefined();
    expect(value.companyProfile.companyName).toBe('Tech Startup');
    expect(value.companyProfile.companyType).toBe('STARTUP');
    expect(value.companyProfile.teamSize).toBe(15);
  });

  test('signup rejects invalid experience level', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: {
        displayName: 'Dev',
        experienceLevel: 'INVALID_LEVEL',
      },
    });

    expect(error).toBeTruthy();
  });

  test('signup rejects invalid company type', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      companyProfile: {
        companyName: 'Company',
        companyType: 'INVALID_TYPE',
      },
    });

    expect(error).toBeTruthy();
  });

  test('signup rejects invalid availability', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: {
        displayName: 'Dev',
        availability: 'INVALID_AVAILABILITY',
      },
    });

    expect(error).toBeTruthy();
  });

  test('signup rejects invalid task categories', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: {
        displayName: 'Dev',
        preferredTaskCategories: ['BACKEND', 'INVALID_CATEGORY'],
      },
    });

    expect(error).toBeTruthy();
  });

  test('signup rejects invalid portfolio URL', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: {
        displayName: 'Dev',
        portfolioUrl: 'not-a-url',
      },
    });

    expect(error).toBeTruthy();
  });

  test('signup rejects too short country name', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      companyProfile: {
        companyName: 'Company',
        country: 'U',
      },
    });

    expect(error).toBeTruthy();
  });

  test('signup accepts full country name', () => {
    const { error, value } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      companyProfile: {
        companyName: 'Company',
        country: 'United States',
      },
    });

    expect(error).toBeUndefined();
    expect(value.companyProfile.country).toBe('United States');
  });

  test('signup rejects invalid contact email', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      companyProfile: {
        companyName: 'Company',
        contactEmail: 'not-an-email',
      },
    });

    expect(error).toBeTruthy();
  });

  test('signup accepts minimum display name length', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: {
        displayName: 'Jo',
      },
    });

    expect(error).toBeUndefined();
  });

  test('signup rejects bio below minimum length', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: {
        displayName: 'Dev',
        bio: 'Short',
      },
    });

    expect(error).toBeTruthy();
  });

  test('signup rejects company name below minimum length', () => {
    const { error } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      companyProfile: {
        companyName: 'A',
      },
    });

    expect(error).toBeTruthy();
  });

  test('signup with both profiles uses only provided profiles', () => {
    const { error, value } = signupSchema.validate({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: { displayName: 'Dev' },
      companyProfile: { companyName: 'Corp' },
    });

    expect(error).toBeUndefined();
    expect(value.developerProfile).toBeDefined();
    expect(value.companyProfile).toBeDefined();
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
