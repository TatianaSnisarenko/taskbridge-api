export const projectsSchemas = {
  CreateProjectRequest: {
    type: 'object',
    required: ['title', 'short_description', 'description'],
    properties: {
      title: {
        type: 'string',
        minLength: 3,
        maxLength: 120,
        example: 'TeamUp Analytics Dashboard',
      },
      short_description: {
        type: 'string',
        minLength: 10,
        maxLength: 200,
        example: 'Build MVP dashboard for company task analytics and KPIs.',
      },
      description: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example:
          'Create an internal web dashboard with charts for task statuses, completion velocity, and developer performance metrics.',
      },
      technology_ids: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        uniqueItems: true,
        maxItems: 20,
        description: 'Array of technology IDs from the catalog',
        example: ['6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61', '8a311c84-7d56-4d1e-96c4-9ca2f83e7082'],
      },
      visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
      status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
      max_talents: { type: 'integer', minimum: 1, maximum: 100 },
      deadline: { type: 'string', format: 'date', example: '2026-09-01' },
    },
  },
  CreateProjectResponse: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        format: 'uuid',
        example: '0e9a7df8-6407-48e3-b7cb-fd6f119f48a0',
      },
      created_at: { type: 'string', format: 'date-time', example: '2026-03-07T14:05:00Z' },
    },
  },
  UpdateProjectRequest: {
    type: 'object',
    required: ['title', 'short_description', 'description'],
    properties: {
      title: {
        type: 'string',
        minLength: 3,
        maxLength: 120,
        example: 'TeamUp Analytics Dashboard v2',
      },
      short_description: {
        type: 'string',
        minLength: 10,
        maxLength: 200,
        example: 'Expanded dashboard with role-specific widgets and better filtering.',
      },
      description: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example:
          'Extend analytics dashboard by adding company/developer role views, export support, and improved date-range filters.',
      },
      technology_ids: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        uniqueItems: true,
        maxItems: 20,
        description:
          'Array of technology IDs from the catalog. If provided, replaces all existing technologies.',
        example: [
          '6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61',
          '8a311c84-7d56-4d1e-96c4-9ca2f83e7082',
          '0f8e1e98-9768-4a35-bcf0-356ad0575e2d',
        ],
      },
      visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
      status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
      max_talents: { type: 'integer', minimum: 1, maximum: 100 },
      deadline: { type: 'string', format: 'date', example: '2026-10-01' },
    },
  },
  UpdateProjectResponse: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        format: 'uuid',
        example: '0e9a7df8-6407-48e3-b7cb-fd6f119f48a0',
      },
      updated: { type: 'boolean', example: true },
      updated_at: { type: 'string', format: 'date-time', example: '2026-03-07T15:10:00Z' },
    },
  },
  DeleteProjectResponse: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        format: 'uuid',
        example: '0e9a7df8-6407-48e3-b7cb-fd6f119f48a0',
      },
      deleted_at: { type: 'string', format: 'date-time', example: '2026-03-07T16:00:00Z' },
    },
  },
  ProjectListItem: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        format: 'uuid',
        example: '0e9a7df8-6407-48e3-b7cb-fd6f119f48a0',
      },
      title: { type: 'string', example: 'TeamUp Analytics Dashboard' },
      short_description: { type: 'string', example: 'Dashboard for project and task analytics.' },
      technologies: {
        type: 'array',
        items: { $ref: '#/components/schemas/TechnologyWithRequirement' },
        description: 'Array of technology objects with is_required flag',
      },
      visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
      status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
      max_talents: { type: 'integer' },
      deadline: { type: 'string', format: 'date', nullable: true },
      created_at: { type: 'string', format: 'date-time' },
      company: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            format: 'uuid',
            example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c',
          },
          company_name: { type: 'string', example: 'NovaTech Labs' },
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
  TaskPreview: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      title: { type: 'string', example: 'Implement KPI filtering API' },
      description: {
        type: 'string',
        nullable: true,
        example: 'Add server-side filtering by date range and status.',
      },
      status: {
        type: 'string',
        enum: [
          'DRAFT',
          'PUBLISHED',
          'IN_PROGRESS',
          'COMPLETION_REQUESTED',
          'COMPLETED',
          'FAILED',
          'CLOSED',
          'DELETED',
        ],
      },
    },
  },
  ProjectDetailsResponse: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        format: 'uuid',
        example: '0e9a7df8-6407-48e3-b7cb-fd6f119f48a0',
      },
      owner_user_id: {
        type: 'string',
        format: 'uuid',
        example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c',
      },
      title: { type: 'string', example: 'TeamUp Analytics Dashboard' },
      short_description: { type: 'string', example: 'Dashboard for project and task analytics.' },
      description: {
        type: 'string',
        example:
          'Build and iterate on analytics features for tracking delivery and collaboration quality.',
      },
      technologies: { type: 'array', items: { type: 'string' } },
      visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
      status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
      max_talents: { type: 'integer' },
      deadline: { type: 'string', format: 'date', nullable: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
      deleted_at: { type: 'string', format: 'date-time', nullable: true },
      company: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            format: 'uuid',
            example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c',
          },
          company_name: { type: 'string', example: 'NovaTech Labs' },
          verified: { type: 'boolean' },
          avg_rating: { type: 'number', format: 'float' },
          reviews_count: { type: 'integer' },
        },
      },
      tasks_summary: { $ref: '#/components/schemas/ProjectTasksSummary' },
      tasks_preview: {
        type: 'array',
        items: { $ref: '#/components/schemas/TaskPreview' },
        description:
          'Preview of tasks in the project, sorted by published_at DESC. Public users see only PUBLISHED+PUBLIC tasks. Configurable via preview_limit parameter (default: 3, max: 20).',
      },
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
        example: 'MISLEADING',
      },
      comment: {
        type: 'string',
        maxLength: 1000,
        example: 'The project description does not match the posted requirements.',
      },
    },
  },
  ReportProjectResponse: {
    type: 'object',
    properties: {
      report_id: {
        type: 'string',
        format: 'uuid',
        example: 'a7068b19-a2fa-45fb-a3c3-8ced2f6b4eb5',
      },
      created_at: { type: 'string', format: 'date-time', example: '2026-03-07T17:20:00Z' },
    },
  },
};
