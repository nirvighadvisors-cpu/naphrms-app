import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware.
 * Catches all errors and returns a structured JSON response.
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Unhandled error:', err);

  // Prisma known errors
  if (err.code === 'P2002') {
    res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'A record with this value already exists',
        details: err.meta?.target,
      },
    });
    return;
  }

  if (err.code === 'P2025') {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
    return;
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors,
      },
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
    });
    return;
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : message,
    },
  });
};
