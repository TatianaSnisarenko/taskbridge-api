export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'TeamUp IT API',
    version: '0.1.0',
  },
  servers: [{ url: 'http://localhost:3000' }],
  tags: [{ name: 'Health' }, { name: 'Auth' }, { name: 'Me' }, { name: 'Profiles' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      AuthCredentials: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6, maxLength: 64 },
        },
      },
      ResendVerificationRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
      SignupRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6, maxLength: 64 },
          developerProfile: {
            type: 'object',
            properties: {
              displayName: { type: 'string' },
            },
          },
          companyProfile: {
            type: 'object',
            properties: {
              companyName: { type: 'string' },
            },
          },
        },
      },
      SignupResponse: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          hasDeveloperProfile: { type: 'boolean' },
          hasCompanyProfile: { type: 'boolean' },
        },
      },
      AccessTokenResponse: {
        type: 'object',
        properties: {
          access_token: { type: 'string' },
        },
      },
      VerifyEmailResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          email: { type: 'string', format: 'email' },
        },
      },
      ResendVerificationResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          email: { type: 'string', format: 'email' },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
        },
      },
      CreateDeveloperProfileRequest: {
        type: 'object',
        required: ['display_name'],
        properties: {
          display_name: { type: 'string', minLength: 1 },
          primary_role: { type: 'string', minLength: 1 },
          bio: { type: 'string', minLength: 1 },
          experience_level: {
            type: 'string',
            enum: ['STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR'],
          },
          location: { type: 'string', minLength: 1 },
          timezone: { type: 'string', minLength: 1 },
          skills: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          tech_stack: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          availability: {
            type: 'string',
            enum: ['FEW_HOURS_WEEK', 'PART_TIME', 'FULL_TIME'],
          },
          preferred_task_categories: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'DATA', 'MOBILE', 'OTHER'],
            },
            uniqueItems: true,
          },
          portfolio_url: { type: 'string', format: 'uri' },
          github_url: { type: 'string', format: 'uri' },
          linkedin_url: { type: 'string', format: 'uri' },
        },
      },
      CreateDeveloperProfileResponse: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          created: { type: 'boolean', example: true },
        },
      },
      UpdateDeveloperProfileRequest: {
        type: 'object',
        required: ['display_name'],
        properties: {
          display_name: { type: 'string', minLength: 2, maxLength: 100 },
          primary_role: { type: 'string', minLength: 2, maxLength: 100 },
          bio: { type: 'string', minLength: 10, maxLength: 500 },
          experience_level: {
            type: 'string',
            enum: ['STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR'],
          },
          location: { type: 'string', minLength: 2, maxLength: 100 },
          timezone: { type: 'string', minLength: 3, maxLength: 50 },
          skills: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 50 },
            uniqueItems: true,
            maxItems: 50,
          },
          tech_stack: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 50 },
            uniqueItems: true,
            maxItems: 50,
          },
          availability: {
            type: 'string',
            enum: ['FEW_HOURS_WEEK', 'PART_TIME', 'FULL_TIME'],
          },
          preferred_task_categories: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'DATA', 'MOBILE', 'OTHER'],
            },
            uniqueItems: true,
            maxItems: 10,
          },
          portfolio_url: { type: 'string', format: 'uri' },
          github_url: { type: 'string', format: 'uri' },
          linkedin_url: { type: 'string', format: 'uri' },
        },
      },
      UpdateDeveloperProfileResponse: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          updated: { type: 'boolean', example: true },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateCompanyProfileRequest: {
        type: 'object',
        required: ['company_name'],
        properties: {
          company_name: { type: 'string', minLength: 2, maxLength: 100 },
          company_type: {
            type: 'string',
            enum: ['STARTUP', 'SMB', 'ENTERPRISE', 'INDIVIDUAL'],
          },
          description: { type: 'string', minLength: 10, maxLength: 1000 },
          team_size: { type: 'integer', minimum: 1, maximum: 100000 },
          country: { type: 'string', pattern: '^[A-Z]{2}$' },
          timezone: { type: 'string', minLength: 3, maxLength: 50 },
          contact_email: { type: 'string', format: 'email' },
          website_url: { type: 'string', format: 'uri' },
          links: {
            type: 'object',
            additionalProperties: { type: 'string', format: 'uri' },
          },
        },
      },
      CreateCompanyProfileResponse: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          created: { type: 'boolean', example: true },
        },
      },
      DeveloperPublicProfileResponse: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          display_name: { type: 'string', minLength: 2, maxLength: 100 },
          primary_role: { type: 'string', minLength: 2, maxLength: 100 },
          bio: { type: 'string', minLength: 10, maxLength: 500 },
          experience_level: {
            type: 'string',
            enum: ['STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR'],
          },
          location: { type: 'string', minLength: 2, maxLength: 100 },
          timezone: { type: 'string', minLength: 3, maxLength: 50 },
          skills: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 50 },
            uniqueItems: true,
            maxItems: 50,
          },
          tech_stack: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 50 },
            uniqueItems: true,
            maxItems: 50,
          },
          portfolio_url: { type: 'string', format: 'uri' },
          github_url: { type: 'string', format: 'uri' },
          linkedin_url: { type: 'string', format: 'uri' },
          avg_rating: { type: 'number', format: 'float', example: 4.7 },
          reviews_count: { type: 'integer', example: 12 },
        },
      },
    },
  },
  paths: {
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Create a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SignupRequest' },
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
    '/api/v1/me': {
      get: {
        tags: ['Me'],
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user profile' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/profiles/developer': {
      post: {
        tags: ['Profiles'],
        summary: 'Create developer profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDeveloperProfileRequest' },
              example: {
                display_name: 'Tetiana',
                primary_role: 'Java Backend Engineer',
                bio: 'Short bio',
                experience_level: 'SENIOR',
                location: 'Ukraine',
                timezone: 'Europe/Zaporozhye',
                skills: ['Java', 'Spring'],
                tech_stack: ['Spring Boot', 'JPA'],
                availability: 'FEW_HOURS_WEEK',
                preferred_task_categories: ['BACKEND'],
                portfolio_url: 'https://example.com/portfolio',
                github_url: 'https://github.com/example',
                linkedin_url: 'https://linkedin.com/in/example',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Developer profile created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateDeveloperProfileResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          409: { description: 'Profile already exists' },
        },
      },
      put: {
        tags: ['Profiles'],
        summary: 'Update developer profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateDeveloperProfileRequest' },
              example: {
                display_name: 'Tetiana',
                primary_role: 'Java Backend Engineer',
                bio: 'Updated bio',
                experience_level: 'SENIOR',
                location: 'Ukraine',
                timezone: 'Europe/Zaporozhye',
                skills: ['Java', 'Spring'],
                tech_stack: ['Spring Boot', 'JPA'],
                availability: 'PART_TIME',
                preferred_task_categories: ['BACKEND', 'DEVOPS'],
                portfolio_url: 'https://example.com/portfolio',
                github_url: 'https://github.com/example',
                linkedin_url: 'https://linkedin.com/in/example',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Developer profile updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateDeveloperProfileResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          404: { description: 'Profile not found' },
        },
      },
    },
    '/api/v1/profiles/developer/{userId}': {
      get: {
        tags: ['Profiles'],
        summary: 'Get public developer profile',
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Developer profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeveloperPublicProfileResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          404: { description: 'Profile not found' },
        },
      },
    },
    '/api/v1/profiles/company': {
      post: {
        tags: ['Profiles'],
        summary: 'Create company profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCompanyProfileRequest' },
              example: {
                company_name: 'TeamUp Studio',
                company_type: 'STARTUP',
                description: 'We build...',
                team_size: 4,
                country: 'UA',
                timezone: 'Europe/Zaporozhye',
                contact_email: 'contact@teamup.dev',
                website_url: 'https://teamup.dev',
                links: { linkedin: 'https://linkedin.com/company/teamup' },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Company profile created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateCompanyProfileResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          409: { description: 'Profile already exists' },
        },
      },
    },
  },
};
