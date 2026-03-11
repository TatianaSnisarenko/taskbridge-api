export const workflowsPaths = {
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
  '/api/v1/invites/{inviteId}/accept': {
    post: {
      tags: ['Invites'],
      summary: 'Accept an invite for a task',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'inviteId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Invite UUID',
        },
        {
          name: 'X-Persona',
          in: 'header',
          required: true,
          schema: { type: 'string', enum: ['developer'] },
          description: 'Must be developer persona',
        },
      ],
      responses: {
        200: {
          description: 'Invite accepted and task moved to IN_PROGRESS',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AcceptInviteResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Not invite recipient or developer persona required' },
        404: { description: 'Invite not found' },
        409: { description: 'Invalid state - invite not pending or task not publishable' },
      },
    },
  },
  '/api/v1/invites/{inviteId}/decline': {
    post: {
      tags: ['Invites'],
      summary: 'Decline an invite for a task',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'inviteId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Invite UUID',
        },
        {
          name: 'X-Persona',
          in: 'header',
          required: true,
          schema: { type: 'string', enum: ['developer'] },
          description: 'Must be developer persona',
        },
      ],
      responses: {
        200: {
          description: 'Invite declined',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DeclineInviteResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Not invite recipient or developer persona required' },
        404: { description: 'Invite not found' },
        409: { description: 'Invalid state - invite already processed' },
      },
    },
  },
  '/api/v1/invites/{inviteId}/cancel': {
    post: {
      tags: ['Invites'],
      summary: 'Cancel a pending invite',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'inviteId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Invite UUID',
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
          description: 'Invite cancelled',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CancelInviteResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Not task owner or company persona required' },
        404: { description: 'Invite not found' },
        409: { description: 'Invalid state - invite is not pending' },
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
  '/api/v1/users/{userId}/moderator': {
    patch: {
      tags: ['Users'],
      summary: 'Grant or revoke moderator role',
      description: 'Admin-only endpoint to grant or revoke MODERATOR role for a user.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'User UUID',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['enabled'],
              properties: {
                enabled: {
                  type: 'boolean',
                  description: 'true to grant MODERATOR, false to revoke MODERATOR',
                },
              },
            },
            examples: {
              grantModerator: {
                summary: 'Grant moderator role',
                value: { enabled: true },
              },
              revokeModerator: {
                summary: 'Revoke moderator role',
                value: { enabled: false },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Moderator role updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user_id: { type: 'string', format: 'uuid' },
                  roles: {
                    type: 'array',
                    items: { type: 'string', enum: ['USER', 'MODERATOR', 'ADMIN'] },
                  },
                  moderator_enabled: { type: 'boolean' },
                },
              },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Admin access required' },
        404: { description: 'User not found' },
      },
    },
  },
};
