import { TECHNOLOGY_TYPE_ENUM } from '../constants.js';

export const invitesSchemas = {
  CreateTaskInviteRequest: {
    type: 'object',
    required: ['developer_id'],
    properties: {
      developer_id: {
        type: 'string',
        format: 'uuid',
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
      message: {
        type: 'string',
        nullable: true,
        minLength: 1,
        maxLength: 2000,
        example:
          'Your backend profile matches this task well. We would love to invite you to apply directly.',
      },
    },
  },
  CreateTaskInviteResponse: {
    type: 'object',
    properties: {
      invite_id: {
        type: 'string',
        format: 'uuid',
        example: 'eec8f8b6-58d4-4957-80f4-a0458c9af4d1',
      },
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      developer_user_id: {
        type: 'string',
        format: 'uuid',
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
      status: { type: 'string', enum: ['PENDING'] },
      created_at: { type: 'string', format: 'date-time', example: '2026-03-07T17:40:00Z' },
    },
  },
  TaskInviteDeveloper: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid', example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2' },
      display_name: { type: 'string', nullable: true, example: 'Olena Kovalenko' },
      primary_role: { type: 'string', nullable: true, example: 'Backend Engineer' },
      avatar_url: { type: 'string', format: 'uri', nullable: true },
    },
  },
  TaskInviteItem: {
    type: 'object',
    properties: {
      invite_id: {
        type: 'string',
        format: 'uuid',
        example: 'eec8f8b6-58d4-4957-80f4-a0458c9af4d1',
      },
      status: {
        type: 'string',
        enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'],
      },
      message: {
        type: 'string',
        nullable: true,
        example: 'Your profile is a great fit for this backend optimization task.',
      },
      created_at: { type: 'string', format: 'date-time', example: '2026-03-07T17:40:00Z' },
      responded_at: { type: 'string', format: 'date-time', nullable: true },
      developer: { $ref: '#/components/schemas/TaskInviteDeveloper' },
    },
  },
  GetTaskInvitesResponse: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { $ref: '#/components/schemas/TaskInviteItem' } },
      page: { type: 'integer', example: 1 },
      size: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 5 },
    },
  },
  InviteTaskInfo: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      title: { type: 'string', example: 'Implement advanced task filters API' },
      category: { type: 'string', enum: TECHNOLOGY_TYPE_ENUM, nullable: true },
      difficulty: {
        type: 'string',
        enum: ['JUNIOR', 'MIDDLE', 'SENIOR', 'ANY'],
        nullable: true,
      },
      type: { type: 'string', enum: ['PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE'] },
    },
  },
  InviteCompanyInfo: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid', example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c' },
      company_name: { type: 'string', nullable: true, example: 'NovaTech Labs' },
      verified: { type: 'boolean', nullable: true },
      avg_rating: { type: 'number', format: 'float', nullable: true },
      reviews_count: { type: 'integer', nullable: true },
    },
  },
  MyInviteItem: {
    type: 'object',
    properties: {
      invite_id: {
        type: 'string',
        format: 'uuid',
        example: 'eec8f8b6-58d4-4957-80f4-a0458c9af4d1',
      },
      status: {
        type: 'string',
        enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'],
      },
      message: {
        type: 'string',
        nullable: true,
        example: 'We would like to collaborate with you on this task.',
      },
      created_at: { type: 'string', format: 'date-time', example: '2026-03-07T17:40:00Z' },
      responded_at: { type: 'string', format: 'date-time', nullable: true },
      task: { $ref: '#/components/schemas/InviteTaskInfo' },
      company: { $ref: '#/components/schemas/InviteCompanyInfo' },
    },
  },
  GetMyInvitesResponse: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { $ref: '#/components/schemas/MyInviteItem' } },
      page: { type: 'integer', example: 1 },
      size: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 5 },
    },
  },
  AcceptInviteResponse: {
    type: 'object',
    properties: {
      invite_id: {
        type: 'string',
        format: 'uuid',
        example: 'eec8f8b6-58d4-4957-80f4-a0458c9af4d1',
      },
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      task_status: { type: 'string', enum: ['IN_PROGRESS'] },
      application_id: {
        type: 'string',
        format: 'uuid',
        example: '8adf5d0f-7d45-4310-bc58-8a70aef6c9f9',
      },
      accepted_developer_user_id: {
        type: 'string',
        format: 'uuid',
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
      thread_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: 'a65f07fe-8ed2-4862-ae89-590520f89f59',
      },
    },
  },
  DeclineInviteResponse: {
    type: 'object',
    properties: {
      invite_id: {
        type: 'string',
        format: 'uuid',
        example: 'eec8f8b6-58d4-4957-80f4-a0458c9af4d1',
      },
      status: { type: 'string', enum: ['DECLINED'] },
      responded_at: { type: 'string', format: 'date-time', example: '2026-03-07T18:05:00Z' },
    },
  },
  CancelInviteResponse: {
    type: 'object',
    properties: {
      invite_id: {
        type: 'string',
        format: 'uuid',
        example: 'eec8f8b6-58d4-4957-80f4-a0458c9af4d1',
      },
      status: { type: 'string', enum: ['CANCELLED'] },
      cancelled_at: { type: 'string', format: 'date-time', example: '2026-03-07T18:30:00Z' },
    },
  },
};
