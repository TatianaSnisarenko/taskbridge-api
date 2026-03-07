import Joi from 'joi';

const TASK_CATEGORIES = [
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
const TASK_TYPES = ['PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE'];
const TASK_DIFFICULTY = ['JUNIOR', 'MIDDLE', 'SENIOR', 'ANY'];
const TASK_DURATION = ['DAYS_1_7', 'DAYS_8_14', 'DAYS_15_30', 'DAYS_30_PLUS'];
const TASK_VISIBILITY = ['PUBLIC', 'UNLISTED'];
const DEVELOPER_AVAILABILITY = ['FEW_HOURS_WEEK', 'PART_TIME', 'FULL_TIME'];
const DEVELOPER_EXPERIENCE = ['STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR'];

export const createTaskDraftSchema = Joi.object({
  project_id: Joi.string().guid({ version: 'uuidv4' }).allow(null).messages({
    'string.empty': 'Project id must be a valid UUID',
    'string.guid': 'Project id must be a valid UUID',
  }),
  title: Joi.string().trim().min(3).max(120).required().messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 3 characters',
    'string.max': 'Title must not exceed 120 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().trim().min(10).max(2000).required().messages({
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 10 characters',
    'string.max': 'Description must not exceed 2000 characters',
    'any.required': 'Description is required',
  }),
  category: Joi.string()
    .valid(...TASK_CATEGORIES)
    .required()
    .messages({
      'any.only':
        'Category must be one of: BACKEND, FRONTEND, DEVOPS, QA, DATA, MOBILE, OTHER, FULLSTACK, AI_ML, UI_UX_DESIGN, PRODUCT_MANAGEMENT, BUSINESS_ANALYSIS, CYBERSECURITY, GAME_DEV, EMBEDDED, TECH_WRITING',
      'any.required': 'Category is required',
      'string.empty': 'Category is required',
    }),
  type: Joi.string()
    .valid(...TASK_TYPES)
    .required()
    .messages({
      'any.only': 'Type must be one of: PAID, UNPAID, VOLUNTEER, EXPERIENCE',
      'any.required': 'Type is required',
      'string.empty': 'Type is required',
    }),
  difficulty: Joi.string()
    .valid(...TASK_DIFFICULTY)
    .required()
    .messages({
      'any.only': 'Difficulty must be one of: JUNIOR, MIDDLE, SENIOR, ANY',
      'any.required': 'Difficulty is required',
      'string.empty': 'Difficulty is required',
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
  estimated_effort_hours: Joi.number().integer().min(1).max(1000).required().messages({
    'number.base': 'Estimated effort must be a number',
    'number.integer': 'Estimated effort must be an integer',
    'number.min': 'Estimated effort must be at least 1 hour',
    'number.max': 'Estimated effort must not exceed 1000 hours',
    'any.required': 'Estimated effort is required',
  }),
  expected_duration: Joi.string()
    .valid(...TASK_DURATION)
    .required()
    .messages({
      'any.only': 'Expected duration must be one of: DAYS_1_7, DAYS_8_14, DAYS_15_30, DAYS_30_PLUS',
      'any.required': 'Expected duration is required',
      'string.empty': 'Expected duration is required',
    }),
  communication_language: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Communication language is required',
    'string.min': 'Communication language must be at least 2 characters',
    'string.max': 'Communication language must not exceed 50 characters',
    'any.required': 'Communication language is required',
  }),
  timezone_preference: Joi.string().trim().min(3).max(60).required().messages({
    'string.empty': 'Timezone preference is required',
    'string.min': 'Timezone preference must be at least 3 characters',
    'string.max': 'Timezone preference must not exceed 60 characters',
    'any.required': 'Timezone preference is required',
  }),
  application_deadline: Joi.date().iso().required().messages({
    'date.base': 'Application deadline must be a valid date',
    'date.format': 'Application deadline must be a valid ISO date',
    'date.iso': 'Application deadline must be a valid ISO date',
    'any.required': 'Application deadline is required',
  }),
  visibility: Joi.string()
    .valid(...TASK_VISIBILITY)
    .required()
    .messages({
      'any.only': 'Visibility must be one of: PUBLIC, UNLISTED',
      'any.required': 'Visibility is required',
      'string.empty': 'Visibility is required',
    }),
  deliverables: Joi.string().trim().min(3).max(2000).required().messages({
    'string.empty': 'Deliverables are required',
    'string.min': 'Deliverables must be at least 3 characters',
    'string.max': 'Deliverables must not exceed 2000 characters',
    'any.required': 'Deliverables are required',
  }),
  requirements: Joi.string().trim().min(3).max(2000).required().messages({
    'string.empty': 'Requirements are required',
    'string.min': 'Requirements must be at least 3 characters',
    'string.max': 'Requirements must not exceed 2000 characters',
    'any.required': 'Requirements are required',
  }),
  nice_to_have: Joi.string().trim().min(3).max(2000).required().messages({
    'string.empty': 'Nice to have is required',
    'string.min': 'Nice to have must be at least 3 characters',
    'string.max': 'Nice to have must not exceed 2000 characters',
    'any.required': 'Nice to have is required',
  }),
});

