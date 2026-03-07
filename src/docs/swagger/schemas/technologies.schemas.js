import { TECHNOLOGY_TYPE_ENUM } from '../constants.js';

export const technologiesSchemas = {
  TechnologyObject: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61' },
      slug: { type: 'string', example: 'node-js' },
      name: { type: 'string', example: 'Node.js' },
      type: {
        type: 'string',
        enum: TECHNOLOGY_TYPE_ENUM,
        example: 'BACKEND',
      },
    },
  },
  Technology: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61' },
      slug: { type: 'string', example: 'node-js' },
      name: { type: 'string', example: 'Node.js' },
      type: {
        type: 'string',
        enum: TECHNOLOGY_TYPE_ENUM,
        example: 'BACKEND',
      },
    },
  },
  TechnologyWithProficiency: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61' },
      slug: { type: 'string', example: 'node-js' },
      name: { type: 'string', example: 'Node.js' },
      type: {
        type: 'string',
        enum: TECHNOLOGY_TYPE_ENUM,
        example: 'BACKEND',
      },
      proficiency_years: { type: 'integer', example: 3, minimum: 0 },
    },
  },
  TechnologyWithRequirement: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61' },
      slug: { type: 'string', example: 'node-js' },
      name: { type: 'string', example: 'Node.js' },
      type: {
        type: 'string',
        enum: TECHNOLOGY_TYPE_ENUM,
        example: 'BACKEND',
      },
      is_required: { type: 'boolean', example: true },
    },
  },
};
