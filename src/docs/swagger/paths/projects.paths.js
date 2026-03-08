export const projectsPaths = {
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
              title: 'TeamUp Analytics Dashboard',
              short_description: 'Build MVP dashboard for project and task analytics',
              description:
                'Create an internal analytics dashboard with charts for task pipeline, completion velocity, and quality metrics.',
              technology_ids: [
                '6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61',
                '8a311c84-7d56-4d1e-96c4-9ca2f83e7082',
                '0f8e1e98-9768-4a35-bcf0-356ad0575e2d',
              ],
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
        {
          name: 'preview_limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 20, default: 3 },
          description: 'Number of tasks to include in tasks_preview (default: 3, max: 20)',
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
              title: 'TeamUp Analytics Dashboard v2',
              short_description: 'Expanded analytics dashboard with role-specific widgets',
              description:
                'Extend dashboard with advanced filtering, export support, and improved KPI visibility for company and developer personas.',
              technology_ids: [
                '6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61',
                '8a311c84-7d56-4d1e-96c4-9ca2f83e7082',
              ],
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
  '/api/v1/projects/{projectId}/reviews': {
    get: {
      tags: ['Projects'],
      summary: 'Get project reviews',
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
          name: 'author_persona',
          in: 'query',
          schema: { type: 'string', enum: ['company', 'developer'] },
          description: 'Filter by author persona (optional)',
        },
      ],
      responses: {
        200: {
          description: 'Project reviews',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProjectReviewsResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        404: { description: 'Project not found' },
      },
    },
  },
};
