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
