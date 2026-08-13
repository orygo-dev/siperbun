import { Request, Response } from 'express';

export function success<T>(
  res: Response,
  data: T,
  message = 'Data berhasil dimuat',
  status = 200,
  meta?: Record<string, unknown>,
) {
  return res.status(status).json({
    success: true,
    message,
    data,
    meta: meta ?? {},
  });
}

export function fail(
  res: Response,
  message: string,
  status = 400,
  errors?: Record<string, string[]>,
) {
  return res.status(status).json({
    success: false,
    message,
    errors: errors ?? undefined,
  });
}

export type AuthedRequest = Request & {
  user?: {
    id: string;
    email: string;
    name: string;
    permissions: string[];
    roles: string[];
    producerId?: string | null;
  };
};
