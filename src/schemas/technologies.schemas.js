import Joi from 'joi';

// Technology types enum (from Prisma schema)
const TECHNOLOGY_TYPES = [
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
];

export const searchTechnologiesSchema = Joi.object({
  q: Joi.string().max(100).optional().messages({
    'string.max': 'Search query must not exceed 100 characters',
  }),
  type: Joi.string()
    .valid(...TECHNOLOGY_TYPES)
    .optional()
    .messages({
      'any.only': `Technology type must be one of: ${TECHNOLOGY_TYPES.join(', ')}`,
    }),
  limit: Joi.number().integer().min(1).max(20).optional().default(5).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 20',
    'number.base': 'Limit must be a number',
  }),
  activeOnly: Joi.boolean().optional().default(true).messages({
    'boolean.base': 'activeOnly must be a boolean',
  }),
});

/**
 * Validation schema for technology IDs array
 * Used in profile/task/project create/update requests
 */
export const technologyIdsSchema = Joi.array()
  .items(
    Joi.string().uuid().messages({
      'string.guid': 'Each technology ID must be a valid UUID',
    })
  )
  .unique()
  .min(0)
  .max(20)
  .optional()
  .messages({
    'array.unique': 'Technology IDs must be unique',
    'array.max': 'Cannot add more than 20 technologies',
  });