export const updateTaskDraftSchema = Joi.object({
  project_id: Joi.string().guid({ version: 'uuidv4' }).allow(null).messages({
    'string.empty': 'Project id must be a valid UUID',
    'string.guid': 'Project id must be a valid UUID',
  }),
  title: Joi.string().trim().min(3).max(120).required().messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 3 characters',
    'string.max': 'Title must not exceed 120 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().trim().min(10).max(2000).required().messages({
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 10 characters',
    'string.max': 'Description must not exceed 2000 characters',
    'any.required': 'Description is required',
  }),
  category: Joi.string()
    .valid(...TASK_CATEGORIES)
    .required()
    .messages({
      'any.only':
        'Category must be one of: BACKEND, FRONTEND, DEVOPS, QA, DATA, MOBILE, OTHER, FULLSTACK, AI_ML, UI_UX_DESIGN, PRODUCT_MANAGEMENT, BUSINESS_ANALYSIS, CYBERSECURITY, GAME_DEV, EMBEDDED, TECH_WRITING',
      'any.required': 'Category is required',
      'string.empty': 'Category is required',
    }),
  type: Joi.string()
    .valid(...TASK_TYPES)
    .required()
    .messages({
      'any.only': 'Type must be one of: PAID, UNPAID, VOLUNTEER, EXPERIENCE',
      'any.required': 'Type is required',
      'string.empty': 'Type is required',
    }),
  difficulty: Joi.string()
    .valid(...TASK_DIFFICULTY)
    .required()
    .messages({
      'any.only': 'Difficulty must be one of: JUNIOR, MIDDLE, SENIOR, ANY',
      'any.required': 'Difficulty is required',
      'string.empty': 'Difficulty is required',
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
  estimated_effort_hours: Joi.number().integer().min(1).max(1000).messages({
    'number.base': 'Estimated effort must be a number',
    'number.integer': 'Estimated effort must be an integer',
    'number.min': 'Estimated effort must be at least 1 hour',
    'number.max': 'Estimated effort must not exceed 1000 hours',
  }),
  expected_duration: Joi.string()
    .valid(...TASK_DURATION)
    .messages({
      'any.only': 'Expected duration must be one of: DAYS_1_7, DAYS_8_14, DAYS_15_30, DAYS_30_PLUS',
    }),
  communication_language: Joi.string().trim().min(2).max(50).messages({
    'string.min': 'Communication language must be at least 2 characters',
    'string.max': 'Communication language must not exceed 50 characters',
  }),
  timezone_preference: Joi.string().trim().min(3).max(60).messages({
    'string.min': 'Timezone preference must be at least 3 characters',
    'string.max': 'Timezone preference must not exceed 60 characters',
  }),
  application_deadline: Joi.date().iso().messages({
    'date.base': 'Application deadline must be a valid date',
    'date.format': 'Application deadline must be a valid ISO date',
    'date.iso': 'Application deadline must be a valid ISO date',
  }),
  visibility: Joi.string()
    .valid(...TASK_VISIBILITY)
    .messages({
      'any.only': 'Visibility must be one of: PUBLIC, UNLISTED',
    }),
  deliverables: Joi.string().trim().min(3).max(2000).messages({
    'string.min': 'Deliverables must be at least 3 characters',
    'string.max': 'Deliverables must not exceed 2000 characters',
  }),
  requirements: Joi.string().trim().min(3).max(2000).messages({
    'string.min': 'Requirements must be at least 3 characters',
    'string.max': 'Requirements must not exceed 2000 characters',
  }),
  nice_to_have: Joi.string().trim().min(3).max(2000).messages({
    'string.min': 'Nice to have must be at least 3 characters',
    'string.max': 'Nice to have must not exceed 2000 characters',
  }),
});

export const taskIdParamSchema = Joi.object({
  taskId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'Task id is required',
    'string.guid': 'Task id must be a valid UUID',
    'any.required': 'Task id is required',
  }),
});

export const createTaskApplicationSchema = Joi.object({
  message: Joi.string().trim().min(10).max(1000).required().messages({
    'string.empty': 'Message is required',
    'string.min': 'Message must be at least 10 characters',
    'string.max': 'Message must not exceed 1000 characters',
    'any.required': 'Message is required',
  }),
  proposed_plan: Joi.string().trim().min(10).max(2000).messages({
    'string.empty': 'Proposed plan must not be empty',
    'string.min': 'Proposed plan must be at least 10 characters',
    'string.max': 'Proposed plan must not exceed 2000 characters',
  }),
  availability_note: Joi.string().trim().min(2).max(200).messages({
    'string.empty': 'Availability note must not be empty',
    'string.min': 'Availability note must be at least 2 characters',
    'string.max': 'Availability note must not exceed 200 characters',
  }),
});

