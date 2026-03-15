import Joi from 'joi';

export const getTimezonesQuerySchema = Joi.object({
  q: Joi.string().trim().max(100).optional().messages({
    'string.max': 'Search query must not exceed 100 characters',
  }),
  limit: Joi.number().integer().min(1).max(200).optional().messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 200',
  }),
  groupByOffset: Joi.boolean().optional().default(false).messages({
    'boolean.base': 'groupByOffset must be a boolean',
  }),
});
