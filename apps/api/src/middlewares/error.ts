import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { env } from '../config/env';
import { logger } from '../config/logger';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      errors[key] = errors[key] ?? [];
      errors[key]!.push(issue.message);
    }
    return res.status(422).json({
      success: false,
      message: 'Validasi gagal',
      errors,
    });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server',
    ...(env.isDev && err instanceof Error ? { stack: err.stack } : {}),
  });
}

export function notFound(_req: Request, res: Response) {
  return res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
  });
}
