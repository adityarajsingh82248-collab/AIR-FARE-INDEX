import { env } from '../config/env.js';

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  // Log server-side for diagnostics
  console.error('Unhandled Server Error:', {
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  // Safe, sanitized error message for client
  let clientMessage = 'An unexpected server error occurred. Please try again later.';

  if (err.isOperational || statusCode < 500) {
    clientMessage = err.message;
  } else if (err.code === '23505') {
    clientMessage = 'A record with this information already exists.';
  } else if (err.code === '23503') {
    clientMessage = 'Referenced record was not found.';
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
  });
}

/**
 * 404 Not Found handler for undefined API routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}
