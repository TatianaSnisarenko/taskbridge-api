import Joi from 'joi';

export const userIdParamsSchema = Joi.object({
  userId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'User id is required',
    'string.guid': 'User id must be a valid UUID',
    'any.required': 'User id is required',
  }),
});

export const toggleModeratorRoleSchema = Joi.object({
  enabled: Joi.boolean().required().messages({
    'boolean.base': 'enabled must be a boolean',
    'any.required': 'enabled is required',
  }),
});

export const usersCatalogQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'page must be a number',
    'number.integer': 'page must be an integer',
    'number.min': 'page must be greater than or equal to 1',
  }),
  size: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'size must be a number',
    'number.integer': 'size must be an integer',
    'number.min': 'size must be greater than or equal to 1',
    'number.max': 'size must be less than or equal to 100',
  }),
  q: Joi.string().trim().max(255).allow('').messages({
    'string.max': 'Search query must not exceed 255 characters',
  }),
});
