export const mePaths = {
  '/api/v1/me': {
    get: {
      tags: ['Me'],
      summary: 'Get current user',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Current user profile',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GetMeResponse' },
            },
          },
        },
        401: { description: 'Unauthorized' },
      },
    },
    delete: {
      tags: ['Me'],
      summary: 'Soft delete current account',
      description:
        'Soft deletes current account while preserving historical entities (reviews, tasks). Anonymizes developer/company profiles, revokes tokens, anonymizes email, and marks email as unverified.',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Account soft-deleted' },
        401: { description: 'Unauthorized' },
        404: { description: 'User not found' },
      },
    },
  },
  '/api/v1/me/onboarding': {
    patch: {
      tags: ['Me'],
      summary: 'Update onboarding status for a role',
      description:
        'Stores onboarding completion or skip for developer/company role and version. Used to suppress automatic onboarding replay for the same role and version.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateMyOnboardingRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Onboarding state updated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateMyOnboardingResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Role profile does not exist for current user' },
      },
    },
  },
  '/api/v1/me/onboarding/check': {
    get: {
      tags: ['Me'],
      summary: 'Check whether onboarding should be shown',
      description:
        'Returns whether the onboarding flow should be displayed for a given role and frontend version. Returns false if the user already completed or skipped onboarding for the same or higher version.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'role',
          in: 'query',
          required: true,
          schema: { type: 'string', enum: ['developer', 'company'] },
          description: 'The role to check onboarding for',
        },
        {
          name: 'version',
          in: 'query',
          required: true,
          schema: { type: 'integer', minimum: 1 },
          description: 'Current frontend onboarding version',
        },
      ],
      responses: {
        200: {
          description: 'Onboarding display decision',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CheckOnboardingResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Role profile does not exist for current user' },
      },
    },
  },
  '/api/v1/me/onboarding/reset': {
    post: {
      tags: ['Me'],
      summary: 'Reset onboarding status for a role',
      description:
        'Resets role onboarding state to not_started. Used for manual replay from profile/settings and QA checks.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResetMyOnboardingRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Onboarding state reset',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetMyOnboardingResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Role profile does not exist for current user' },
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
  '/api/v1/me/invites': {
    get: {
      tags: ['Me'],
      summary: 'Get my invites as developer',
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
            enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'],
          },
          description: 'Optional invite status filter',
        },
      ],
      responses: {
        200: {
          description: 'Paginated list of invites for current developer',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GetMyInvitesResponse' },
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
            enum: ['IN_PROGRESS', 'DISPUTE', 'COMPLETION_REQUESTED', 'COMPLETED'],
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
  '/api/v1/me/projects': {
    get: {
      tags: ['Me'],
      summary: 'Get my worked projects as developer',
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
          description: 'Paginated list of projects where developer has accepted tasks',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GetMyProjectsResponse' },
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
        {
          name: 'important_only',
          in: 'query',
          schema: { type: 'boolean', default: false },
          description: 'If true, return only notifications marked as important',
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
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        404: { description: 'Notification not found' },
      },
    },
  },
  '/api/v1/me/notifications/{id}/unread': {
    post: {
      tags: ['Me'],
      summary: 'Mark notification as unread',
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
          description: 'Notification marked as unread',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MarkNotificationAsUnreadResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        404: { description: 'Notification not found' },
      },
    },
  },
  '/api/v1/me/notifications/{id}/important': {
    post: {
      tags: ['Me'],
      summary: 'Mark notification as important',
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
          description: 'Notification marked as important',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MarkNotificationAsImportantResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        404: { description: 'Notification not found' },
      },
    },
  },
  '/api/v1/me/notifications/{id}/unimportant': {
    post: {
      tags: ['Me'],
      summary: 'Remove important mark from notification',
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
          description: 'Important mark removed from notification',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MarkNotificationAsUnimportantResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
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
        {
          name: 'important_only',
          in: 'query',
          schema: { type: 'boolean', default: false },
          description: 'When true, return only threads marked as important by the current user',
        },
      ],
      responses: {
        200: {
          description: 'Paginated list of chat threads sorted by last message date (newest first)',
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
        {
          name: 'important_only',
          in: 'query',
          schema: { type: 'boolean', default: false },
          description: 'When true, return only messages marked as important',
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
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  maxLength: 2000,
                  description: 'Optional when at least one file is attached.',
                },
                files: {
                  type: 'array',
                  maxItems: 10,
                  items: {
                    type: 'string',
                    format: 'binary',
                  },
                  description: 'Up to 10 files, 10MB each.',
                },
              },
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
  '/api/v1/me/chat/threads/{threadId}/messages/{messageId}/important': {
    post: {
      tags: ['Me'],
      summary: 'Mark chat message as important',
      description:
        'Mark a specific message in a chat thread as important. User must be a participant in the thread and the associated task must have status IN_PROGRESS, DISPUTE, COMPLETED or FAILED.',
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
          name: 'messageId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Message ID',
        },
      ],
      responses: {
        200: {
          description: 'Message marked as important',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MarkMessageAsImportantResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - user is not a participant or task status is invalid' },
        404: { description: 'Chat thread or message not found' },
      },
    },
  },
  '/api/v1/me/chat/threads/{threadId}/messages/{messageId}/unimportant': {
    post: {
      tags: ['Me'],
      summary: 'Remove important mark from chat message',
      description:
        'Remove important mark from a specific message in a chat thread. User must be a participant in the thread and the associated task must have status IN_PROGRESS, DISPUTE, COMPLETED or FAILED.',
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
          name: 'messageId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Message ID',
        },
      ],
      responses: {
        200: {
          description: 'Important mark removed from message',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MarkMessageAsUnimportantResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - user is not a participant or task status is invalid' },
        404: { description: 'Chat thread or message not found' },
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
  '/api/v1/me/chat/threads/{threadId}/important': {
    post: {
      tags: ['Me'],
      summary: 'Mark chat thread as important',
      description:
        'Mark a specific chat thread as important for the current user. User must be a participant in the thread and the associated task must have status IN_PROGRESS, DISPUTE, COMPLETED or FAILED.',
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
          description: 'Thread marked as important',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MarkThreadAsImportantResponse' },
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
  '/api/v1/me/chat/threads/{threadId}/unimportant': {
    post: {
      tags: ['Me'],
      summary: 'Remove important mark from chat thread',
      description:
        'Remove important mark from a specific chat thread for the current user. User must be a participant in the thread and the associated task must have status IN_PROGRESS, DISPUTE, COMPLETED or FAILED.',
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
          description: 'Important mark removed from thread',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MarkThreadAsUnimportantResponse' },
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
  '/api/v1/me/favorites/tasks': {
    get: {
      tags: ['Me'],
      summary: 'Get my favorite tasks',
      description: 'Get paginated list of tasks saved as favorites by the current developer.',
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
          description: 'Paginated list of favorite tasks sorted by saved date (newest first)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GetMyFavoriteTasksResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Developer profile does not exist' },
      },
    },
  },
  '/api/v1/me/favorites/tasks/{taskId}': {
    post: {
      tags: ['Me'],
      summary: 'Add task to favorites',
      description:
        "Save a task to the current developer's favorites. Returns 409 if already favorited.",
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
          name: 'taskId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Task ID to add to favorites',
        },
      ],
      responses: {
        201: {
          description: 'Task added to favorites',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddFavoriteTaskResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Developer profile does not exist' },
        404: { description: 'Task not found' },
        409: { description: 'Task is already in favorites' },
      },
    },
    delete: {
      tags: ['Me'],
      summary: 'Remove task from favorites',
      description:
        "Remove a task from the current developer's favorites. Returns 404 if not favorited.",
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
          name: 'taskId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Task ID to remove from favorites',
        },
      ],
      responses: {
        200: {
          description: 'Task removed from favorites',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RemoveFavoriteTaskResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Developer profile does not exist' },
        404: { description: 'Task not found in favorites' },
      },
    },
  },
};
