import { TECHNOLOGY_TYPE_ENUM } from '../constants.js';

export const tasksSchemas = {
  CreateTaskDraftRequest: {
    type: 'object',
    required: [
      'title',
      'description',
      'category',
      'type',
      'difficulty',
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
      project_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '0e9a7df8-6407-48e3-b7cb-fd6f119f48a0',
      },
      title: {
        type: 'string',
        minLength: 3,
        maxLength: 120,
        example: 'Implement advanced task filters API',
      },
      description: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example:
          'Add backend support for filtering tasks by category, difficulty, technology, and date ranges with pagination.',
      },
      category: {
        type: 'string',
        enum: TECHNOLOGY_TYPE_ENUM,
      },
      type: {
        type: 'string',
        enum: ['PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE'],
      },
      difficulty: {
        type: 'string',
        enum: ['JUNIOR', 'MIDDLE', 'SENIOR', 'ANY'],
      },
      technology_ids: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        uniqueItems: true,
        maxItems: 20,
        description: 'Array of technology IDs from the catalog',
        example: ['6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61', '0f8e1e98-9768-4a35-bcf0-356ad0575e2d'],
      },
      estimated_effort_hours: { type: 'integer', minimum: 1, maximum: 1000 },
      expected_duration: {
        type: 'string',
        enum: ['DAYS_1_7', 'DAYS_8_14', 'DAYS_15_30', 'DAYS_30_PLUS'],
      },
      communication_language: { type: 'string', minLength: 2, maxLength: 50, example: 'English' },
      timezone_preference: {
        type: 'string',
        minLength: 3,
        maxLength: 60,
        example: 'Europe/Warsaw',
      },
      application_deadline: { type: 'string', format: 'date', example: '2026-03-20' },
      visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
      deliverables: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
        example: 'Production-ready API endpoints, tests, and updated Swagger docs.',
      },
      requirements: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
        example: 'Node.js, Prisma, PostgreSQL, and confident REST API design skills.',
      },
      nice_to_have: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
        example: 'Experience with query optimization and OpenAPI schema design.',
      },
    },
  },
  CreateTaskDraftResponse: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      status: { type: 'string', enum: ['DRAFT'] },
      created_at: { type: 'string', format: 'date-time', example: '2026-03-07T14:45:00Z' },
    },
  },
  UpdateTaskDraftRequest: {
    type: 'object',
    required: ['title', 'description', 'category', 'type', 'difficulty'],
    properties: {
      project_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '0e9a7df8-6407-48e3-b7cb-fd6f119f48a0',
      },
      title: {
        type: 'string',
        minLength: 3,
        maxLength: 120,
        example: 'Implement advanced task filters API (v2)',
      },
      description: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example: 'Refine filter logic, add sorting options, and improve API response metadata.',
      },
      category: {
        type: 'string',
        enum: TECHNOLOGY_TYPE_ENUM,
      },
      type: {
        type: 'string',
        enum: ['PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE'],
      },
      difficulty: {
        type: 'string',
        enum: ['JUNIOR', 'MIDDLE', 'SENIOR', 'ANY'],
      },
      technology_ids: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        uniqueItems: true,
        maxItems: 20,
        description:
          'Array of technology IDs from the catalog. If provided, replaces all existing technologies.',
        example: ['6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61', '0f8e1e98-9768-4a35-bcf0-356ad0575e2d'],
      },
      estimated_effort_hours: { type: 'integer', minimum: 1, maximum: 1000 },
      expected_duration: {
        type: 'string',
        enum: ['DAYS_1_7', 'DAYS_8_14', 'DAYS_15_30', 'DAYS_30_PLUS'],
      },
      communication_language: { type: 'string', minLength: 2, maxLength: 50, example: 'English' },
      timezone_preference: {
        type: 'string',
        minLength: 3,
        maxLength: 60,
        example: 'Europe/Warsaw',
      },
      application_deadline: { type: 'string', format: 'date', example: '2026-03-25' },
      visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
      deliverables: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
        example: 'API, tests, and documentation updates.',
      },
      requirements: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
        example: 'Strong Node.js backend skills and SQL query tuning.',
      },
      nice_to_have: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
        example: 'Experience designing search/filter UX contracts.',
      },
    },
  },
  UpdateTaskDraftResponse: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      updated: { type: 'boolean' },
      updated_at: { type: 'string', format: 'date-time', example: '2026-03-07T15:10:00Z' },
    },
  },
  PublishTaskResponse: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      status: { type: 'string', enum: ['PUBLISHED'] },
      published_at: { type: 'string', format: 'date-time', example: '2026-03-07T16:00:00Z' },
    },
  },
  RequestTaskCompletionResponse: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      status: { type: 'string', enum: ['COMPLETION_REQUESTED'] },
    },
  },
  ConfirmTaskCompletionResponse: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      status: { type: 'string', enum: ['COMPLETED'] },
      completed_at: { type: 'string', format: 'date-time', example: '2026-03-28T12:40:00Z' },
    },
  },
  RejectTaskCompletionRequest: {
    type: 'object',
    properties: {
      feedback: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        description:
          'Feedback explaining why the completion is rejected and what needs to be fixed',
        example:
          'The implementation does not meet the requirements. Please fix the following issues: 1) Add proper error handling, 2) Improve test coverage',
      },
    },
  },
  RejectTaskCompletionResponse: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid' },
      status: {
        type: 'string',
        enum: ['IN_PROGRESS', 'FAILED'],
        description: 'IN_PROGRESS if attempts < 3, FAILED if attempts >= 3',
      },
      rejection_count: {
        type: 'integer',
        description: 'Number of times completion has been rejected (1-3)',
        example: 1,
      },
      is_final_rejection: {
        type: 'boolean',
        description: 'True if this was the 3rd rejection and task is now FAILED',
        example: false,
      },
    },
  },
  CloseTaskResponse: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      status: { type: 'string', enum: ['CLOSED'] },
      closed_at: { type: 'string', format: 'date-time', example: '2026-03-29T09:00:00Z' },
    },
  },
  DeleteTaskResponse: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      status: { type: 'string', enum: ['DELETED'] },
      deleted_at: { type: 'string', format: 'date-time', example: '2026-03-30T10:15:00Z' },
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
      user_id: { type: 'string', format: 'uuid', example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2' },
      display_name: { type: 'string', example: 'Olena Kovalenko' },
      primary_role: { type: 'string', example: 'Backend Engineer' },
      avatar_url: { type: 'string', format: 'uri', nullable: true },
      avg_rating: { type: 'number', format: 'float', nullable: true },
      reviews_count: { type: 'integer' },
    },
  },
  TaskCandidate: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid', example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2' },
      display_name: { type: 'string', nullable: true, example: 'Olena Kovalenko' },
      primary_role: { type: 'string', nullable: true, example: 'Backend Engineer' },
      avatar_url: { type: 'string', format: 'uri', nullable: true },
      experience_level: {
        type: 'string',
        enum: ['STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR'],
        nullable: true,
      },
      availability: {
        type: 'string',
        enum: ['FEW_HOURS_WEEK', 'PART_TIME', 'FULL_TIME'],
        nullable: true,
      },
      avg_rating: { type: 'number', format: 'float' },
      reviews_count: { type: 'integer' },
      technologies: {
        type: 'array',
        items: { $ref: '#/components/schemas/Technology' },
      },
      matched_technologies: {
        type: 'array',
        items: { $ref: '#/components/schemas/Technology' },
      },
      score: { type: 'number', format: 'float' },
      already_applied: { type: 'boolean' },
      already_invited: { type: 'boolean' },
      can_invite: { type: 'boolean' },
    },
  },
  TaskRecommendedDevelopersResponse: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/TaskCandidate' },
      },
      total: { type: 'integer', minimum: 0 },
    },
  },
  TaskCandidatesResponse: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/TaskCandidate' },
      },
      page: { type: 'integer', minimum: 1 },
      size: { type: 'integer', minimum: 1, maximum: 100 },
      total: { type: 'integer', minimum: 0 },
    },
  },
  TaskCompany: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid', example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c' },
      company_name: { type: 'string', example: 'NovaTech Labs' },
      verified: { type: 'boolean' },
      avg_rating: { type: 'number', format: 'float' },
      reviews_count: { type: 'integer' },
    },
  },
  TaskProject: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        format: 'uuid',
        example: '0e9a7df8-6407-48e3-b7cb-fd6f119f48a0',
      },
      title: { type: 'string', example: 'TeamUp Analytics Dashboard' },
    },
  },
  TaskListItem: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      title: { type: 'string', example: 'Implement advanced task filters API' },
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
        enum: TECHNOLOGY_TYPE_ENUM,
      },
      type: { type: 'string', enum: ['PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE'] },
      difficulty: { type: 'string', enum: ['JUNIOR', 'MIDDLE', 'SENIOR', 'ANY'] },
      technologies: {
        type: 'array',
        items: { $ref: '#/components/schemas/TechnologyWithRequirement' },
      },
      published_at: { type: 'string', format: 'date-time', nullable: true },
      project: { $ref: '#/components/schemas/TaskProject', nullable: true },
      company: { $ref: '#/components/schemas/TaskCompany' },
    },
  },
  TaskDetailsResponse: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      owner_user_id: {
        type: 'string',
        format: 'uuid',
        example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c',
      },
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
      title: {
        type: 'string',
        minLength: 3,
        maxLength: 120,
        example: 'Implement advanced task filters API',
      },
      description: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example: 'Create robust filter endpoints with strong validation and pagination metadata.',
      },
      category: {
        type: 'string',
        enum: TECHNOLOGY_TYPE_ENUM,
      },
      type: { type: 'string', enum: ['PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE'] },
      difficulty: { type: 'string', enum: ['JUNIOR', 'MIDDLE', 'SENIOR', 'ANY'] },
      technologies: {
        type: 'array',
        items: { $ref: '#/components/schemas/TechnologyWithRequirement' },
        description: 'Array of technology objects with is_required flag',
      },
      estimated_effort_hours: { type: 'integer', minimum: 1, maximum: 1000 },
      expected_duration: {
        type: 'string',
        enum: ['DAYS_1_7', 'DAYS_8_14', 'DAYS_15_30', 'DAYS_30_PLUS'],
      },
      communication_language: { type: 'string', minLength: 2, maxLength: 50, example: 'English' },
      timezone_preference: {
        type: 'string',
        minLength: 3,
        maxLength: 60,
        example: 'Europe/Warsaw',
      },
      application_deadline: {
        type: 'string',
        format: 'date',
        nullable: true,
        example: '2026-03-20',
      },
      visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
      deliverables: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
        example: 'Production endpoint + tests + docs.',
      },
      requirements: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
        example: 'Strong Node.js, Prisma, SQL, and test coverage discipline.',
      },
      nice_to_have: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
        example: 'Previous experience with OpenAPI-first development.',
      },
      created_at: { type: 'string', format: 'date-time' },
      published_at: { type: 'string', format: 'date-time', nullable: true },
      accepted_application_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '8adf5d0f-7d45-4310-bc58-8a70aef6c9f9',
      },
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
};
