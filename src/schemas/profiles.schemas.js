import Joi from 'joi';
import {
  emailRegexp,
  EXPERIENCE_LEVELS,
  AVAILABILITY_LEVELS,
  TASK_CATEGORIES,
  COMPANY_TYPES,
} from './constants.js';

const developerProfileFields = {
  display_name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Display name is required',
    'string.min': 'Display name must be at least 2 characters',
    'string.max': 'Display name must not exceed 100 characters',
    'any.required': 'Display name is required',
  }),
  primary_role: Joi.string().trim().min(2).max(100).messages({
    'string.min': 'Primary role must be at least 2 characters',
    'string.max': 'Primary role must not exceed 100 characters',
  }),
  bio: Joi.string().trim().min(10).max(2000).messages({
    'string.min': 'Bio must be at least 10 characters',
    'string.max': 'Bio must not exceed 2000 characters',
  }),
  experience_level: Joi.string()
    .valid(...EXPERIENCE_LEVELS)
    .messages({
      'any.only': 'Experience level must be one of: STUDENT, JUNIOR, MIDDLE, SENIOR',
    }),
  location: Joi.string().trim().min(2).max(100).messages({
    'string.min': 'Location must be at least 2 characters',
    'string.max': 'Location must not exceed 100 characters',
  }),
  timezone: Joi.string().trim().min(3).max(50).messages({
    'string.min': 'Timezone must be at least 3 characters',
    'string.max': 'Timezone must not exceed 50 characters',
  }),
  availability: Joi.string()
    .valid(...AVAILABILITY_LEVELS)
    .messages({
      'any.only': 'Availability must be one of: FEW_HOURS_WEEK, PART_TIME, FULL_TIME',
    }),
  preferred_task_categories: Joi.array()
    .items(
      Joi.string()
        .valid(...TASK_CATEGORIES)
        .messages({
          'any.only':
            'Each task category must be one of: BACKEND, FRONTEND, DEVOPS, QA, DATA, MOBILE, OTHER, FULLSTACK, AI_ML, UI_UX_DESIGN, PRODUCT_MANAGEMENT, BUSINESS_ANALYSIS, CYBERSECURITY, GAME_DEV, EMBEDDED, TECH_WRITING',
        })
    )
    .unique()
    .max(10)
    .messages({
      'array.unique': 'Task categories must be unique',
      'array.max': 'Task categories list must not exceed 10 items',
    }),
  portfolio_url: Joi.string().uri().messages({
    'string.uri': 'Portfolio URL must be a valid URI',
  }),
  linkedin_url: Joi.string().uri().messages({
    'string.uri': 'LinkedIn URL must be a valid URI',
  }),
  technology_ids: Joi.array()
    .items(
      Joi.string().guid({ version: 'uuidv4' }).messages({
        'string.guid': 'Each technology ID must be a valid UUID',
      })
    )
    .unique()
    .max(50)
    .messages({
      'array.unique': 'Technology IDs must be unique',
      'array.max': 'Technology list must not exceed 50 items',
    }),
};

export const createDeveloperProfileSchema = Joi.object(developerProfileFields);

export const updateDeveloperProfileSchema = Joi.object(developerProfileFields);

export const getDeveloperProfileParamsSchema = Joi.object({
  userId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'User id is required',
    'string.guid': 'User id must be a valid UUID',
    'any.required': 'User id is required',
  }),
});

export const getCompanyProfileParamsSchema = Joi.object({
  userId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.empty': 'User id is required',
    'string.guid': 'User id must be a valid UUID',
    'any.required': 'User id is required',
  }),
});

const companyProfileFields = {
  company_name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Company name is required',
    'string.min': 'Company name must be at least 2 characters',
    'string.max': 'Company name must not exceed 100 characters',
    'any.required': 'Company name is required',
  }),
  company_type: Joi.string()
    .valid(...COMPANY_TYPES)
    .messages({
      'any.only': 'Company type must be one of: STARTUP, SMB, ENTERPRISE, INDIVIDUAL',
    }),
  description: Joi.string().trim().min(10).max(2000).messages({
    'string.min': 'Description must be at least 10 characters',
    'string.max': 'Description must not exceed 2000 characters',
  }),
  team_size: Joi.number().integer().min(1).max(100000).messages({
    'number.base': 'Team size must be a number',
    'number.integer': 'Team size must be an integer',
    'number.min': 'Team size must be at least 1',
    'number.max': 'Team size must not exceed 100000',
  }),
  country: Joi.string()
    .trim()
    .pattern(/^[A-Z]{2}$/)
    .messages({
      'string.pattern.base': 'Country must be a valid 2-letter ISO code',
    }),
  timezone: Joi.string().trim().min(3).max(50).messages({
    'string.min': 'Timezone must be at least 3 characters',
    'string.max': 'Timezone must not exceed 50 characters',
  }),
  contact_email: Joi.string().pattern(emailRegexp).messages({
    'string.pattern.base': 'Contact email must be a valid email',
  }),
  website_url: Joi.string().uri().messages({
    'string.uri': 'Website URL must be a valid URI',
  }),
  links: Joi.object()
    .pattern(
      Joi.string().trim().min(2).max(30),
      Joi.string().uri().messages({
        'string.uri': 'Each link value must be a valid URI',
      })
    )
    .max(20)
    .messages({
      'object.base': 'Links must be an object',
      'object.max': 'Links must not exceed 20 items',
    }),
};

export const createCompanyProfileSchema = Joi.object(companyProfileFields);

export const updateCompanyProfileSchema = Joi.object(companyProfileFields);

export const getUserReviewsSchema = Joi.object({
  page: Joi.number().min(1).default(1).messages({
    'number.min': 'Page must be at least 1',
  }),
  size: Joi.number().min(1).max(100).default(20).messages({
    'number.min': 'Size must be at least 1',
    'number.max': 'Size must not exceed 100',
  }),
});

export const getDevelopersQuerySchema = Joi.object({
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
  technology_type: Joi.string()
    .valid(...TASK_CATEGORIES)
    .optional()
    .messages({
      'any.only':
        'Technology type must be one of: BACKEND, FRONTEND, DEVOPS, QA, DATA, MOBILE, OTHER, FULLSTACK, AI_ML, UI_UX_DESIGN, PRODUCT_MANAGEMENT, BUSINESS_ANALYSIS, CYBERSECURITY, GAME_DEV, EMBEDDED, TECH_WRITING',
    }),
  technology_ids: Joi.array()
    .items(
      Joi.string().guid({ version: 'uuidv4' }).messages({
        'string.guid': 'Each technology ID must be a valid UUID',
      })
    )
    .single()
    .unique()
    .max(20)
    .optional()
    .messages({
      'array.base':
        'Technology IDs must be provided as a query array (repeat technology_ids) or a single UUID',
      'array.unique': 'Technology IDs must be unique',
      'array.max': 'Technology IDs must not exceed 20 items',
    }),
});

export const uploadAvatarSchema = Joi.object({
  file: Joi.object({
    fieldname: Joi.string(),
    originalname: Joi.string(),
    encoding: Joi.string(),
    mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/webp').messages({
      'any.only': 'File type must be one of: image/jpeg, image/png, image/webp',
    }),
    size: Joi.number()
      .max(5242880) // 5MB in bytes
      .messages({
        'number.max': 'File size must not exceed 5MB',
      }),
    buffer: Joi.binary(),
  })
    .required()
    .unknown(true)
    .messages({
      'any.required': 'File is required',
      'object.base': 'File is required',
    }),
}).unknown(true);
