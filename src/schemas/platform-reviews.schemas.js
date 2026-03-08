import Joi from 'joi';

export const createPlatformReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.integer': 'Rating must be an integer',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating must be at most 5',
    'any.required': 'Rating is required',
  }),
  text: Joi.string().trim().min(20).max(2000).required().messages({
    'string.base': 'Review text must be a string',
    'string.empty': 'Review text cannot be empty',
    'string.min': 'Review text must be at least 20 characters',
    'string.max': 'Review text must not exceed 2000 characters',
    'any.required': 'Review text is required',
  }),
});

export const updatePlatformReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).messages({
    'number.base': 'Rating must be a number',
    'number.integer': 'Rating must be an integer',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating must be at most 5',
  }),
  text: Joi.string().trim().min(20).max(2000).messages({
    'string.base': 'Review text must be a string',
    'string.empty': 'Review text cannot be empty',
    'string.min': 'Review text must be at least 20 characters',
    'string.max': 'Review text must not exceed 2000 characters',
  }),
  is_approved: Joi.boolean().messages({
    'boolean.base': 'is_approved must be a boolean',
  }),
}).min(1);

export const getPlatformReviewsSchema = Joi.object({
  status: Joi.string().valid('approved', 'pending', 'all').default('approved').messages({
    'string.base': 'Status must be a string',
    'any.only': 'Status must be one of: approved, pending, all',
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100',
  }),
  offset: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'Offset must be a number',
    'number.integer': 'Offset must be an integer',
    'number.min': 'Offset must be at least 0',
  }),
  sort: Joi.string()
    .valid('newest', 'oldest', 'highest_rated', 'lowest_rated')
    .default('newest')
    .messages({
      'string.base': 'Sort must be a string',
      'any.only': 'Sort must be one of: newest, oldest, highest_rated, lowest_rated',
    }),
});

export const getPlatformReviewByIdParamsSchema = Joi.object({
  reviewId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.guid': 'Review ID must be a valid UUID',
    'any.required': 'Review ID is required',
  }),
});
