export const authSchemas = {
  AuthCredentials: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'developer@example.com' },
      password: { type: 'string', minLength: 6, maxLength: 64, example: 'StrongPassw0rd!' },
    },
  },
  ResendVerificationRequest: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', example: 'developer@example.com' },
    },
  },
  SetPasswordRequest: {
    type: 'object',
    required: ['password'],
    properties: {
      password: {
        type: 'string',
        minLength: 6,
        maxLength: 64,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9])[ -~]{6,64}$',
        description: 'Password must include uppercase, lowercase, number, and symbol characters',
        example: 'NewStrongPassw0rd!',
      },
    },
  },
  SignupRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'company.owner@example.com' },
      password: { type: 'string', minLength: 6, maxLength: 64, example: 'StrongPassw0rd!' },
      developerProfile: {
        type: 'object',
        properties: {
          displayName: { type: 'string', example: 'Olena Kovalenko' },
        },
      },
      companyProfile: {
        type: 'object',
        properties: {
          companyName: { type: 'string', example: 'NovaTech Labs' },
        },
      },
    },
  },
  SignupResponse: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid', example: 'd3f8e3c5-2a0e-4a67-9cb5-8db8a8a6f04a' },
      email: { type: 'string', format: 'email', example: 'company.owner@example.com' },
      hasDeveloperProfile: { type: 'boolean' },
      hasCompanyProfile: { type: 'boolean' },
    },
  },
  AccessTokenResponse: {
    type: 'object',
    properties: {
      access_token: {
        type: 'string',
        example:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkM2Y4ZTNjNS0yYTBlLTRhNjctOWNiNS04ZGI4YThhNmYwNGEiLCJpYXQiOjE3MTAwMDAwMDB9.signature',
      },
    },
  },
  VerifyEmailResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'ok' },
      email: { type: 'string', format: 'email', example: 'developer@example.com' },
    },
  },
  ResendVerificationResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'ok' },
      email: { type: 'string', format: 'email', example: 'developer@example.com' },
    },
  },
  SetPasswordResponse: {
    type: 'object',
    required: ['user_id', 'password_set', 'updated_at'],
    properties: {
      user_id: { type: 'string', format: 'uuid', example: 'd3f8e3c5-2a0e-4a67-9cb5-8db8a8a6f04a' },
      password_set: { type: 'boolean', example: true },
      updated_at: { type: 'string', format: 'date-time', example: '2026-03-07T12:15:00Z' },
    },
  },
  ForgotPasswordRequest: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', example: 'developer@example.com' },
    },
  },
  ForgotPasswordResponse: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', example: true },
    },
  },
  ResetPasswordRequest: {
    type: 'object',
    required: ['token', 'new_password'],
    properties: {
      token: {
        type: 'string',
        description: 'Password reset token from email',
        example: 'reset_4f7e0d3aa2f04f3c9a4a5f2f6c2b9aee',
      },
      new_password: {
        type: 'string',
        minLength: 6,
        maxLength: 64,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9])[ -~]{6,64}$',
        description: 'Password must include uppercase, lowercase, number, and symbol characters',
        example: 'VeryStrongPassw0rd!2026',
      },
    },
  },
  ResetPasswordResponse: {
    type: 'object',
    properties: {
      password_reset: { type: 'boolean', example: true },
    },
  },
};
