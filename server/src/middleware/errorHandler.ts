import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const error = err.code || 'INTERNAL_SERVER_ERROR';
  const rawMessage = err.message || 'An unexpected error occurred';

  console.error(`[Error] ${error}: ${rawMessage}`, err.stack);

  // Never expose internal error details (Redis URLs, SDK internals) in production
  const isProduction = process.env.NODE_ENV === 'production';
  const message = statusCode >= 500 && isProduction ? 'An unexpected error occurred' : rawMessage;

  res.status(statusCode).json({ error, message });
}

export function createError(statusCode: number, code: string, message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
