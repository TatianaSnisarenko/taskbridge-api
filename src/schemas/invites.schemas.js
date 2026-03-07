import Joi from 'joi';

export const createTaskInviteSchema = Joi.object({
  developer_id: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'Developer id is required',
    'string.guid': 'Developer id must be a valid UUID',
    'any.required': 'Developer id is required',
  }),
  message: Joi.string().trim().min(1).max(2000).allow('', null).optional().messages({
    'string.min': 'Message must be at least 1 character if provided',
    'string.max': 'Message must not exceed 2000 characters',
  }),
});

export const getTaskInvitesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  size: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Size must be a number',
    'number.integer': 'Size must be an integer',
    'number.min': 'Size must be at least 1',
    'number.max': 'Size must not exceed 100',
  }),
  status: Joi.string()
    .valid('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED')
    .optional()
    .messages({
      'string.base': 'Status must be a string',
      'any.only': 'Status must be one of: PENDING, ACCEPTED, DECLINED, CANCELLED, EXPIRED',
    }),
});

export const inviteIdParamSchema = Joi.object({
  inviteId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'Invite id is required',
    'string.guid': 'Invite id must be a valid UUID',
    'any.required': 'Invite id is required',
  }),
});
