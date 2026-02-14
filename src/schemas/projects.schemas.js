import Joi from 'joi';

const PROJECT_VISIBILITY = ['PUBLIC', 'UNLISTED'];
const PROJECT_STATUS = ['ACTIVE', 'ARCHIVED'];

export const createProjectSchema = Joi.object({
  title: Joi.string().trim().min(3).max(120).required().messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 3 characters',
    'string.max': 'Title must not exceed 120 characters',
    'any.required': 'Title is required',
  }),
  short_description: Joi.string().trim().min(10).max(200).required().messages({
    'string.empty': 'Short description is required',
    'string.min': 'Short description must be at least 10 characters',
    'string.max': 'Short description must not exceed 200 characters',
    'any.required': 'Short description is required',
  }),
  description: Joi.string().trim().min(10).max(2000).required().messages({
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 10 characters',
    'string.max': 'Description must not exceed 2000 characters',
    'any.required': 'Description is required',
  }),
  technologies: Joi.array()
    .items(
      Joi.string().trim().min(1).max(50).messages({
        'string.min': 'Each technology must be at least 1 character',
        'string.max': 'Each technology must not exceed 50 characters',
      })
    )
    .unique()
    .min(1)
    .max(50)
    .messages({
      'array.unique': 'Technologies must be unique',
      'array.min': 'Technologies must include at least 1 item',
      'array.max': 'Technologies must not exceed 50 items',
    }),
  visibility: Joi.string()
    .valid(...PROJECT_VISIBILITY)
    .messages({
      'any.only': 'Visibility must be one of: PUBLIC, UNLISTED',
    }),
  status: Joi.string()
    .valid(...PROJECT_STATUS)
    .messages({
      'any.only': 'Status must be one of: ACTIVE, ARCHIVED',
    }),
  max_talents: Joi.number().integer().min(1).max(100).messages({
    'number.base': 'Max talents must be a number',
    'number.integer': 'Max talents must be an integer',
    'number.min': 'Max talents must be at least 1',
    'number.max': 'Max talents must not exceed 100',
  }),
});
