export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, req, res, next) {
  // If response already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const code = err.code || 'INTERNAL_ERROR';

  // Log error details for server diagnostics
  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  } else if (!isProduction) {
    console.warn(`[Client Error] ${req.method} ${req.originalUrl} (${statusCode}): ${err.message}`);
  }

  // Safe client response (no leaking internal stack trace in production)
  res.status(statusCode).json({
    error: err.isOperational || !isProduction ? err.message : 'An unexpected error occurred',
    code,
    ...(err.details && { details: err.details }),
    ...(!isProduction && { stack: err.stack }),
  });
}

