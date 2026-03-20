export const meSchemas = {
  OnboardingRoleState: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['not_started', 'skipped', 'completed'],
        example: 'completed',
      },
      version: { type: 'integer', minimum: 1, example: 1 },
      completed_at: { type: 'string', format: 'date-time', nullable: true },
      skipped_at: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  OnboardingState: {
    type: 'object',
    properties: {
      developer: { $ref: '#/components/schemas/OnboardingRoleState' },
      company: { $ref: '#/components/schemas/OnboardingRoleState' },
    },
  },
  GetMeResponse: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      hasDeveloperProfile: { type: 'boolean' },
      hasCompanyProfile: { type: 'boolean' },
      onboarding: { $ref: '#/components/schemas/OnboardingState' },
    },
  },
  UpdateMyOnboardingRequest: {
    type: 'object',
    required: ['role', 'status', 'version'],
    properties: {
      role: { type: 'string', enum: ['developer', 'company'], example: 'developer' },
      status: { type: 'string', enum: ['completed', 'skipped'], example: 'completed' },
      version: { type: 'integer', minimum: 1, example: 1 },
    },
  },
  UpdateMyOnboardingResponse: {
    type: 'object',
    properties: {
      role: { type: 'string', enum: ['developer', 'company'], example: 'developer' },
      status: {
        type: 'string',
        enum: ['not_started', 'skipped', 'completed'],
        example: 'completed',
      },
      version: { type: 'integer', minimum: 1, example: 1 },
      completed_at: { type: 'string', format: 'date-time', nullable: true },
      skipped_at: { type: 'string', format: 'date-time', nullable: true },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  ResetMyOnboardingRequest: {
    type: 'object',
    required: ['role'],
    properties: {
      role: { type: 'string', enum: ['developer', 'company'], example: 'company' },
    },
  },
  ResetMyOnboardingResponse: {
    type: 'object',
    properties: {
      role: { type: 'string', enum: ['developer', 'company'], example: 'company' },
      status: { type: 'string', enum: ['not_started'], example: 'not_started' },
      version: { type: 'integer', minimum: 1, example: 1 },
      completed_at: { type: 'string', format: 'date-time', nullable: true, example: null },
      skipped_at: { type: 'string', format: 'date-time', nullable: true, example: null },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  CheckOnboardingResponse: {
    type: 'object',
    required: ['should_show', 'current_status', 'current_version'],
    properties: {
      should_show: {
        type: 'boolean',
        description:
          'True if the onboarding flow should be displayed. False if it was already completed or skipped for the given version.',
        example: true,
      },
      current_status: {
        type: 'string',
        enum: ['not_started', 'skipped', 'completed'],
        example: 'not_started',
      },
      current_version: { type: 'integer', minimum: 1, example: 1 },
    },
  },
  MyApplicationItem: {
    type: 'object',
    properties: {
      application_id: {
        type: 'string',
        format: 'uuid',
        example: '9a49a4c5-4f53-4e8b-87f3-8fce10f58d2f',
      },
      status: { type: 'string', enum: ['APPLIED', 'ACCEPTED', 'REJECTED'], example: 'APPLIED' },
      created_at: { type: 'string', format: 'date-time' },
      task: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            format: 'uuid',
            example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5',
          },
          title: { type: 'string', example: 'Implement advanced task filters API' },
          status: {
            type: 'string',
            enum: [
              'DRAFT',
              'PUBLISHED',
              'IN_PROGRESS',
              'DISPUTE',
              'COMPLETION_REQUESTED',
              'COMPLETED',
              'FAILED',
              'CLOSED',
              'DELETED',
            ],
          },
          deadline: { type: 'string', format: 'date', nullable: true, example: '2026-08-20' },
          project: { $ref: '#/components/schemas/TaskProject', nullable: true },
        },
      },
      company: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            format: 'uuid',
            example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c',
          },
          company_name: { type: 'string', nullable: true, example: 'NovaTech Labs' },
        },
      },
    },
  },
  GetMyApplicationsResponse: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { $ref: '#/components/schemas/MyApplicationItem' } },
      page: { type: 'integer', example: 1 },
      size: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 1 },
    },
  },
  MyTaskItem: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      title: { type: 'string', example: 'Implement advanced task filters API' },
      status: {
        type: 'string',
        enum: ['IN_PROGRESS', 'DISPUTE', 'COMPLETION_REQUESTED', 'COMPLETED'],
      },
      deadline: { type: 'string', format: 'date', nullable: true, example: '2026-08-15' },
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
      deadline: { type: 'string', format: 'date', nullable: true, example: '2026-09-01' },
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
          'TASK_DISPUTE_OPENED',
          'TASK_COMPLETED',
          'TASK_DELETED',
          'REVIEW_CREATED',
          'CHAT_MESSAGE',
          'TASK_INVITE_CREATED',
          'TASK_INVITE_ACCEPTED',
          'TASK_INVITE_DECLINED',
          'TASK_INVITE_CANCELLED',
          'PROJECT_DELETED',
          'PROJECT_ARCHIVED_LIMIT_REACHED',
          'PROJECT_ARCHIVED_MODERATION',
        ],
      },
      actor_user_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
      actor_role: {
        type: 'string',
        enum: ['developer', 'company'],
        nullable: true,
        example: 'developer',
      },
      actor_name: {
        type: 'string',
        nullable: true,
        example: 'Anonymous Developer',
      },
      developer_name: {
        type: 'string',
        nullable: true,
        example: 'Tetiana',
      },
      company_name: {
        type: 'string',
        nullable: true,
        example: 'NovaTech Labs',
      },
      project_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '0e9a7df8-6407-48e3-b7cb-fd6f119f48a0',
      },
      project_title: {
        type: 'string',
        nullable: true,
        example: 'TeamUp Analytics Dashboard',
      },
      task_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5',
      },
      task_title: {
        type: 'string',
        nullable: true,
        example: 'Implement notifications feed cards',
      },
      thread_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: 'a65f07fe-8ed2-4862-ae89-590520f89f59',
      },
      message: {
        type: 'string',
        example: 'New application received: Implement notifications feed cards',
      },
      category: {
        type: 'string',
        enum: ['chat', 'projects', 'reviews'],
        example: 'projects',
      },
      target: {
        type: 'object',
        nullable: true,
        properties: {
          type: {
            type: 'string',
            enum: ['thread', 'task', 'project'],
            example: 'task',
          },
          id: {
            type: 'string',
            format: 'uuid',
            example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5',
          },
          url: {
            type: 'string',
            example: '/tasks/21f01069-2f1f-47ea-bf23-6fbe5b27f2f5',
          },
        },
      },
      payload: { type: 'object', additionalProperties: true },
      created_at: { type: 'string', format: 'date-time' },
      read_at: { type: 'string', format: 'date-time', nullable: true },
      important_at: { type: 'string', format: 'date-time', nullable: true },
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
  MarkNotificationAsUnreadResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '4f5a6b1d-cf72-4c06-b121-dca441c326cd' },
      read_at: { type: 'string', format: 'date-time', nullable: true, example: null },
    },
  },
  MarkNotificationAsImportantResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '4f5a6b1d-cf72-4c06-b121-dca441c326cd' },
      important_at: { type: 'string', format: 'date-time', example: '2026-03-15T10:00:00Z' },
    },
  },
  MarkNotificationAsUnimportantResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '4f5a6b1d-cf72-4c06-b121-dca441c326cd' },
      important_at: { type: 'string', format: 'date-time', nullable: true, example: null },
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
      important_at: { type: 'string', format: 'date-time', nullable: true, example: null },
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
  GetThreadByTaskResponse: {
    allOf: [{ $ref: '#/components/schemas/ChatThreadItem' }],
  },
  ChatMessageAttachment: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        format: 'uri',
        example:
          'https://res.cloudinary.com/example/raw/upload/v123/teamup/chat-attachments/spec.pdf',
      },
      name: { type: 'string', example: 'spec.pdf' },
      type: { type: 'string', example: 'application/pdf' },
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
      attachments: {
        type: 'array',
        items: { $ref: '#/components/schemas/ChatMessageAttachment' },
      },
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
    properties: {
      text: {
        type: 'string',
        maxLength: 2000,
        example: 'Hello! I have a question about this task.',
        description: 'Optional when at least one file is attached.',
      },
    },
    description: 'Either text or at least one file attachment is required.',
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
      attachments: {
        type: 'array',
        items: { $ref: '#/components/schemas/ChatMessageAttachment' },
      },
    },
  },
  MarkMessageAsImportantResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '95a53834-d6bb-4b2f-9f6b-e1a9173f12f8' },
      important_at: { type: 'string', format: 'date-time', example: '2026-03-18T09:15:00Z' },
    },
  },
  MarkMessageAsUnimportantResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '95a53834-d6bb-4b2f-9f6b-e1a9173f12f8' },
      important_at: { type: 'string', format: 'date-time', nullable: true, example: null },
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
  MarkThreadAsImportantResponse: {
    type: 'object',
    properties: {
      thread_id: {
        type: 'string',
        format: 'uuid',
        example: 'a65f07fe-8ed2-4862-ae89-590520f89f59',
      },
      important_at: { type: 'string', format: 'date-time', example: '2026-03-18T12:40:00Z' },
    },
  },
  MarkThreadAsUnimportantResponse: {
    type: 'object',
    properties: {
      thread_id: {
        type: 'string',
        format: 'uuid',
        example: 'a65f07fe-8ed2-4862-ae89-590520f89f59',
      },
      important_at: { type: 'string', format: 'date-time', nullable: true, example: null },
    },
  },
  FavoriteTaskItem: {
    type: 'object',
    properties: {
      favorite_id: {
        type: 'string',
        format: 'uuid',
        example: '7c3d1a2b-1111-4abc-9bcd-000000000001',
      },
      saved_at: { type: 'string', format: 'date-time', example: '2026-03-10T12:00:00Z' },
      task: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            format: 'uuid',
            example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5',
          },
          title: { type: 'string', example: 'Implement REST API for task catalog' },
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
          category: { type: 'string', nullable: true, example: 'BACKEND' },
          difficulty: {
            type: 'string',
            nullable: true,
            enum: ['JUNIOR', 'MIDDLE', 'SENIOR', 'ANY'],
          },
          type: { type: 'string', enum: ['PAID', 'VOLUNTEER'] },
          deadline: { type: 'string', format: 'date', nullable: true, example: '2026-08-15' },
          is_deleted: {
            type: 'boolean',
            description: 'True if the task has been soft-deleted',
            example: false,
          },
          company: {
            type: 'object',
            properties: {
              user_id: {
                type: 'string',
                format: 'uuid',
                example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c',
              },
              company_name: { type: 'string', nullable: true, example: 'NovaTech Labs' },
              verified: { type: 'boolean', example: false },
            },
          },
        },
      },
    },
  },
  AddFavoriteTaskResponse: {
    type: 'object',
    properties: {
      favorite_id: {
        type: 'string',
        format: 'uuid',
        example: '7c3d1a2b-1111-4abc-9bcd-000000000001',
      },
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      saved_at: { type: 'string', format: 'date-time', example: '2026-03-10T12:00:00Z' },
    },
  },
  RemoveFavoriteTaskResponse: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      removed: { type: 'boolean', example: true },
    },
  },
  GetMyFavoriteTasksResponse: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { $ref: '#/components/schemas/FavoriteTaskItem' } },
      page: { type: 'integer', example: 1 },
      size: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 5 },
    },
  },
};
