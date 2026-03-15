import Joi from 'joi';
import {
  emailRegexp,
  passRegexp,
  EXPERIENCE_LEVELS,
  AVAILABILITY_LEVELS,
  TASK_CATEGORIES,
  COMPANY_TYPES,
} from './constants.js';
import { TIMEZONE_VALUES } from '../data/timezones.js';

// Validator used instead of Joi.valid() to avoid listing 150+ timezone values in enum
const validTimezone = (value, helpers) => {
  if (!TIMEZONE_VALUES.includes(value)) {
    return helpers.error('any.invalidTimezone');
  }
  return value;
};

const timezoneMessages = {
  'any.invalidTimezone': 'Timezone must be a valid IANA timezone identifier',
};

export { emailRegexp, passRegexp };

export const signupSchema = Joi.object({
  email: Joi.string().pattern(emailRegexp).required().messages({
    'string.pattern.base': 'Email format is invalid',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
  password: Joi.string().pattern(passRegexp).required().messages({
    'string.pattern.base': 'Password must be 6-64 chars, with upper/lowercase, number, and symbol',
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
  developerProfile: Joi.object({
    displayName: Joi.string().trim().min(2).max(100).required().messages({
      'string.empty': 'Display name is required',
      'string.min': 'Display name must be at least 2 characters',
      'string.max': 'Display name must not exceed 100 characters',
      'any.required': 'Display name is required',
    }),
    jobTitle: Joi.string().trim().min(2).max(100),
    bio: Joi.string().trim().min(10).max(2000),
    experienceLevel: Joi.string()
      .valid(...EXPERIENCE_LEVELS)
      .messages({
        'any.only': 'Experience level must be one of: STUDENT, JUNIOR, MIDDLE, SENIOR',
      }),
    location: Joi.string().trim().min(2).max(100),
    timezone: Joi.string().trim().custom(validTimezone).messages(timezoneMessages),
    availability: Joi.string()
      .valid(...AVAILABILITY_LEVELS)
      .messages({
        'any.only': 'Availability must be one of: FEW_HOURS_WEEK, PART_TIME, FULL_TIME',
      }),
    preferredTaskCategories: Joi.array()
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
    portfolioUrl: Joi.string().uri().messages({
      'string.uri': 'Portfolio URL must be a valid URI',
    }),
    linkedinUrl: Joi.string().uri().messages({
      'string.uri': 'LinkedIn URL must be a valid URI',
    }),
    technologyIds: Joi.array()
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
    technologies: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().guid({ version: 'uuidv4' }).required().messages({
            'string.guid': 'Technology id must be a valid UUID',
            'any.required': 'Technology id is required',
          }),
        }).unknown(true)
      )
      .unique('id')
      .max(50)
      .messages({
        'array.unique': 'Technologies must be unique by id',
        'array.max': 'Technology list must not exceed 50 items',
      }),
  }),
  companyProfile: Joi.object({
    companyName: Joi.string().trim().min(2).max(100).required().messages({
      'string.empty': 'Company name is required',
      'string.min': 'Company name must be at least 2 characters',
      'string.max': 'Company name must not exceed 100 characters',
      'any.required': 'Company name is required',
    }),
    companyType: Joi.string()
      .valid(...COMPANY_TYPES)
      .messages({
        'any.only': 'Company type must be one of: STARTUP, SMB, ENTERPRISE, INDIVIDUAL',
      }),
    description: Joi.string().trim().min(10).max(2000),
    teamSize: Joi.number().integer().min(1).max(100000).messages({
      'number.base': 'Team size must be a number',
      'number.integer': 'Team size must be an integer',
      'number.min': 'Team size must be at least 1',
      'number.max': 'Team size must not exceed 100000',
    }),
    country: Joi.string().trim().min(2).max(100).messages({
      'string.min': 'Country must be at least 2 characters',
      'string.max': 'Country must not exceed 100 characters',
    }),
    timezone: Joi.string().trim().custom(validTimezone).messages(timezoneMessages),
    contactEmail: Joi.string().pattern(emailRegexp).messages({
      'string.pattern.base': 'Contact email must be a valid email',
    }),
    websiteUrl: Joi.string().uri().messages({
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
  }),
})
  .or('developerProfile', 'companyProfile')
  .messages({
    'object.missing': 'At least one profile is required',
  });

export const loginSchema = Joi.object({
  email: Joi.string().pattern(emailRegexp).required().messages({
    'string.pattern.base': 'Email format is invalid',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required(),
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().trim().required().messages({
    'string.empty': 'Verification token is required',
    'any.required': 'Verification token is required',
  }),
});

export const resendVerificationSchema = Joi.object({
  email: Joi.string().pattern(emailRegexp).required().messages({
    'string.pattern.base': 'Email format is invalid',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
});

export const setPasswordSchema = Joi.object({
  password: Joi.string().pattern(passRegexp).required().messages({
    'string.pattern.base': 'Password must be 6-64 chars, with upper/lowercase, number, and symbol',
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().pattern(emailRegexp).required().messages({
    'string.pattern.base': 'Email format is invalid',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().required().messages({
    'string.empty': 'Reset token is required',
    'any.required': 'Reset token is required',
  }),
  new_password: Joi.string().pattern(passRegexp).required().messages({
    'string.pattern.base': 'Password must be 6-64 chars, with upper/lowercase, number, and symbol',
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
});
