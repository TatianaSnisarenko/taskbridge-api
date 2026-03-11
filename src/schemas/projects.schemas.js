import Joi from 'joi';

const PROJECT_VISIBILITY = ['PUBLIC', 'UNLISTED'];
const PROJECT_STATUS = ['ACTIVE', 'ARCHIVED'];
const PROJECT_REPORT_REASONS = ['SPAM', 'SCAM', 'INAPPROPRIATE_CONTENT', 'MISLEADING', 'OTHER'];
const CONTENT_REPORT_STATUS = ['OPEN', 'RESOLVED'];
const CONTENT_REPORT_ACTIONS = ['DISMISS', 'DELETE'];

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
  technology_ids: Joi.array()
    .items(
      Joi.string().guid({ version: 'uuidv4' }).messages({
        'string.guid': 'Each technology id must be a valid UUID',
      })
    )
    .unique()
    .max(20)
    .optional()
    .messages({
      'array.unique': 'Technology ids must be unique',
      'array.max': 'Technology ids must not exceed 20 items',
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
  deadline: Joi.date().iso().messages({
    'date.base': 'Deadline must be a valid date',
    'date.format': 'Deadline must be a valid ISO date',
    'date.iso': 'Deadline must be a valid ISO date',
  }),
});

export const updateProjectSchema = Joi.object({
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
  technology_ids: Joi.array()
    .items(
      Joi.string().guid({ version: 'uuidv4' }).messages({
        'string.guid': 'Each technology id must be a valid UUID',
      })
    )
    .unique()
    .max(20)
    .optional()
    .messages({
      'array.unique': 'Technology ids must be unique',
      'array.max': 'Technology ids must not exceed 20 items',
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
  deadline: Joi.date().iso().messages({
    'date.base': 'Deadline must be a valid date',
    'date.format': 'Deadline must be a valid ISO date',
    'date.iso': 'Deadline must be a valid ISO date',
  }),
});

export const updateProjectParamsSchema = Joi.object({
  projectId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'Project id is required',
    'string.guid': 'Project id must be a valid UUID',
    'any.required': 'Project id is required',
  }),
});

export const deleteProjectParamsSchema = Joi.object({
  projectId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'Project id is required',
    'string.guid': 'Project id must be a valid UUID',
    'any.required': 'Project id is required',
  }),
});

export const getProjectParamsSchema = Joi.object({
  projectId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'Project id is required',
    'string.guid': 'Project id must be a valid UUID',
    'any.required': 'Project id is required',
  }),
});

export const getProjectQuerySchema = Joi.object({
  include_deleted: Joi.boolean().default(false).messages({
    'boolean.base': 'Include deleted must be true or false',
  }),
  preview_limit: Joi.number().integer().min(1).max(20).default(3).messages({
    'number.base': 'Preview limit must be a number',
    'number.integer': 'Preview limit must be an integer',
    'number.min': 'Preview limit must be at least 1',
    'number.max': 'Preview limit must not exceed 20',
  }),
});

export const getProjectsQuerySchema = Joi.object({
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
  search: Joi.string().trim().max(200).messages({
    'string.max': 'Search must not exceed 200 characters',
  }),
  technology: Joi.alternatives()
    .try(Joi.string().trim().max(50), Joi.array().items(Joi.string().trim().max(50)))
    .messages({
      'string.max': 'Technology must not exceed 50 characters',
    }),
  visibility: Joi.string()
    .valid(...PROJECT_VISIBILITY)
    .messages({
      'any.only': 'Visibility must be one of: PUBLIC, UNLISTED',
    }),
  owner: Joi.boolean().messages({
    'boolean.base': 'Owner must be true or false',
  }),
  include_deleted: Joi.boolean().messages({
    'boolean.base': 'Include deleted must be true or false',
  }),
});

export const reportProjectParamsSchema = Joi.object({
  projectId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'Project id is required',
    'string.guid': 'Project id must be a valid UUID',
    'any.required': 'Project id is required',
  }),
});

export const reportProjectSchema = Joi.object({
  reason: Joi.string()
    .valid(...PROJECT_REPORT_REASONS)
    .required()
    .messages({
      'string.empty': 'Reason is required',
      'any.only': 'Reason must be one of: SPAM, SCAM, INAPPROPRIATE_CONTENT, MISLEADING, OTHER',
      'any.required': 'Reason is required',
    }),
  comment: Joi.string().trim().max(1000).messages({
    'string.max': 'Comment must not exceed 1000 characters',
  }),
});

export const getProjectReportsQuerySchema = Joi.object({
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
    .valid(...CONTENT_REPORT_STATUS)
    .optional()
    .messages({
      'any.only': 'Status must be one of: OPEN, RESOLVED',
    }),
  reason: Joi.string()
    .valid(...PROJECT_REPORT_REASONS)
    .optional()
    .messages({
      'any.only': 'Reason must be one of: SPAM, SCAM, INAPPROPRIATE_CONTENT, MISLEADING, OTHER',
    }),
});

export const resolveProjectReportParamsSchema = Joi.object({
  reportId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'Report id is required',
    'string.guid': 'Report id must be a valid UUID',
    'any.required': 'Report id is required',
  }),
});

export const resolveProjectReportSchema = Joi.object({
  action: Joi.string()
    .valid(...CONTENT_REPORT_ACTIONS)
    .required()
    .messages({
      'string.empty': 'Action is required',
      'any.only': 'Action must be one of: DISMISS, DELETE',
      'any.required': 'Action is required',
    }),
  note: Joi.string().trim().min(3).max(2000).optional().messages({
    'string.min': 'Note must be at least 3 characters',
    'string.max': 'Note must not exceed 2000 characters',
  }),
});

export const getProjectReviewsQuerySchema = Joi.object({
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
  author_persona: Joi.string().valid('company', 'developer').optional().messages({
    'any.only': 'Author persona must be one of: company, developer',
  }),
});
