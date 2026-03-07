export const applicationsSchemas = {
  CreateTaskApplicationRequest: {
    type: 'object',
    required: ['message'],
    properties: {
      message: {
        type: 'string',
        minLength: 10,
        maxLength: 1000,
        example: 'I have 3+ years with Node.js and can deliver this task this week.',
      },
      proposed_plan: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example: 'Day 1: API contract and tests. Day 2: implementation. Day 3: fixes and docs.',
      },
      availability_note: {
        type: 'string',
        minLength: 2,
        maxLength: 200,
        example: 'Available weekdays after 18:00 CET and full Saturday.',
      },
    },
  },
  CreateTaskApplicationResponse: {
    type: 'object',
    properties: {
      application_id: {
        type: 'string',
        format: 'uuid',
        example: '8adf5d0f-7d45-4310-bc58-8a70aef6c9f9',
      },
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      developer_user_id: {
        type: 'string',
        format: 'uuid',
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
      status: { type: 'string', enum: ['APPLIED'] },
      created_at: { type: 'string', format: 'date-time', example: '2026-03-07T11:20:00Z' },
    },
  },
  TaskApplicationItem: {
    type: 'object',
    properties: {
      application_id: {
        type: 'string',
        format: 'uuid',
        example: '8adf5d0f-7d45-4310-bc58-8a70aef6c9f9',
      },
      status: { type: 'string', enum: ['APPLIED', 'ACCEPTED', 'REJECTED'] },
      message: {
        type: 'string',
        nullable: true,
        example: 'Ready to start immediately and provide daily status updates.',
      },
      proposed_plan: {
        type: 'string',
        nullable: true,
        example: 'Implement endpoint, add tests, then align docs with final response schema.',
      },
      availability_note: { type: 'string', nullable: true, example: '20-25 hours this week.' },
      created_at: { type: 'string', format: 'date-time', example: '2026-03-07T11:20:00Z' },
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
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      accepted_application_id: {
        type: 'string',
        format: 'uuid',
        example: '8adf5d0f-7d45-4310-bc58-8a70aef6c9f9',
      },
      task_status: { type: 'string', enum: ['IN_PROGRESS'] },
      accepted_developer_user_id: {
        type: 'string',
        format: 'uuid',
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
    },
  },
  RejectApplicationResponse: {
    type: 'object',
    properties: {
      application_id: {
        type: 'string',
        format: 'uuid',
        example: '8adf5d0f-7d45-4310-bc58-8a70aef6c9f9',
      },
      status: { type: 'string', enum: ['REJECTED'] },
      updated_at: { type: 'string', format: 'date-time', example: '2026-03-07T12:05:00Z' },
    },
  },
  ApplicationTaskInfo: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      title: { type: 'string', example: 'Implement Role-based Dashboard Filters' },
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
      user_id: { type: 'string', format: 'uuid', example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c' },
      company_name: { type: 'string', example: 'NovaTech Labs' },
    },
  },
  MyApplicationItem: {
    type: 'object',
    properties: {
      application_id: {
        type: 'string',
        format: 'uuid',
        example: '8adf5d0f-7d45-4310-bc58-8a70aef6c9f9',
      },
      status: { type: 'string', enum: ['APPLIED', 'ACCEPTED', 'REJECTED'] },
      created_at: { type: 'string', format: 'date-time', example: '2026-03-07T11:20:00Z' },
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
};
