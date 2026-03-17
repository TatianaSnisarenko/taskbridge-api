import { TECHNOLOGY_TYPE_ENUM } from '../constants.js';

export const tasksPaths = {
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
            enum: TECHNOLOGY_TYPE_ENUM,
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
          schema: { type: 'string', enum: ['PAID', 'VOLUNTEER'] },
          description: 'Filter by type',
        },
        {
          name: 'technology_ids',
          in: 'query',
          schema: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
          },
          style: 'form',
          explode: true,
          description:
            'Filter by technology IDs (repeatable query parameter, e.g. ?technology_ids=uuid1&technology_ids=uuid2)',
        },
        {
          name: 'tech_match',
          in: 'query',
          schema: { type: 'string', enum: ['ANY', 'ALL'], default: 'ANY' },
          description: 'ANY = at least one tech match, ALL = every provided tech must match',
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
              type: 'VOLUNTEER',
              difficulty: 'JUNIOR',
              technology_ids: [
                '6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61',
                '0f8e1e98-9768-4a35-bcf0-356ad0575e2d',
              ],
              estimated_effort_hours: 6,
              expected_duration: 'DAYS_8_14',
              communication_language: 'EN',
              timezone_preference: 'Europe/Kyiv',
              application_deadline: '2026-02-20',
              visibility: 'PUBLIC',
              deliverables: ['PR with code', 'Tests'],
              requirements: ['REST', 'Pagination'],
              nice_to_have: ['OpenAPI'],
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
          schema: { type: 'string', enum: ['company', 'developer'] },
          description:
            'Required for non-public tasks. Use company for owner access, developer for accessing your assigned tasks',
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
              title: 'Implement advanced task filters API (v2)',
              description:
                'Refine backend filtering logic, improve query performance, and return richer pagination metadata.',
              category: 'BACKEND',
              type: 'VOLUNTEER',
              difficulty: 'JUNIOR',
              technology_ids: [
                '6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61',
                '0f8e1e98-9768-4a35-bcf0-356ad0575e2d',
              ],
              estimated_effort_hours: 8,
              expected_duration: 'DAYS_15_30',
              communication_language: 'EN',
              timezone_preference: 'Europe/Kyiv',
              application_deadline: '2026-02-25',
              visibility: 'PUBLIC',
              deliverables: ['Working API endpoints, test coverage, and updated OpenAPI docs'],
              requirements: ['Node.js, Prisma, PostgreSQL, and API validation experience'],
              nice_to_have: ['Experience with query optimization and search UX'],
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
      summary: 'Request task completion (IN_PROGRESS/DISPUTE -> COMPLETION_REQUESTED)',
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
        409: { description: 'Task in invalid state (must be IN_PROGRESS or DISPUTE)' },
      },
      'x-side-effects': [
        {
          type: 'COMPLETION_REQUESTED',
          recipient: 'task.owner_user_id',
          actor: 'developer',
          payload: { task_id: 'uuid', response_deadline_at: '2026-03-31T12:00:00Z' },
        },
      ],
    },
  },
  '/api/v1/tasks/disputes': {
    get: {
      tags: ['Tasks'],
      summary: 'List task disputes for admin or moderator review',
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
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['OPEN', 'RESOLVED'] },
        },
        {
          name: 'reason_type',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['DEVELOPER_UNRESPONSIVE', 'COMPLETION_NOT_CONFIRMED', 'OTHER'],
          },
        },
      ],
      responses: {
        200: {
          description: 'Paginated dispute queue',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TaskDisputesResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Admin or moderator access required' },
      },
    },
  },
  '/api/v1/tasks/reports': {
    get: {
      tags: ['Tasks'],
      summary: 'List task reports for moderation',
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
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['OPEN', 'RESOLVED'] },
        },
        {
          name: 'reason',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['SPAM', 'SCAM', 'INAPPROPRIATE_CONTENT', 'MISLEADING', 'OTHER'],
          },
        },
      ],
      responses: {
        200: {
          description: 'Task reports queue',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GetTaskReportsResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Admin or moderator access required' },
      },
    },
  },
  '/api/v1/tasks/reports/{reportId}/resolve': {
    patch: {
      tags: ['Tasks'],
      summary: 'Resolve task report as moderator/admin',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'reportId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResolveTaskReportRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Task report resolved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResolveTaskReportResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Admin or moderator access required' },
        404: { description: 'Report not found' },
        409: { description: 'Report already resolved' },
      },
    },
  },
  '/api/v1/tasks/{taskId}/reports': {
    post: {
      tags: ['Tasks'],
      summary: 'Report a task',
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
          description: 'Report as developer or company persona',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ReportTaskRequest' },
            example: {
              reason: 'SPAM',
              comment: 'This task appears to be spam.',
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Task report created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReportTaskResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        404: { description: 'Task not found' },
        409: { description: 'Already reported' },
      },
    },
  },
  '/api/v1/tasks/{taskId}/dispute': {
    post: {
      tags: ['Tasks'],
      summary: 'Open task dispute (IN_PROGRESS -> DISPUTE)',
      description:
        'Company opens a dispute for an in-progress task (for example, developer inactivity). Developer can continue work and submit completion request normally.',
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
            schema: { $ref: '#/components/schemas/OpenTaskDisputeRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Task moved to dispute status',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OpenTaskDisputeResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Not task owner' },
        404: { description: 'Task not found' },
        409: { description: 'Task in invalid state (must be IN_PROGRESS)' },
      },
    },
  },
  '/api/v1/tasks/{taskId}/completion/escalate': {
    post: {
      tags: ['Tasks'],
      summary: 'Escalate overdue completion request to dispute',
      description:
        'Accepted developer escalates the task to dispute after the company response deadline has passed for a completion request.',
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
            schema: { $ref: '#/components/schemas/EscalateTaskCompletionDisputeRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Task escalated to dispute',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OpenTaskDisputeResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Only accepted developer can escalate this dispute' },
        404: { description: 'Task not found' },
        409: {
          description:
            'Task is not awaiting completion confirmation, response deadline has not passed yet, or an open dispute already exists',
        },
      },
    },
  },
  '/api/v1/tasks/{taskId}/dispute/resolve': {
    post: {
      tags: ['Tasks'],
      summary: 'Resolve task dispute as admin or moderator',
      description:
        'Admin or moderator resolves an open task dispute by returning it to IN_PROGRESS, marking it as FAILED, or marking it as COMPLETED.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'taskId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResolveTaskDisputeRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Dispute resolved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResolveTaskDisputeResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Admin or moderator access required' },
        404: { description: 'Task not found' },
        409: { description: 'Task does not have an open dispute' },
      },
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
  '/api/v1/tasks/{taskId}/completion/reject': {
    post: {
      tags: ['Tasks'],
      summary:
        'Reject task completion with feedback (COMPLETION_REQUESTED -> IN_PROGRESS or FAILED)',
      description:
        'Company rejects the completion request. After 1-2 rejections, task returns to IN_PROGRESS. On 3rd rejection, task becomes FAILED. Feedback is sent to developer via chat thread and notification.',
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
        required: false,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RejectTaskCompletionRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Completion rejected',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RejectTaskCompletionResponse' },
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
          type: 'NOTIFICATION',
          recipient: 'accepted developer',
          actor: 'company',
          payload: {
            task_id: 'uuid',
            status: 'IN_PROGRESS or FAILED',
            rejection_count: 1,
            is_final: false,
          },
        },
        {
          type: 'CHAT_MESSAGE',
          recipient: 'chat thread',
          content: 'Feedback message sent to chat thread with rejection count and feedback text',
        },
      ],
    },
  },
  '/api/v1/tasks/{taskId}/reviews': {
    post: {
      tags: ['Tasks'],
      summary: 'Create a review for a completed or failed task',
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
        409: { description: 'Task not completed or failed, or user already reviewed this task' },
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
    get: {
      tags: ['Tasks'],
      summary: 'Get task reviews',
      parameters: [
        {
          name: 'taskId',
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
      ],
      responses: {
        200: {
          description: 'Task reviews',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TaskReviewsResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        404: { description: 'Task not found' },
      },
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
              message: 'I can complete this task in 3 days with strong test coverage.',
              proposed_plan: 'Day 1: API + validation, Day 2: tests, Day 3: docs + refinements.',
              availability_note: 'Weekdays 18:00-22:00 CET and full Saturday.',
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
  '/api/v1/tasks/{taskId}/recommended-developers': {
    get: {
      tags: ['Tasks'],
      summary: 'Get recommended developers for a task (top candidates)',
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
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 10, default: 3 },
          description: 'Maximum number of recommended developers',
        },
      ],
      responses: {
        200: {
          description: 'Top recommended developers for the task',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TaskRecommendedDevelopersResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Not task owner or company persona required' },
        404: { description: 'Task not found' },
        409: { description: 'Task must be in PUBLISHED status' },
      },
    },
  },
  '/api/v1/tasks/{taskId}/candidates': {
    get: {
      tags: ['Tasks'],
      summary: 'Get full candidates list for a task',
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
        {
          name: 'search',
          in: 'query',
          schema: { type: 'string', maxLength: 200 },
          description: 'Search in developer name, role, and technologies',
        },
        {
          name: 'availability',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['FEW_HOURS_WEEK', 'PART_TIME', 'FULL_TIME'],
          },
        },
        {
          name: 'experience_level',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR'],
          },
        },
        {
          name: 'min_rating',
          in: 'query',
          schema: { type: 'number', minimum: 0, maximum: 5 },
        },
        {
          name: 'exclude_invited',
          in: 'query',
          schema: { type: 'boolean', default: false },
        },
        {
          name: 'exclude_applied',
          in: 'query',
          schema: { type: 'boolean', default: false },
        },
      ],
      responses: {
        200: {
          description: 'Paginated candidates list for the task',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TaskCandidatesResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Not task owner or company persona required' },
        404: { description: 'Task not found' },
        409: { description: 'Task must be in PUBLISHED status' },
      },
    },
  },
  '/api/v1/tasks/{taskId}/invites': {
    get: {
      tags: ['Tasks'],
      summary: 'Get invites for a task (company owner view)',
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
          description: 'Paginated list of invites for the task',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GetTaskInvitesResponse' },
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
      summary: 'Invite a developer to a published task',
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
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateTaskInviteRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Invite created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTaskInviteResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Not task owner or company persona required' },
        404: { description: 'Task or developer not found' },
        409: {
          description:
            'Task is not published, already matched, invite exists, or developer already applied',
        },
      },
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
};
