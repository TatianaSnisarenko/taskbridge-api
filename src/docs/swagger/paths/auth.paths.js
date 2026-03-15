export const authPaths = {
  '/api/v1/auth/signup': {
    post: {
      tags: ['Auth'],
      summary: 'Create a new user (with developer profile, company profile, or both)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SignupRequest' },
            example: {
              email: 'founder@example.com',
              password: 'Passw0rd!',
              developerProfile: {
                displayName: 'Olena Kovalenko',
                jobTitle: 'Founder & CTO',
                bio: 'Founder of NovaTech Labs, experienced full stack developer',
                experienceLevel: 'SENIOR',
                location: 'Kyiv, Ukraine',
                timezone: 'Europe/Kyiv',
                availability: 'FULL_TIME',
                preferredTaskCategories: ['BACKEND', 'FRONTEND', 'FULLSTACK'],
                technologies: [
                  { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
                  { id: '550e8400-e29b-41d4-a716-446655440000' },
                ],
                portfolioUrl: 'https://olena-dev.com',
                linkedinUrl: 'https://linkedin.com/in/olena-kovalenko',
              },
              companyProfile: {
                companyName: 'NovaTech Labs',
                companyType: 'STARTUP',
                description: 'We are an innovative tech startup focused on AI solutions',
                teamSize: 15,
                country: 'Ukraine',
                timezone: 'Europe/Kyiv',
                contactEmail: 'contact@novatech.com',
                websiteUrl: 'https://novatech.com',
                links: {
                  github: 'https://github.com/novatech',
                  linkedin: 'https://linkedin.com/company/novatech',
                },
              },
            },
            examples: {
              developerOnly: {
                summary: 'Signup with developer profile only',
                value: {
                  email: 'developer@example.com',
                  password: 'Passw0rd!',
                  developerProfile: {
                    displayName: 'Olena Kovalenko',
                    jobTitle: 'Senior Full Stack Developer',
                    bio: 'I am an experienced developer with 5 years in full stack development',
                    experienceLevel: 'SENIOR',
                    location: 'Kyiv, Ukraine',
                    timezone: 'Europe/Kyiv',
                    availability: 'FULL_TIME',
                    preferredTaskCategories: ['BACKEND', 'FRONTEND', 'FULLSTACK'],
                    technologies: [
                      { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
                      { id: '550e8400-e29b-41d4-a716-446655440000' },
                    ],
                    portfolioUrl: 'https://olena-dev.com',
                    linkedinUrl: 'https://linkedin.com/in/olena-kovalenko',
                  },
                },
              },
              companyOnly: {
                summary: 'Signup with company profile only',
                value: {
                  email: 'company@example.com',
                  password: 'Passw0rd!',
                  companyProfile: {
                    companyName: 'NovaTech Labs',
                    companyType: 'STARTUP',
                    description: 'We are an innovative tech startup focused on AI solutions',
                    teamSize: 15,
                    country: 'Ukraine',
                    timezone: 'Europe/Kyiv',
                    contactEmail: 'contact@novatech.com',
                    websiteUrl: 'https://novatech.com',
                    links: {
                      github: 'https://github.com/novatech',
                      linkedin: 'https://linkedin.com/company/novatech',
                    },
                  },
                },
              },
              bothProfiles: {
                summary: 'Signup with both developer and company profiles (default example)',
                value: {
                  email: 'founder@example.com',
                  password: 'Passw0rd!',
                  developerProfile: {
                    displayName: 'Olena Kovalenko',
                    jobTitle: 'Founder & CTO',
                    bio: 'Founder of NovaTech Labs, experienced full stack developer',
                    experienceLevel: 'SENIOR',
                    location: 'Kyiv, Ukraine',
                    timezone: 'Europe/Kyiv',
                    availability: 'FULL_TIME',
                    preferredTaskCategories: ['BACKEND', 'FRONTEND', 'FULLSTACK'],
                    technologies: [
                      { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
                      { id: '550e8400-e29b-41d4-a716-446655440000' },
                    ],
                    portfolioUrl: 'https://olena-dev.com',
                    linkedinUrl: 'https://linkedin.com/in/olena-kovalenko',
                  },
                  companyProfile: {
                    companyName: 'NovaTech Labs',
                    companyType: 'STARTUP',
                    description: 'We are an innovative tech startup focused on AI solutions',
                    teamSize: 15,
                    country: 'Ukraine',
                    timezone: 'Europe/Kyiv',
                    contactEmail: 'contact@novatech.com',
                    websiteUrl: 'https://novatech.com',
                    links: {
                      github: 'https://github.com/novatech',
                      linkedin: 'https://linkedin.com/company/novatech',
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'User created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SignupResponse' },
            },
          },
        },
      },
    },
  },
  '/api/v1/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login user',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthCredentials' },
            example: {
              email: 'user@example.com',
              password: 'password',
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Logged in',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AccessTokenResponse' },
            },
          },
        },
      },
    },
  },
  '/api/v1/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      responses: {
        200: {
          description: 'New access token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AccessTokenResponse' },
            },
          },
        },
      },
    },
  },
  '/api/v1/auth/verify-email': {
    get: {
      tags: ['Auth'],
      summary: 'Verify email address',
      parameters: [
        {
          name: 'token',
          in: 'query',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: {
          description: 'Email verified',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifyEmailResponse' },
            },
          },
        },
      },
    },
  },
  '/api/v1/auth/resend-verification': {
    post: {
      tags: ['Auth'],
      summary: 'Resend verification email',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResendVerificationRequest' },
            example: {
              email: 'user@example.com',
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Verification email sent',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResendVerificationResponse' },
            },
          },
        },
      },
    },
  },
  '/api/v1/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout user',
      responses: {
        204: { description: 'Logged out' },
      },
    },
  },
  '/api/v1/auth/password': {
    post: {
      tags: ['Auth'],
      summary: 'Set password for authenticated user',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SetPasswordRequest' },
            example: {
              password: 'NewStrongPassword123!',
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Password has been set successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SetPasswordResponse' },
            },
          },
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Validation failed',
                  details: [
                    {
                      field: 'password',
                      issue:
                        'Password must be 6-64 chars, with upper/lowercase, number, and symbol',
                    },
                  ],
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        500: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/api/v1/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Request password reset link',
      description:
        'Sends a password reset email if the account exists and is verified. Always returns 200 OK to prevent email enumeration.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ForgotPasswordRequest' },
            example: {
              email: 'user@gmail.com',
            },
          },
        },
      },
      responses: {
        200: {
          description:
            'Request processed successfully (does not reveal if email exists or is verified)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ForgotPasswordResponse' },
            },
          },
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Validation failed',
                  details: [
                    {
                      field: 'email',
                      issue: 'Email format is invalid',
                    },
                  ],
                },
              },
            },
          },
        },
        500: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/api/v1/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Reset password with token',
      description: 'Resets the user password using a valid reset token from the email.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResetPasswordRequest' },
            example: {
              token: 'abc123xyz...',
              new_password: 'NewStrongPassword123!',
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Password has been reset successfully. All refresh tokens are revoked.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetPasswordResponse' },
            },
          },
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Validation failed',
                  details: [
                    {
                      field: 'new_password',
                      issue:
                        'Password must be 6-64 chars, with upper/lowercase, number, and symbol',
                    },
                  ],
                },
              },
            },
          },
        },
        401: {
          description: 'Invalid or expired token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                error: {
                  code: 'INVALID_OR_EXPIRED_TOKEN',
                  message: 'Reset token is invalid or expired',
                },
              },
            },
          },
        },
        500: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
};
