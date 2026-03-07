import { TECHNOLOGY_TYPE_ENUM } from '../constants.js';

export const technologiesPaths = {
  '/api/v1/technologies': {
    get: {
      tags: ['Technologies'],
      summary: 'Search technologies (popular + autocomplete)',
      description:
        'If query is empty or shorter than 2 chars, returns popular technologies. For query length >= 2, performs ranked search with prefix matches first and contains matches as fallback.',
      parameters: [
        {
          name: 'q',
          in: 'query',
          required: false,
          schema: { type: 'string', maxLength: 100 },
          description: 'Search query for autocomplete',
        },
        {
          name: 'type',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            enum: [
              'BACKEND',
              'FRONTEND',
              'DEVOPS',
              'QA',
              'DATA',
              'MOBILE',
              'OTHER',
              'FULLSTACK',
              'AI_ML',
              'UI_UX_DESIGN',
              'PRODUCT_MANAGEMENT',
              'BUSINESS_ANALYSIS',
              'CYBERSECURITY',
              'GAME_DEV',
              'EMBEDDED',
              'TECH_WRITING',
            ],
          },
          description: 'Optional technology category filter',
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
          description: 'Maximum number of technologies to return',
        },
        {
          name: 'activeOnly',
          in: 'query',
          required: false,
          schema: { type: 'boolean', default: true },
          description: 'When true, returns only active technologies',
        },
      ],
      responses: {
        200: {
          description: 'Technology list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        slug: { type: 'string' },
                        name: { type: 'string' },
                        type: {
                          type: 'string',
                          enum: [
                            'BACKEND',
                            'FRONTEND',
                            'DEVOPS',
                            'QA',
                            'DATA',
                            'MOBILE',
                            'OTHER',
                            'FULLSTACK',
                            'AI_ML',
                            'UI_UX_DESIGN',
                            'PRODUCT_MANAGEMENT',
                            'BUSINESS_ANALYSIS',
                            'CYBERSECURITY',
                            'GAME_DEV',
                            'EMBEDDED',
                            'TECH_WRITING',
                          ],
                        },
                        popularityScore: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Validation error' },
      },
    },
  },
  '/api/v1/technologies/types': {
    get: {
      tags: ['Technologies'],
      summary: 'Get TechnologyType enum values',
      description: 'Returns all available technology categories for frontend filters/forms.',
      responses: {
        200: {
          description: 'List of TechnologyType values',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: TECHNOLOGY_TYPE_ENUM,
                    },
                  },
                },
              },
              example: {
                items: TECHNOLOGY_TYPE_ENUM,
              },
            },
          },
        },
      },
    },
  },
};
