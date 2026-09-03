import { NextFunction, Request, Response } from 'express';
import { z, ZodSchema } from 'zod';
import { AppError } from '../utils/errors';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_';
        errors[key] = errors[key] ?? [];
        errors[key]!.push(issue.message);
      }
      return next(new AppError('Validasi gagal', 422, errors));
    }
    req.body = parsed.data;
    next();
  };
}

const uuidParamSchema = z.string().uuid();

export function requiredUuidParam(
  value: string | undefined,
  name = 'id',
): string {
  const parsed = uuidParamSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(`Parameter ${name} tidak valid`, 400);
  }
  return parsed.data;
}
