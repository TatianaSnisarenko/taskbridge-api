export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorResponse(err) {
  return {
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message: err.message ?? 'Unexpected error',
      details: err.details ?? undefined,
    },
  };
}
