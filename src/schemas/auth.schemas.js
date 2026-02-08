import Joi from 'joi';

export const emailRegexp = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
export const passRegexp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[ -~]{6,64}$/;

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
    displayName: Joi.string().trim().min(1).required(),
  }).unknown(true),
  companyProfile: Joi.object({
    companyName: Joi.string().trim().min(1).required(),
  }).unknown(true),
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
