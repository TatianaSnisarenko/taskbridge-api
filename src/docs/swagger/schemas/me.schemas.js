export const meSchemas = {
  MyTaskItem: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      title: { type: 'string', example: 'Implement advanced task filters API' },
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
  MyProjectItem: {
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
      status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
      visibility: { type: 'string', enum: ['PUBLIC', 'UNLISTED'] },
      max_talents: { type: 'integer', minimum: 1 },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
      company: { $ref: '#/components/schemas/TaskCompany' },
    },
  },
  GetMyProjectsResponse: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { $ref: '#/components/schemas/MyProjectItem' } },
      page: { type: 'integer', example: 1 },
      size: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 2 },
    },
  },
  NotificationItem: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '4f5a6b1d-cf72-4c06-b121-dca441c326cd' },
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
      actor_user_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
      project_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '0e9a7df8-6407-48e3-b7cb-fd6f119f48a0',
      },
      task_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5',
      },
      thread_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: 'a65f07fe-8ed2-4862-ae89-590520f89f59',
      },
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
      id: { type: 'string', format: 'uuid', example: '4f5a6b1d-cf72-4c06-b121-dca441c326cd' },
      read_at: { type: 'string', format: 'date-time', example: '2026-03-07T18:10:00Z' },
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
      thread_id: {
        type: 'string',
        format: 'uuid',
        example: 'a65f07fe-8ed2-4862-ae89-590520f89f59',
      },
      task: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            format: 'uuid',
            example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5',
          },
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
          user_id: {
            type: 'string',
            format: 'uuid',
            example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
          },
          display_name: { type: 'string', example: 'Tetiana' },
          company_name: { type: 'string', nullable: true, example: null },
          avatar_url: { type: 'string', format: 'uri', nullable: true },
        },
      },
      last_message: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string', format: 'uuid', example: '95a53834-d6bb-4b2f-9f6b-e1a9173f12f8' },
          text: { type: 'string', example: 'Great! Looking forward to your implementation.' },
          sender_user_id: {
            type: 'string',
            format: 'uuid',
            example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c',
          },
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
      id: { type: 'string', format: 'uuid', example: '95a53834-d6bb-4b2f-9f6b-e1a9173f12f8' },
      sender_user_id: {
        type: 'string',
        format: 'uuid',
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
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
      id: { type: 'string', format: 'uuid', example: '95a53834-d6bb-4b2f-9f6b-e1a9173f12f8' },
      thread_id: {
        type: 'string',
        format: 'uuid',
        example: 'a65f07fe-8ed2-4862-ae89-590520f89f59',
      },
      sender_user_id: {
        type: 'string',
        format: 'uuid',
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
      sender_persona: { type: 'string', enum: ['developer', 'company'] },
      text: { type: 'string', example: 'Hello! I have a question about this task.' },
      sent_at: { type: 'string', format: 'date-time' },
      read_at: { type: 'null', description: 'New messages are always unread (null)' },
    },
  },
  MarkThreadAsReadResponse: {
    type: 'object',
    properties: {
      thread_id: {
        type: 'string',
        format: 'uuid',
        example: 'a65f07fe-8ed2-4862-ae89-590520f89f59',
      },
      read_at: { type: 'string', format: 'date-time', example: '2026-02-14T15:00:00Z' },
    },
  },
};