export const getTasksCatalogSchema = Joi.object({
  page: Joi.number().min(1).default(1).messages({
    'number.min': 'Page must be at least 1',
  }),
  size: Joi.number().min(1).max(100).default(20).messages({
    'number.min': 'Size must be at least 1',
    'number.max': 'Size must not exceed 100',
  }),
  search: Joi.string().trim().max(200).optional().messages({
    'string.max': 'Search must not exceed 200 characters',
  }),
  category: Joi.string()
    .valid(...TASK_CATEGORIES)
    .optional()
    .messages({
      'any.only':
        'Category must be one of: BACKEND, FRONTEND, DEVOPS, QA, DATA, MOBILE, OTHER, FULLSTACK, AI_ML, UI_UX_DESIGN, PRODUCT_MANAGEMENT, BUSINESS_ANALYSIS, CYBERSECURITY, GAME_DEV, EMBEDDED, TECH_WRITING',
    }),
  difficulty: Joi.string()
    .valid(...TASK_DIFFICULTY)
    .optional()
    .messages({
      'any.only': 'Difficulty must be one of: JUNIOR, MIDDLE, SENIOR, ANY',
    }),
  type: Joi.string()
    .valid(...TASK_TYPES)
    .optional()
    .messages({
      'any.only': 'Type must be one of: PAID, UNPAID, VOLUNTEER, EXPERIENCE',
    }),
  technology_ids: Joi.alternatives()
    .try(
      Joi.string().guid({ version: 'uuidv4' }),
      Joi.array().items(Joi.string().guid({ version: 'uuidv4' }))
    )
    .optional()
    .messages({
      'string.guid': 'Each technology ID must be a valid UUID',
    }),
  tech_match: Joi.string().valid('ANY', 'ALL').default('ANY').optional().messages({
    'any.only': 'tech_match must be ANY or ALL',
  }),
  project_id: Joi.string().guid({ version: 'uuidv4' }).optional().messages({
    'string.guid': 'Project id must be a valid UUID',
  }),
  owner: Joi.any().optional(),
  include_deleted: Joi.any().optional(),
});

export const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.integer': 'Rating must be an integer',
    'number.min': 'Rating must be between 1 and 5',
    'number.max': 'Rating must be between 1 and 5',
    'any.required': 'Rating is required',
  }),
  text: Joi.string().trim().min(5).max(1000).optional().messages({
    'string.min': 'Review text must be at least 5 characters',
    'string.max': 'Review text must not exceed 1000 characters',
  }),
});

export const rejectTaskCompletionSchema = Joi.object({
  feedback: Joi.string().trim().min(10).max(2000).optional().messages({
    'string.min': 'Feedback must be at least 10 characters',
    'string.max': 'Feedback must not exceed 2000 characters',
  }),
});

export const getProjectTasksQuerySchema = Joi.object({
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
    .valid(
      'DRAFT',
      'PUBLISHED',
      'IN_PROGRESS',
      'COMPLETION_REQUESTED',
      'COMPLETED',
      'FAILED',
      'CLOSED',
      'DELETED'
    )
    .optional()
    .messages({
      'any.only':
        'Status must be one of: DRAFT, PUBLISHED, IN_PROGRESS, COMPLETION_REQUESTED, COMPLETED, FAILED, CLOSED, DELETED',
    }),
  include_deleted: Joi.boolean().default(false).messages({
    'boolean.base': 'The include_deleted parameter must be true or false',
  }),
});

export const getRecommendedDevelopersQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(10).default(3).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 10',
  }),
});

export const getTaskCandidatesQuerySchema = Joi.object({
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
  search: Joi.string().trim().max(200).optional().messages({
    'string.max': 'Search must not exceed 200 characters',
  }),
  availability: Joi.string()
    .valid(...DEVELOPER_AVAILABILITY)
    .optional()
    .messages({
      'any.only': 'Availability must be one of: FEW_HOURS_WEEK, PART_TIME, FULL_TIME',
    }),
  experience_level: Joi.string()
    .valid(...DEVELOPER_EXPERIENCE)
    .optional()
    .messages({
      'any.only': 'Experience level must be one of: STUDENT, JUNIOR, MIDDLE, SENIOR',
    }),
  min_rating: Joi.number().min(0).max(5).optional().messages({
    'number.base': 'Minimum rating must be a number',
    'number.min': 'Minimum rating must be at least 0',
    'number.max': 'Minimum rating must not exceed 5',
  }),
  exclude_invited: Joi.boolean().default(false).messages({
    'boolean.base': 'exclude_invited must be true or false',
  }),
  exclude_applied: Joi.boolean().default(false).messages({
    'boolean.base': 'exclude_applied must be true or false',
  }),
});
