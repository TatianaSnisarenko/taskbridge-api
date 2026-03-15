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
    description:
      'Create a new user account. You can create a developer profile, company profile, or both. At least one profile must be provided.',
    properties: {
      email: { type: 'string', format: 'email', example: 'company.owner@example.com' },
      password: { type: 'string', minLength: 6, maxLength: 64, example: 'StrongPassw0rd!' },
      developerProfile: {
        type: 'object',
        description: 'Optional developer profile (required if companyProfile is not provided)',
        required: ['displayName'],
        properties: {
          displayName: { type: 'string', minLength: 2, maxLength: 100, example: 'Olena Kovalenko' },
          jobTitle: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            example: 'Senior Full Stack Developer',
          },
          bio: {
            type: 'string',
            minLength: 10,
            maxLength: 2000,
            example: 'I am an experienced developer with 5 years in full stack development',
          },
          experienceLevel: {
            type: 'string',
            enum: ['STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR'],
            example: 'SENIOR',
          },
          location: { type: 'string', minLength: 2, maxLength: 100, example: 'Kyiv, Ukraine' },
          timezone: { type: 'string', example: 'Europe/Kyiv' },
          availability: {
            type: 'string',
            enum: ['FEW_HOURS_WEEK', 'PART_TIME', 'FULL_TIME'],
            example: 'FULL_TIME',
          },
          preferredTaskCategories: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'BACKEND',
                'FRONTEND',
                'DEVOPS',
                'QA',
                'DATA',
                'MOBILE',
                'OTHER',
                'FULLSTACK',
                'AI_ML',
                'UI_UX_DESIGN',
                'PRODUCT_MANAGEMENT',
                'BUSINESS_ANALYSIS',
                'CYBERSECURITY',
                'GAME_DEV',
                'EMBEDDED',
                'TECH_WRITING',
              ],
            },
            maxItems: 10,
            example: ['BACKEND', 'FRONTEND', 'FULLSTACK'],
          },
          portfolioUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://developer-portfolio.com',
          },
          linkedinUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://linkedin.com/in/developer',
          },
          technologyIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            maxItems: 50,
            example: [
              '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              '550e8400-e29b-41d4-a716-446655440000',
            ],
          },
          technologies: {
            type: 'array',
            description:
              'Alternative format. Each item may contain only technology id; IDs are used to create records in developer_technologies.',
            items: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'string', format: 'uuid' },
              },
              additionalProperties: true,
            },
            maxItems: 50,
            example: [
              { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
              { id: '550e8400-e29b-41d4-a716-446655440000' },
            ],
          },
        },
      },
      companyProfile: {
        type: 'object',
        description: 'Optional company profile (required if developerProfile is not provided)',
        required: ['companyName'],
        properties: {
          companyName: { type: 'string', minLength: 2, maxLength: 100, example: 'NovaTech Labs' },
          companyType: {
            type: 'string',
            enum: ['STARTUP', 'SMB', 'ENTERPRISE', 'INDIVIDUAL'],
            example: 'STARTUP',
          },
          description: {
            type: 'string',
            minLength: 10,
            maxLength: 2000,
            example: 'We are an innovative tech startup focused on AI solutions',
          },
          teamSize: { type: 'integer', minimum: 1, maximum: 100000, example: 15 },
          country: { type: 'string', minLength: 2, maxLength: 100, example: 'Ukraine' },
          timezone: { type: 'string', example: 'Europe/Kyiv' },
          contactEmail: { type: 'string', format: 'email', example: 'contact@novatech.com' },
          websiteUrl: { type: 'string', format: 'uri', example: 'https://novatech.com' },
          links: {
            type: 'object',
            additionalProperties: { type: 'string', format: 'uri' },
            maxProperties: 20,
            example: {
              github: 'https://github.com/novatech',
              linkedin: 'https://linkedin.com/company/novatech',
            },
          },
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
