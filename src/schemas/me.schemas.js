import Joi from 'joi';

export const getMyApplicationsQuerySchema = Joi.object({
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
});

export const getMyInvitesQuerySchema = Joi.object({
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

export const getMyTasksQuerySchema = Joi.object({
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
    .valid('IN_PROGRESS', 'DISPUTE', 'COMPLETION_REQUESTED', 'COMPLETED')
    .optional()
    .messages({
      'string.base': 'Status must be a string',
      'any.only': 'Status must be one of: IN_PROGRESS, DISPUTE, COMPLETION_REQUESTED, COMPLETED',
    }),
});

export const getMyProjectsQuerySchema = Joi.object({
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
});

export const getMyNotificationsQuerySchema = Joi.object({
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
  unread_only: Joi.boolean().default(false).messages({
    'boolean.base': 'The unread_only parameter must be true or false',
  }),
  important_only: Joi.boolean().default(false).messages({
    'boolean.base': 'The important_only parameter must be true or false',
  }),
});

export const getMyThreadsQuerySchema = Joi.object({
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
  search: Joi.string().allow('').default('').messages({
    'string.base': 'Search must be a string',
  }),
});
export const threadIdParamSchema = Joi.object({
  threadId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'Thread id is required',
    'string.guid': 'Thread id must be a valid UUID',
    'any.required': 'Thread id is required',
  }),
});

export const notificationIdParamSchema = Joi.object({
  id: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'Notification id is required',
    'string.guid': 'Notification id must be a valid UUID',
    'any.required': 'Notification id is required',
  }),
});

export const threadMessagesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  size: Joi.number().integer().min(1).max(50).default(50).messages({
    'number.base': 'Size must be a number',
    'number.integer': 'Size must be an integer',
    'number.min': 'Size must be at least 1',
    'number.max': 'Size must not exceed 50',
  }),
});

export const createMessageBodySchema = Joi.object({
  text: Joi.string().allow('').max(2000).messages({
    'string.base': 'Text must be a string',
    'string.max': 'Text must not exceed 2000 characters',
  }),
});

export const createMessageRequestSchema = Joi.object({
  text: Joi.string().allow('').max(2000).default('').messages({
    'string.base': 'Text must be a string',
    'string.max': 'Text must not exceed 2000 characters',
  }),
  files: Joi.array()
    .items(
      Joi.object({
        originalname: Joi.string().required().messages({
          'string.base': 'File name must be a string',
          'any.required': 'File name is required',
        }),
        mimetype: Joi.string().required().messages({
          'string.base': 'File type must be a string',
          'any.required': 'File type is required',
        }),
        size: Joi.number()
          .integer()
          .min(1)
          .max(10 * 1024 * 1024)
          .required()
          .messages({
            'number.base': 'File size must be a number',
            'number.integer': 'File size must be an integer',
            'number.min': 'File must not be empty',
            'number.max': 'File size must not exceed 10MB',
            'any.required': 'File size is required',
          }),
      })
    )
    .max(10)
    .default([])
    .messages({
      'array.base': 'Files must be an array',
      'array.max': 'Files count must not exceed 10',
    }),
})
  .custom((value, helpers) => {
    if (!value.text.trim() && value.files.length === 0) {
      return helpers.error('any.custom', {
        customMessage: 'Either text or at least one file is required',
      });
    }

    return value;
  })
  .messages({
    'any.custom': '{{#customMessage}}',
  });

export const favoriteTaskParamSchema = Joi.object({
  taskId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'Task id is required',
    'string.guid': 'Task id must be a valid UUID',
    'any.required': 'Task id is required',
  }),
});

export const getMyFavoriteTasksQuerySchema = Joi.object({
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
});

export const checkMyOnboardingQuerySchema = Joi.object({
  role: Joi.string().valid('developer', 'company').required().messages({
    'string.base': 'Role must be a string',
    'any.only': 'Role must be one of: developer, company',
    'any.required': 'Role is required',
  }),
  version: Joi.number().integer().min(1).required().messages({
    'number.base': 'Version must be a number',
    'number.integer': 'Version must be an integer',
    'number.min': 'Version must be at least 1',
    'any.required': 'Version is required',
  }),
});

export const patchMyOnboardingSchema = Joi.object({
  role: Joi.string().valid('developer', 'company').required().messages({
    'string.base': 'Role must be a string',
    'any.only': 'Role must be one of: developer, company',
    'any.required': 'Role is required',
  }),
  status: Joi.string().valid('completed', 'skipped').required().messages({
    'string.base': 'Status must be a string',
    'any.only': 'Status must be one of: completed, skipped',
    'any.required': 'Status is required',
  }),
  version: Joi.number().integer().min(1).required().messages({
    'number.base': 'Version must be a number',
    'number.integer': 'Version must be an integer',
    'number.min': 'Version must be at least 1',
    'any.required': 'Version is required',
  }),
});

export const resetMyOnboardingSchema = Joi.object({
  role: Joi.string().valid('developer', 'company').required().messages({
    'string.base': 'Role must be a string',
    'any.only': 'Role must be one of: developer, company',
    'any.required': 'Role is required',
  }),
});
