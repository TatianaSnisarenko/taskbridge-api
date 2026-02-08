import { ApiError, errorResponse } from '../utils/ApiError.js';

export function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ApiError) {
    return res.status(err.status).json(errorResponse(err));
  }

  // Invalid JSON body (body-parser)
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    const apiErr = new ApiError(400, 'INVALID_JSON', 'Invalid JSON format');
    return res.status(apiErr.status).json(errorResponse(apiErr));
  }

  // Joi validation errors
  if (err?.isJoi) {
    const details = err.details?.map((d) => ({
      field: d.path?.length
        ? d.path.join('.')
        : d.type === 'object.missing' && Array.isArray(d.context?.peers)
          ? d.context.peers.join(' or ')
          : 'body',
      issue: d.message ?? d.type ?? 'invalid',
    }));
    const apiErr = new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', details);
    return res.status(apiErr.status).json(errorResponse(apiErr));
  }

  // CORS errors are thrown as Error()
  if (typeof err?.message === 'string' && err.message.startsWith('CORS:')) {
    const apiErr = new ApiError(403, 'CORS_NOT_ALLOWED', err.message);
    return res.status(apiErr.status).json(errorResponse(apiErr));
  }

  console.error(err);
  const apiErr = new ApiError(500, 'INTERNAL_ERROR', 'Internal server error');
  return res.status(apiErr.status).json(errorResponse(apiErr));
}
