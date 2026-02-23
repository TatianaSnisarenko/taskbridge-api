export const createSwaggerSpec = (appBaseUrl = 'http://localhost:3000') => ({
  openapi: '3.0.0',
  info: {
    title: 'TeamUp IT API',
    version: '0.1.0',
  },
  servers: [{ url: appBaseUrl }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Me' },
    { name: 'Profiles' },
    { name: 'Projects' },
    { name: 'Tasks' },
  ],
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
      UpdateCompanyProfileRequest: {
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
      UpdateCompanyProfileResponse: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          updated: { type: 'boolean', example: true },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CompanyPublicProfileResponse: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          company_name: { type: 'string', minLength: 2, maxLength: 100 },
          company_type: {
            type: 'string',
            enum: ['STARTUP', 'SMB', 'ENTERPRISE', 'INDIVIDUAL'],
          },
          description: { type: 'string', minLength: 10, maxLength: 1000 },
          team_size: { type: 'integer', minimum: 1, maximum: 100000 },
          country: { type: 'string', pattern: '^[A-Z]{2}$' },
          timezone: { type: 'string', minLength: 3, maxLength: 50 },
          logo_url: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'Company logo URL from Cloudinary, null if not uploaded',
          },
          website_url: { type: 'string', format: 'uri' },
          links: {
            type: 'object',
            additionalProperties: { type: 'string', format: 'uri' },
          },
          verified: { type: 'boolean' },
          avg_rating: { type: 'number', format: 'float', example: 4.6 },
          reviews_count: { type: 'integer', example: 8 },
        },
      },
      CreateProjectRequest: {
        type: 'object',
        required: ['title', 'short_description', 'description'],
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 120 },
          short_description: { type: 'string', minLength: 10, maxLength: 200 },
          description: { type: 'string', minLength: 10, maxLength: 2000 },
          technologies: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 50 },
            uniqueItems: true,
            minItems: 1,
            maxItems: 50,
          },
          visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
          status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
          max_talents: { type: 'integer', minimum: 1, maximum: 100 },
        },
      },
      CreateProjectResponse: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      UpdateProjectRequest: {
        type: 'object',
        required: ['title', 'short_description', 'description'],
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 120 },
          short_description: { type: 'string', minLength: 10, maxLength: 200 },
          description: { type: 'string', minLength: 10, maxLength: 2000 },
          technologies: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 50 },
            uniqueItems: true,
            minItems: 1,
            maxItems: 50,
          },
          visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
          status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
          max_talents: { type: 'integer', minimum: 1, maximum: 100 },
        },
      },
      UpdateProjectResponse: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          updated: { type: 'boolean', example: true },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      DeleteProjectResponse: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          deleted_at: { type: 'string', format: 'date-time' },
        },
      },
      ProjectListItem: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          short_description: { type: 'string' },
          technologies: { type: 'array', items: { type: 'string' } },
          visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
          status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
          max_talents: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
          company: {
            type: 'object',
            properties: {
              user_id: { type: 'string', format: 'uuid' },
              company_name: { type: 'string' },
              verified: { type: 'boolean' },
              avg_rating: { type: 'number', format: 'float' },
              reviews_count: { type: 'integer' },
            },
          },
        },
      },
      ProjectTasksSummary: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 12 },
          draft: { type: 'integer', example: 2 },
          published: { type: 'integer', example: 5 },
          in_progress: { type: 'integer', example: 2 },
          completed: { type: 'integer', example: 3 },
          closed: { type: 'integer', example: 0 },
        },
      },
      ProjectDetailsResponse: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          owner_user_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          short_description: { type: 'string' },
          description: { type: 'string' },
          technologies: { type: 'array', items: { type: 'string' } },
          visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
          status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
          max_talents: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          deleted_at: { type: 'string', format: 'date-time', nullable: true },
          company: {
            type: 'object',
            properties: {
              user_id: { type: 'string', format: 'uuid' },
              company_name: { type: 'string' },
              verified: { type: 'boolean' },
              avg_rating: { type: 'number', format: 'float' },
              reviews_count: { type: 'integer' },
            },
          },
          tasks_summary: { $ref: '#/components/schemas/ProjectTasksSummary' },
        },
      },
      GetProjectsResponse: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/ProjectListItem' },
          },
          page: { type: 'integer', example: 1 },
          size: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 1 },
        },
      },
      ReportProjectRequest: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: {
            type: 'string',
            enum: ['SPAM', 'SCAM', 'INAPPROPRIATE_CONTENT', 'MISLEADING', 'OTHER'],
          },
          comment: { type: 'string', maxLength: 1000 },
        },
      },
      ReportProjectResponse: {
        type: 'object',
        properties: {
          report_id: { type: 'string', format: 'uuid' },
          created_at: { type: 'string', format: 'date-time' },
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
          avatar_url: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'Avatar image URL from Cloudinary, null if not uploaded',
          },
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
      CreateTaskDraftRequest: {
        type: 'object',
        required: [
          'title',
          'description',
          'category',
          'type',
          'difficulty',
          'required_skills',
          'estimated_effort_hours',
          'expected_duration',
          'communication_language',
          'timezone_preference',
          'application_deadline',
          'visibility',
          'deliverables',
          'requirements',
          'nice_to_have',
        ],
        properties: {
          project_id: { type: 'string', format: 'uuid', nullable: true },
          title: { type: 'string', minLength: 3, maxLength: 120 },
          description: { type: 'string', minLength: 10, maxLength: 2000 },
          category: {
            type: 'string',
            enum: ['BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'DATA', 'MOBILE', 'OTHER'],
          },
          type: {
            type: 'string',
            enum: ['PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE'],
          },
          difficulty: {
            type: 'string',
            enum: ['JUNIOR', 'MIDDLE', 'SENIOR', 'ANY'],
          },
          required_skills: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 50 },
            uniqueItems: true,
            minItems: 1,
            maxItems: 50,
          },
          estimated_effort_hours: { type: 'integer', minimum: 1, maximum: 1000 },
          expected_duration: {
            type: 'string',
            enum: ['DAYS_1_7', 'DAYS_8_14', 'DAYS_15_30', 'DAYS_30_PLUS'],
          },
          communication_language: { type: 'string', minLength: 2, maxLength: 50 },
          timezone_preference: { type: 'string', minLength: 3, maxLength: 60 },
          application_deadline: { type: 'string', format: 'date' },
          visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
          deliverables: { type: 'string', minLength: 3, maxLength: 2000 },
          requirements: { type: 'string', minLength: 3, maxLength: 2000 },
          nice_to_have: { type: 'string', minLength: 3, maxLength: 2000 },
        },
      },
      CreateTaskDraftResponse: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['DRAFT'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      UpdateTaskDraftRequest: {
        type: 'object',
        required: [
          'title',
          'description',
          'category',
          'type',
          'difficulty',
          'required_skills',
          'estimated_effort_hours',
          'expected_duration',
          'communication_language',
          'timezone_preference',
          'application_deadline',
          'visibility',
          'deliverables',
          'requirements',
          'nice_to_have',
        ],
        properties: {
          project_id: { type: 'string', format: 'uuid', nullable: true },
          title: { type: 'string', minLength: 3, maxLength: 120 },
          description: { type: 'string', minLength: 10, maxLength: 2000 },
          category: {
            type: 'string',
            enum: ['BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'DATA', 'MOBILE', 'OTHER'],
          },
          type: {
            type: 'string',
            enum: ['PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE'],
          },
          difficulty: {
            type: 'string',
            enum: ['JUNIOR', 'MIDDLE', 'SENIOR', 'ANY'],
          },
          required_skills: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 50 },
            uniqueItems: true,
            minItems: 1,
            maxItems: 50,
          },
          estimated_effort_hours: { type: 'integer', minimum: 1, maximum: 1000 },
          expected_duration: {
            type: 'string',
            enum: ['DAYS_1_7', 'DAYS_8_14', 'DAYS_15_30', 'DAYS_30_PLUS'],
          },
          communication_language: { type: 'string', minLength: 2, maxLength: 50 },
          timezone_preference: { type: 'string', minLength: 3, maxLength: 60 },
          application_deadline: { type: 'string', format: 'date' },
          visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
          deliverables: { type: 'string', minLength: 3, maxLength: 2000 },
          requirements: { type: 'string', minLength: 3, maxLength: 2000 },
          nice_to_have: { type: 'string', minLength: 3, maxLength: 2000 },
        },
      },
      UpdateTaskDraftResponse: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid' },
          updated: { type: 'boolean' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateTaskApplicationRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', minLength: 10, maxLength: 1000 },
          proposed_plan: { type: 'string', minLength: 10, maxLength: 2000 },
          availability_note: { type: 'string', minLength: 2, maxLength: 200 },
        },
      },
      CreateTaskApplicationResponse: {
        type: 'object',
        properties: {
          application_id: { type: 'string', format: 'uuid' },
          task_id: { type: 'string', format: 'uuid' },
          developer_user_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['APPLIED'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      PublishTaskResponse: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['PUBLISHED'] },
          published_at: { type: 'string', format: 'date-time' },
        },
      },
      RequestTaskCompletionResponse: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['COMPLETION_REQUESTED'] },
        },
      },
      ConfirmTaskCompletionResponse: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['COMPLETED'] },
          completed_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateReviewResponse: {
        type: 'object',
        properties: {
          review_id: { type: 'string', format: 'uuid' },
          task_id: { type: 'string', format: 'uuid' },
          author_user_id: { type: 'string', format: 'uuid' },
          target_user_id: { type: 'string', format: 'uuid' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          text: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      UserReviewsResponse: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                review_id: { type: 'string', format: 'uuid' },
                task_id: { type: 'string', format: 'uuid' },
                rating: { type: 'integer', minimum: 1, maximum: 5 },
                text: { type: 'string', nullable: true },
                created_at: { type: 'string', format: 'date-time' },
                author: {
                  type: 'object',
                  properties: {
                    user_id: { type: 'string', format: 'uuid' },
                    display_name: { type: 'string' },
                    company_name: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          page: { type: 'integer', minimum: 1 },
          size: { type: 'integer', minimum: 1, maximum: 100 },
          total: { type: 'integer', minimum: 0 },
        },
      },
      CloseTaskResponse: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['CLOSED'] },
          closed_at: { type: 'string', format: 'date-time' },
        },
      },
      DeleteTaskResponse: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['DELETED'] },
          deleted_at: { type: 'string', format: 'date-time' },
        },
      },
      GetTasksResponse: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/TaskListItem' } },
          page: { type: 'integer', example: 1 },
          size: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 100 },
        },
      },
      TaskDeveloper: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          display_name: { type: 'string' },
          primary_role: { type: 'string' },
          avatar_url: { type: 'string', format: 'uri', nullable: true },
          avg_rating: { type: 'number', format: 'float', nullable: true },
          reviews_count: { type: 'integer' },
        },
      },
      TaskApplicationItem: {
        type: 'object',
        properties: {
          application_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['APPLIED', 'ACCEPTED', 'REJECTED'] },
          message: { type: 'string', nullable: true },
          proposed_plan: { type: 'string', nullable: true },
          availability_note: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          developer: { $ref: '#/components/schemas/TaskDeveloper' },
        },
      },
      GetTaskApplicationsResponse: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/TaskApplicationItem' } },
          page: { type: 'integer', example: 1 },
          size: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 5 },
        },
      },
      AcceptApplicationResponse: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid' },
          accepted_application_id: { type: 'string', format: 'uuid' },
          task_status: { type: 'string', enum: ['IN_PROGRESS'] },
          accepted_developer_user_id: { type: 'string', format: 'uuid' },
        },
      },
      RejectApplicationResponse: {
        type: 'object',
        properties: {
          application_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['REJECTED'] },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      TaskCompany: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          company_name: { type: 'string' },
          verified: { type: 'boolean' },
          avg_rating: { type: 'number', format: 'float' },
          reviews_count: { type: 'integer' },
        },
      },
      TaskProject: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
        },
      },
      TaskListItem: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              'DRAFT',
              'PUBLISHED',
              'IN_PROGRESS',
              'COMPLETED',
              'CLOSED',
              'DELETED',
              'COMPLETION_REQUESTED',
            ],
          },
          category: {
            type: 'string',
            enum: ['BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'DATA', 'MOBILE', 'OTHER'],
          },
          type: { type: 'string', enum: ['PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE'] },
          difficulty: { type: 'string', enum: ['JUNIOR', 'MIDDLE', 'SENIOR', 'ANY'] },
          required_skills: { type: 'array', items: { type: 'string' } },
          published_at: { type: 'string', format: 'date-time', nullable: true },
          project: { $ref: '#/components/schemas/TaskProject', nullable: true },
          company: { $ref: '#/components/schemas/TaskCompany' },
        },
      },
      TaskDetailsResponse: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid' },
          owner_user_id: { type: 'string', format: 'uuid' },
          status: {
            type: 'string',
            enum: [
              'DRAFT',
              'PUBLISHED',
              'IN_PROGRESS',
              'COMPLETED',
              'CLOSED',
              'DELETED',
              'COMPLETION_REQUESTED',
            ],
          },
          project: { $ref: '#/components/schemas/TaskProject', nullable: true },
          title: { type: 'string', minLength: 3, maxLength: 120 },
          description: { type: 'string', minLength: 10, maxLength: 2000 },
          category: {
            type: 'string',
            enum: ['BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'DATA', 'MOBILE', 'OTHER'],
          },
          type: { type: 'string', enum: ['PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE'] },
          difficulty: { type: 'string', enum: ['JUNIOR', 'MIDDLE', 'SENIOR', 'ANY'] },
          required_skills: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 50 },
            minItems: 1,
            maxItems: 50,
            uniqueItems: true,
          },
          estimated_effort_hours: { type: 'integer', minimum: 1, maximum: 1000 },
          expected_duration: {
            type: 'string',
            enum: ['DAYS_1_7', 'DAYS_8_14', 'DAYS_15_30', 'DAYS_30_PLUS'],
          },
          communication_language: { type: 'string', minLength: 2, maxLength: 50 },
          timezone_preference: { type: 'string', minLength: 3, maxLength: 60 },
          application_deadline: { type: 'string', format: 'date', nullable: true },
          visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
          deliverables: { type: 'string', minLength: 3, maxLength: 2000 },
          requirements: { type: 'string', minLength: 3, maxLength: 2000 },
          nice_to_have: { type: 'string', minLength: 3, maxLength: 2000 },
          created_at: { type: 'string', format: 'date-time' },
          published_at: { type: 'string', format: 'date-time', nullable: true },
          accepted_application_id: { type: 'string', format: 'uuid', nullable: true },
          deleted_at: { type: 'string', format: 'date-time', nullable: true },
          applications_count: { type: 'integer', example: 3 },
          can_apply: { type: 'boolean', example: false },
          is_owner: { type: 'boolean', example: false },
          is_accepted_developer: { type: 'boolean', example: false },
          company: { $ref: '#/components/schemas/TaskCompany' },
        },
      },
      GetTasksCatalogResponse: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/TaskListItem' } },
          page: { type: 'integer', example: 1 },
          size: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 15 },
        },
      },
      ApplicationTaskInfo: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              'DRAFT',
              'PUBLISHED',
              'IN_PROGRESS',
              'COMPLETED',
              'CLOSED',
              'DELETED',
              'COMPLETION_REQUESTED',
            ],
          },
          project: { $ref: '#/components/schemas/TaskProject', nullable: true },
        },
      },
      ApplicationCompanyInfo: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          company_name: { type: 'string' },
        },
      },
      MyApplicationItem: {
        type: 'object',
        properties: {
          application_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['APPLIED', 'ACCEPTED', 'REJECTED'] },
          created_at: { type: 'string', format: 'date-time' },
          task: { $ref: '#/components/schemas/ApplicationTaskInfo' },
          company: { $ref: '#/components/schemas/ApplicationCompanyInfo' },
        },
      },
      GetMyApplicationsResponse: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/MyApplicationItem' } },
          page: { type: 'integer', example: 1 },
          size: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 5 },
        },
      },
      MyTaskItem: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          status: {
            type: 'string',
            enum: ['IN_PROGRESS', 'COMPLETION_REQUESTED', 'COMPLETED'],
          },
          published_at: { type: 'string', format: 'date-time', nullable: true },
          completed_at: { type: 'string', format: 'date-time', nullable: true },
          project: { $ref: '#/components/schemas/TaskProject', nullable: true },
          company: { $ref: '#/components/schemas/TaskCompany' },
        },
      },
      GetMyTasksResponse: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/MyTaskItem' } },
          page: { type: 'integer', example: 1 },
          size: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 1 },
        },
      },
      NotificationItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: {
            type: 'string',
            enum: [
              'APPLICATION_CREATED',
              'APPLICATION_ACCEPTED',
              'APPLICATION_REJECTED',
              'COMPLETION_REQUESTED',
              'TASK_COMPLETED',
              'REVIEW_CREATED',
            ],
          },
          actor_user_id: { type: 'string', format: 'uuid', nullable: true },
          project_id: { type: 'string', format: 'uuid', nullable: true },
          task_id: { type: 'string', format: 'uuid', nullable: true },
          thread_id: { type: 'string', format: 'uuid', nullable: true },
          payload: { type: 'object', additionalProperties: true },
          created_at: { type: 'string', format: 'date-time' },
          read_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      GetMyNotificationsResponse: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/NotificationItem' } },
          page: { type: 'integer', example: 1 },
          size: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 10 },
          unread_total: { type: 'integer', example: 3 },
        },
      },
      MarkNotificationAsReadResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          read_at: { type: 'string', format: 'date-time' },
        },
      },
      MarkAllNotificationsAsReadResponse: {
        type: 'object',
        properties: {
          updated: { type: 'boolean', example: true },
          read_at: { type: 'string', format: 'date-time' },
        },
      },
      ChatThreadItem: {
        type: 'object',
        properties: {
          thread_id: { type: 'string', format: 'uuid' },
          task: {
            type: 'object',
            properties: {
              task_id: { type: 'string', format: 'uuid' },
              title: { type: 'string', example: 'React Dashboard Component' },
              status: {
                type: 'string',
                enum: ['IN_PROGRESS', 'COMPLETED'],
                example: 'IN_PROGRESS',
              },
            },
          },
          other_participant: {
            type: 'object',
            properties: {
              user_id: { type: 'string', format: 'uuid' },
              display_name: { type: 'string', example: 'Tetiana' },
              company_name: { type: 'string', nullable: true, example: null },
              avatar_url: { type: 'string', format: 'uri', nullable: true },
            },
          },
          last_message: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              text: { type: 'string', example: 'Great! Looking forward to your implementation.' },
              sender_user_id: { type: 'string', format: 'uuid' },
              sender_persona: { type: 'string', enum: ['developer', 'company'] },
              sent_at: { type: 'string', format: 'date-time' },
            },
          },
          unread_count: { type: 'integer', example: 2 },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      GetMyThreadsResponse: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/ChatThreadItem' } },
          page: { type: 'integer', example: 1 },
          size: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 1 },
        },
      },
      ChatMessage: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          sender_user_id: { type: 'string', format: 'uuid' },
          sender_persona: { type: 'string', enum: ['developer', 'company'] },
          text: { type: 'string', example: 'Hello!' },
          sent_at: { type: 'string', format: 'date-time' },
          read_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      GetThreadMessagesResponse: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/ChatMessage' } },
          page: { type: 'integer', example: 1 },
          size: { type: 'integer', example: 50 },
          total: { type: 'integer', example: 1 },
        },
      },
      CreateMessageRequest: {
        type: 'object',
        required: ['text'],
        properties: {
          text: {
            type: 'string',
            minLength: 1,
            maxLength: 2000,
            example: 'Hello! I have a question about this task.',
          },
        },
      },
      CreateMessageResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          thread_id: { type: 'string', format: 'uuid' },
          sender_user_id: { type: 'string', format: 'uuid' },
          sender_persona: { type: 'string', enum: ['developer', 'company'] },
          text: { type: 'string', example: 'Hello! I have a question about this task.' },
          sent_at: { type: 'string', format: 'date-time' },
          read_at: { type: 'null', description: 'New messages are always unread (null)' },
        },
      },
      MarkThreadAsReadResponse: {
        type: 'object',
        properties: {
          thread_id: { type: 'string', format: 'uuid' },
          read_at: { type: 'string', format: 'date-time', example: '2026-02-14T15:00:00Z' },
        },
      },
      UploadAvatarResponse: {
        type: 'object',
        required: ['user_id', 'avatar_url', 'updated_at'],
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          avatar_url: {
            type: 'string',
            format: 'uri',
            example:
              'https://res.cloudinary.com/example/image/upload/v1234567890/teamup/dev-avatars/example.webp',
          },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      DeleteAvatarResponse: {
        type: 'object',
        required: ['user_id', 'avatar_url', 'updated_at'],
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          avatar_url: { type: 'null', description: 'Avatar URL is null after deletion' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      UploadLogoResponse: {
        type: 'object',
        required: ['user_id', 'logo_url', 'updated_at'],
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          logo_url: {
            type: 'string',
            format: 'uri',
            example:
              'https://res.cloudinary.com/example/image/upload/v1234567890/teamup/company-logos/example.webp',
          },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      DeleteLogoResponse: {
        type: 'object',
        required: ['user_id', 'logo_url', 'updated_at'],
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          logo_url: { type: 'null', description: 'Logo URL is null after deletion' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation failed' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'email' },
                    issue: { type: 'string', example: 'Email is required' },
                  },
                },
              },
            },
          },
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
              example: {
                email: 'user@example.com',
                password: 'password',
                developerProfile: {
                  displayName: 'Developer',
                },
                companyProfile: {
                  companyName: 'Example Company',
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
    '/api/v1/me/applications': {
      get: {
        tags: ['Me'],
        summary: 'Get my applications as developer',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer'] },
            description: 'Must be developer persona',
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number (starting from 1)',
          },
          {
            name: 'size',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page',
          },
        ],
        responses: {
          200: {
            description: 'Paginated list of applications created by developer',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GetMyApplicationsResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Developer profile does not exist' },
        },
      },
    },
    '/api/v1/me/tasks': {
      get: {
        tags: ['Me'],
        summary: 'Get my tasks as accepted developer',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer'] },
            description: 'Must be developer persona',
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number (starting from 1)',
          },
          {
            name: 'size',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page',
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['IN_PROGRESS', 'COMPLETION_REQUESTED', 'COMPLETED'],
            },
            description: 'Filter by task status',
          },
        ],
        responses: {
          200: {
            description: 'Paginated list of tasks for the accepted developer',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GetMyTasksResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Developer profile does not exist' },
        },
      },
    },
    '/api/v1/me/notifications': {
      get: {
        tags: ['Me'],
        summary: 'Get my notifications',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer', 'company'] },
            description: 'User persona context (required)',
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number (starting from 1)',
          },
          {
            name: 'size',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page',
          },
          {
            name: 'unread_only',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'If true, return only unread notifications',
          },
        ],
        responses: {
          200: {
            description: 'Paginated list of notifications for the current user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GetMyNotificationsResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/me/notifications/{id}/read': {
      post: {
        tags: ['Me'],
        summary: 'Mark notification as read',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer', 'company'] },
            description: 'User persona context (required)',
          },
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Notification ID',
          },
        ],
        responses: {
          200: {
            description: 'Notification marked as read',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MarkNotificationAsReadResponse' },
              },
            },
          },
          401: { description: 'Unauthorized' },
          404: { description: 'Notification not found' },
        },
      },
    },
    '/api/v1/me/notifications/read-all': {
      post: {
        tags: ['Me'],
        summary: 'Mark all notifications as read',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer', 'company'] },
            description: 'User persona context (required)',
          },
        ],
        responses: {
          200: {
            description: 'All notifications marked as read',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MarkAllNotificationsAsReadResponse' },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/me/chat/threads': {
      get: {
        tags: ['Me'],
        summary: 'Get my chat threads',
        description:
          'Get chat threads for the current user. Threads are returned only for tasks with status IN_PROGRESS or COMPLETED.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer', 'company'] },
            description: 'User persona - threads filtered by this role',
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number (starting from 1)',
          },
          {
            name: 'size',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page',
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search for threads by task title (optional, case-insensitive)',
          },
        ],
        responses: {
          200: {
            description:
              'Paginated list of chat threads sorted by last message date (newest first)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GetMyThreadsResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/me/chat/threads/{threadId}': {
      get: {
        tags: ['Me'],
        summary: 'Get chat thread by ID',
        description:
          'Get a specific chat thread by ID. User must be a participant in the thread and the associated task must have status IN_PROGRESS or COMPLETED.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer', 'company'] },
            description: 'User persona - must match user role in thread',
          },
          {
            name: 'threadId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Chat thread ID',
          },
        ],
        responses: {
          200: {
            description: 'Chat thread details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChatThreadItem' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - user is not a participant or task status is invalid' },
          404: { description: 'Chat thread not found' },
        },
      },
    },
    '/api/v1/me/chat/threads/{threadId}/messages': {
      get: {
        tags: ['Me'],
        summary: 'Get messages in a chat thread',
        description:
          'Get messages from a specific chat thread with pagination. Messages are sorted by sent_at in ascending order (chronological). User must be a participant in the thread and the associated task must have status IN_PROGRESS or COMPLETED.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer', 'company'] },
            description: 'User persona - must match user role in thread',
          },
          {
            name: 'threadId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Chat thread ID',
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number (starting from 1)',
          },
          {
            name: 'size',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 50 },
            description: 'Number of items per page',
          },
        ],
        responses: {
          200: {
            description: 'Paginated list of messages in chronological order',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GetThreadMessagesResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - user is not a participant or task status is invalid' },
          404: { description: 'Chat thread not found' },
        },
      },
      post: {
        tags: ['Me'],
        summary: 'Send a message in a chat thread',
        description:
          'Send a new message in a specific chat thread. User must be a participant in the thread and the associated task must have status IN_PROGRESS or COMPLETED. Creates a notification for the other participant.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer', 'company'] },
            description: 'User persona - must match user role in thread',
          },
          {
            name: 'threadId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Chat thread ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateMessageRequest' },
              example: {
                text: 'Hello! I have a question about this task.',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Message sent successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateMessageResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - user is not a participant or task status is invalid' },
          404: { description: 'Chat thread not found' },
        },
      },
    },
    '/api/v1/me/chat/threads/{threadId}/read': {
      post: {
        tags: ['Me'],
        summary: 'Mark all messages in a thread as read',
        description:
          'Mark all messages in a specific chat thread as read for the current user. User must be a participant in the thread and the associated task must have status IN_PROGRESS or COMPLETED. Updates or creates a ChatThreadRead record with the current timestamp.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer', 'company'] },
            description: 'User persona - must match user role in thread',
          },
          {
            name: 'threadId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Chat thread ID',
          },
        ],
        responses: {
          200: {
            description: 'Thread marked as read successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MarkThreadAsReadResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - user is not a participant or task status is invalid' },
          404: { description: 'Chat thread not found' },
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
                display_name: 'Developer',
                primary_role: 'Backend Engineer',
                bio: 'Short bio',
                experience_level: 'MIDDLE',
                location: 'EU',
                timezone: 'Europe/UTC',
                skills: ['Node.js', 'PostgreSQL'],
                tech_stack: ['Express', 'Prisma'],
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
                display_name: 'Developer',
                primary_role: 'Backend Engineer',
                bio: 'Updated bio',
                experience_level: 'MIDDLE',
                location: 'EU',
                timezone: 'Europe/UTC',
                skills: ['Node.js', 'PostgreSQL'],
                tech_stack: ['Express', 'Prisma'],
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
    '/api/v1/profiles/developer/avatar': {
      post: {
        tags: ['Profiles'],
        summary: 'Upload developer avatar',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer'] },
            description: 'User persona (must be developer)',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file (JPEG, PNG, or WebP, max 5MB, min 512x512)',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Avatar uploaded successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadAvatarResponse' },
              },
            },
          },
          400: {
            description: 'Validation error or invalid image',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  missingFile: {
                    value: {
                      error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Validation failed',
                        details: [{ field: 'file', issue: 'File is required' }],
                      },
                    },
                  },
                  invalidFileType: {
                    value: {
                      error: {
                        code: 'INVALID_FILE_TYPE',
                        message: 'File type must be one of: image/jpeg, image/png, image/webp',
                      },
                    },
                  },
                  fileTooLarge: {
                    value: {
                      error: {
                        code: 'FILE_TOO_LARGE',
                        message: 'File size must not exceed 5MB',
                      },
                    },
                  },
                  imageTooSmall: {
                    value: {
                      error: {
                        code: 'IMAGE_TOO_SMALL',
                        message: 'Image resolution must be at least 512x512 pixels',
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Developer profile does not exist' },
          404: { description: 'Profile not found' },
          500: {
            description: 'Upload failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Profiles'],
        summary: 'Delete developer avatar',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer'] },
            description: 'User persona (must be developer)',
          },
        ],
        responses: {
          200: {
            description: 'Avatar deleted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeleteAvatarResponse' },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Developer profile does not exist' },
          404: {
            description: 'Avatar not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  error: {
                    code: 'AVATAR_NOT_FOUND',
                    message: 'Avatar not found',
                  },
                },
              },
            },
          },
          500: {
            description: 'Delete failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
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
                company_name: 'Example Company',
                company_type: 'SMB',
                description: 'We build software products.',
                team_size: 10,
                country: 'US',
                timezone: 'America/New_York',
                contact_email: 'contact@example.com',
                website_url: 'https://example.com',
                links: { linkedin: 'https://linkedin.com/company/example' },
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
      put: {
        tags: ['Profiles'],
        summary: 'Update company profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCompanyProfileRequest' },
              example: {
                company_name: 'Example Company',
                company_type: 'SMB',
                description: 'Updated description',
                team_size: 12,
                country: 'US',
                timezone: 'America/New_York',
                contact_email: 'contact@example.com',
                website_url: 'https://example.com',
                links: { linkedin: 'https://linkedin.com/company/example' },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Company profile updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateCompanyProfileResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          404: { description: 'Profile not found' },
        },
      },
    },
    '/api/v1/profiles/company/{userId}': {
      get: {
        tags: ['Profiles'],
        summary: 'Get public company profile',
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
            description: 'Company profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CompanyPublicProfileResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          404: { description: 'Profile not found' },
        },
      },
    },
    '/api/v1/profiles/company/logo': {
      post: {
        tags: ['Profiles'],
        summary: 'Upload company logo',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
            description: 'User persona (must be company)',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file (JPEG, PNG, or WebP, max 5MB, min 512x512)',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logo uploaded successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadLogoResponse' },
              },
            },
          },
          400: {
            description: 'Validation error or invalid image',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Company profile does not exist' },
          404: { description: 'Profile not found' },
          500: {
            description: 'Upload failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Profiles'],
        summary: 'Delete company logo',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
            description: 'User persona (must be company)',
          },
        ],
        responses: {
          200: {
            description: 'Logo deleted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeleteLogoResponse' },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Company profile does not exist' },
          404: {
            description: 'Logo not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  error: {
                    code: 'LOGO_NOT_FOUND',
                    message: 'Logo not found',
                  },
                },
              },
            },
          },
          500: {
            description: 'Delete failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/projects': {
      post: {
        tags: ['Projects'],
        summary: 'Create project',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProjectRequest' },
              example: {
                title: 'Example Project',
                short_description: 'Build MVP for product',
                description: 'Longer description for the project',
                technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
                visibility: 'PUBLIC',
                status: 'ACTIVE',
                max_talents: 3,
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Project created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateProjectResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Persona not available' },
          409: { description: 'Project title already exists' },
        },
      },
      get: {
        tags: ['Projects'],
        summary: 'Get projects catalog or my projects',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'size',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string', maxLength: 200 },
            description: 'Search in title and short description',
          },
          {
            name: 'technology',
            in: 'query',
            schema: { type: 'string', maxLength: 50 },
            description: 'Filter by technology (repeatable)',
          },
          {
            name: 'visibility',
            in: 'query',
            schema: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
            description: 'Filter by visibility (default PUBLIC for public catalog)',
          },
          {
            name: 'owner',
            in: 'query',
            schema: { type: 'boolean' },
            description:
              'If true, show only my projects (requires Authorization header + X-Persona: company)',
          },
          {
            name: 'include_deleted',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Include deleted projects (only with owner=true)',
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: false,
            schema: { type: 'string', enum: ['company'] },
            description: 'Required when owner=true',
          },
        ],
        responses: {
          200: {
            description: 'Projects list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GetProjectsResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Authentication required (when owner=true)' },
          403: { description: 'Forbidden (include_deleted without owner)' },
        },
      },
    },
    '/api/v1/projects/{projectId}': {
      get: {
        tags: ['Projects'],
        summary: 'Get project details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'include_deleted',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Include deleted project (owner only, requires Authorization header)',
          },
        ],
        responses: {
          200: {
            description: 'Project details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectDetailsResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized (include_deleted=true)' },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Projects'],
        summary: 'Update project',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProjectRequest' },
              example: {
                title: 'Example Project',
                short_description: 'Updated short',
                description: 'Updated long',
                technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
                visibility: 'PUBLIC',
                status: 'ACTIVE',
                max_talents: 5,
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Project updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateProjectResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Not owner' },
          404: { description: 'Not found' },
          409: { description: 'Project title already exists' },
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete project',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
          },
        ],
        responses: {
          200: {
            description: 'Project deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeleteProjectResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Not owner' },
          404: { description: 'Not found' },
        },
      },
    },
    '/api/v1/projects/{projectId}/tasks': {
      get: {
        tags: ['Projects'],
        summary: 'Get tasks for a project',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'size',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'DRAFT',
                'PUBLISHED',
                'IN_PROGRESS',
                'COMPLETION_REQUESTED',
                'COMPLETED',
                'CLOSED',
                'DELETED',
              ],
            },
            description: 'Filter by task status',
          },
          {
            name: 'include_deleted',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Include deleted tasks (project owner only)',
          },
        ],
        responses: {
          200: {
            description: 'Project tasks list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GetTasksResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          403: { description: 'Forbidden (include_deleted without owner)' },
          404: { description: 'Project not found' },
        },
      },
    },
    '/api/v1/projects/{projectId}/reports': {
      post: {
        tags: ['Projects'],
        summary: 'Report a project',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer', 'company'] },
            description: 'Report as developer or company persona',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReportProjectRequest' },
              example: {
                reason: 'SPAM',
                comment: 'This project appears to be spam',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Report created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReportProjectResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          404: { description: 'Project not found' },
          409: { description: 'Already reported' },
        },
      },
    },
    '/api/v1/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Get tasks catalog or my tasks',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'size',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string', maxLength: 200 },
            description: 'Search in title and description',
          },
          {
            name: 'category',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'DATA', 'MOBILE', 'OTHER'],
            },
            description: 'Filter by category',
          },
          {
            name: 'difficulty',
            in: 'query',
            schema: { type: 'string', enum: ['JUNIOR', 'MIDDLE', 'SENIOR', 'ANY'] },
            description: 'Filter by difficulty',
          },
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE'] },
            description: 'Filter by type',
          },
          {
            name: 'skill',
            in: 'query',
            schema: { type: 'string', maxLength: 50 },
            description: 'Filter by required skills (repeatable)',
          },
          {
            name: 'project_id',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
            description: 'Filter by project',
          },
          {
            name: 'owner',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description:
              'If true, show only my tasks (requires Authorization header + X-Persona: company)',
          },
          {
            name: 'include_deleted',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Include deleted tasks (only with owner=true)',
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: false,
            schema: { type: 'string', enum: ['company'] },
            description: 'Required when owner=true',
          },
        ],
        responses: {
          200: {
            description: 'Tasks list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GetTasksCatalogResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Authentication required (when owner=true)' },
          403: { description: 'Company persona required (when owner=true)' },
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create task draft',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTaskDraftRequest' },
              example: {
                project_id: null,
                title: 'Add filtering to tasks catalog',
                description: 'Implement filters + pagination.',
                category: 'BACKEND',
                type: 'EXPERIENCE',
                difficulty: 'JUNIOR',
                required_skills: ['Java', 'Spring'],
                estimated_effort_hours: 6,
                expected_duration: 'DAYS_8_14',
                communication_language: 'EN',
                timezone_preference: 'Europe/Any',
                application_deadline: '2026-02-20',
                visibility: 'PUBLIC',
                deliverables: 'PR with code + tests',
                requirements: 'REST + pagination',
                nice_to_have: 'OpenAPI',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Task draft created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateTaskDraftResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Company persona required' },
          404: { description: 'Project not found' },
        },
      },
    },
    '/api/v1/tasks/{taskId}': {
      get: {
        tags: ['Tasks'],
        summary: 'Get task details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'taskId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: false,
            schema: { type: 'string', enum: ['company'] },
            description: 'Required for owner access to non-public tasks',
          },
        ],
        responses: {
          200: {
            description: 'Task details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TaskDetailsResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized (non-public task without token)' },
          403: { description: 'Forbidden (not task owner or persona required)' },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Tasks'],
        summary: 'Update task draft or published task',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'taskId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateTaskDraftRequest' },
              example: {
                project_id: null,
                title: 'Updated task title',
                description: 'Updated task description.',
                category: 'BACKEND',
                type: 'EXPERIENCE',
                difficulty: 'JUNIOR',
                required_skills: ['Java', 'Spring'],
                estimated_effort_hours: 8,
                expected_duration: 'DAYS_15_30',
                communication_language: 'EN',
                timezone_preference: 'Europe/Any',
                application_deadline: '2026-02-25',
                visibility: 'PUBLIC',
                deliverables: 'Updated deliverables',
                requirements: 'Updated requirements',
                nice_to_have: 'Updated nice to have',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Task updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateTaskDraftResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Company persona required or not task owner' },
          404: { description: 'Task or project not found' },
          409: { description: 'Task in invalid state (cannot update IN_PROGRESS/COMPLETED tasks)' },
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task (DRAFT/PUBLISHED/CLOSED -> DELETED)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'taskId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
          },
        ],
        responses: {
          200: {
            description: 'Task deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeleteTaskResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Company persona required or not task owner' },
          404: { description: 'Task not found' },
          409: {
            description: 'Task in invalid state (cannot delete IN_PROGRESS/COMPLETED tasks)',
          },
        },
      },
    },
    '/api/v1/tasks/{taskId}/publish': {
      post: {
        tags: ['Tasks'],
        summary: 'Publish a task (DRAFT -> PUBLISHED)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'taskId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
          },
        ],
        responses: {
          200: {
            description: 'Task published',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PublishTaskResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Company persona required or not task owner' },
          404: { description: 'Task not found' },
          409: { description: 'Task in invalid state (only DRAFT tasks can be published)' },
        },
      },
    },
    '/api/v1/tasks/{taskId}/completion/request': {
      post: {
        tags: ['Tasks'],
        summary: 'Request task completion (IN_PROGRESS -> COMPLETION_REQUESTED)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'taskId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer'] },
          },
        ],
        responses: {
          200: {
            description: 'Completion requested',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RequestTaskCompletionResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Only accepted developer can request completion' },
          404: { description: 'Task not found' },
          409: { description: 'Task in invalid state (must be IN_PROGRESS)' },
        },
        'x-side-effects': [
          {
            type: 'COMPLETION_REQUESTED',
            recipient: 'task.owner_user_id',
            actor: 'developer',
            payload: { task_id: 'uuid' },
          },
        ],
      },
    },
    '/api/v1/tasks/{taskId}/completion/confirm': {
      post: {
        tags: ['Tasks'],
        summary: 'Confirm task completion (COMPLETION_REQUESTED -> COMPLETED)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'taskId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
          },
        ],
        responses: {
          200: {
            description: 'Task completed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ConfirmTaskCompletionResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Not task owner' },
          404: { description: 'Task not found' },
          409: { description: 'Task in invalid state (must be COMPLETION_REQUESTED)' },
        },
        'x-side-effects': [
          {
            type: 'TASK_COMPLETED',
            recipient: 'accepted developer',
            actor: 'company',
            payload: { task_id: 'uuid', completed_at: '2026-02-14T15:00:00Z' },
          },
        ],
      },
    },
    '/api/v1/tasks/{taskId}/reviews': {
      post: {
        tags: ['Tasks'],
        summary: 'Create a review for a completed task',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'taskId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer', 'company'] },
            description: 'Author must be a task participant (developer or company owner)',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  rating: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 5,
                    description: 'Rating from 1 to 5',
                  },
                  text: {
                    type: 'string',
                    minLength: 5,
                    maxLength: 1000,
                    nullable: true,
                    description: 'Optional review text',
                  },
                },
                required: ['rating'],
              },
              example: {
                rating: 5,
                text: 'Great collaboration and professional approach to the task',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Review created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateReviewResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'User is not a task participant' },
          404: { description: 'Task not found' },
          409: { description: 'Task not completed, or user already reviewed this task' },
        },
        'x-side-effects': [
          {
            type: 'REVIEW_CREATED',
            recipient: 'target user (the other participant)',
            actor: 'author (developer or company owner)',
            payload: { review_id: 'uuid', task_id: 'uuid', rating: 5 },
          },
        ],
      },
    },
    '/api/v1/tasks/{taskId}/applications': {
      get: {
        tags: ['Tasks'],
        summary: 'Get applications for a task (company owner view)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'taskId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
            description: 'Must be company persona',
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number (starting from 1)',
          },
          {
            name: 'size',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page',
          },
        ],
        responses: {
          200: {
            description: 'Paginated list of applications for the task',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GetTaskApplicationsResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Not task owner or company persona required' },
          404: { description: 'Task not found' },
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Apply to a published task',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'taskId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['developer'] },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTaskApplicationRequest' },
              example: {
                message: 'I can do it this week.',
                proposed_plan: 'Day1 filters, Day2 tests...',
                availability_note: 'Evenings',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Application created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateTaskApplicationResponse' },
              },
            },
          },
          400: { description: 'Validation error (VALIDATION_ERROR)' },
          401: { description: 'Unauthorized (AUTH_REQUIRED or INVALID_TOKEN)' },
          403: { description: 'Developer persona required (PERSONA_NOT_AVAILABLE)' },
          404: { description: 'Task not found (TASK_NOT_FOUND)' },
          409: {
            description: 'Task not open (TASK_NOT_OPEN) or already applied (ALREADY_APPLIED)',
          },
        },
        'x-side-effects': [
          {
            type: 'APPLICATION_CREATED',
            recipient: 'task.owner_user_id',
            actor: 'developer',
            payload: { task_id: 'uuid', application_id: 'uuid', review_id: null },
          },
        ],
      },
    },
    '/api/v1/tasks/{taskId}/close': {
      post: {
        tags: ['Tasks'],
        summary: 'Close a task without execution (DRAFT/PUBLISHED -> CLOSED)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'taskId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
          },
        ],
        responses: {
          200: {
            description: 'Task closed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CloseTaskResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Company persona required or not task owner' },
          404: { description: 'Task not found' },
          409: {
            description: 'Task in invalid state (cannot close IN_PROGRESS/COMPLETED/CLOSED tasks)',
          },
        },
      },
    },
    '/api/v1/applications/{applicationId}/accept': {
      post: {
        tags: ['Applications'],
        summary: 'Accept an application for a task',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'applicationId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Application UUID',
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
            description: 'Must be company persona',
          },
        ],
        responses: {
          200: {
            description: 'Application accepted, task status updated to IN_PROGRESS',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AcceptApplicationResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Not task owner or company persona required' },
          404: { description: 'Application not found' },
          409: {
            description: 'Invalid state - task must be PUBLISHED and application must be APPLIED',
          },
        },
      },
    },
    '/api/v1/applications/{applicationId}/reject': {
      post: {
        tags: ['Applications'],
        summary: 'Reject an application for a task',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'applicationId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Application UUID',
          },
          {
            name: 'X-Persona',
            in: 'header',
            required: true,
            schema: { type: 'string', enum: ['company'] },
            description: 'Must be company persona',
          },
        ],
        responses: {
          200: {
            description: 'Application rejected',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RejectApplicationResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Not task owner or company persona required' },
          404: { description: 'Application not found' },
          409: { description: 'Invalid state - application already accepted or rejected' },
        },
      },
    },
    '/api/v1/users/{userId}/reviews': {
      get: {
        tags: ['Users'],
        summary: 'Get reviews for a user',
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User UUID',
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number (starting from 1)',
          },
          {
            name: 'size',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Page size (max 100)',
          },
        ],
        responses: {
          200: {
            description: 'User reviews retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserReviewsResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          404: { description: 'User not found' },
        },
      },
    },
  },
});
