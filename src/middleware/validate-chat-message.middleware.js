import { ApiError } from '../utils/ApiError.js';
import { createMessageRequestSchema } from '../schemas/me.schemas.js';

function mapValidationField(detail) {
  if (!detail.path?.length) {
    return 'text or files';
  }

  if (detail.path[0] === 'files' && typeof detail.path[1] === 'number') {
    return `files[${detail.path[1]}]`;
  }

  return detail.path.join('.');
}

export function validateCreateMessageRequest(req, res, next) {
  const payload = {
    text: typeof req.body?.text === 'string' ? req.body.text : '',
    files: Array.isArray(req.files)
      ? req.files.map((file) => ({
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        }))
      : [],
  };

  const { error, value } = createMessageRequestSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return next(
      new ApiError(
        400,
        'VALIDATION_ERROR',
        'Validation failed',
        error.details.map((detail) => ({
          field: mapValidationField(detail),
          message: detail.message,
        }))
      )
    );
  }

  req.body.text = value.text;
  req.files = Array.isArray(req.files) ? req.files : [];
  return next();
}
