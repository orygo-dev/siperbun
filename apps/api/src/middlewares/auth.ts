import { NextFunction, Response } from 'express';
import { AppError } from '../utils/errors';
import { verifyAccessToken } from '../utils/crypto';
import { AuthedRequest } from '../utils/response';
import { prisma } from '../config/database';

type TokenPayload = { sub: string; email: string };

export async function authenticate(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Unauthorized', 401);
    }
    const token = header.slice(7);
    const payload = verifyAccessToken<TokenPayload>(token);

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) throw new AppError('Unauthorized', 401);

    const roles = user.userRoles.map((ur) => ur.role.slug);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key),
        ),
      ),
    ];

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      permissions,
      producerId: user.producerId,
    };
    next();
  } catch {
    next(new AppError('Unauthorized', 401));
  }
}

export function requirePermission(...perms: string[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    if (req.user.roles.includes('SUPER_ADMIN')) return next();
    const ok = perms.every((p) => req.user!.permissions.includes(p));
    if (!ok) return next(new AppError('Forbidden', 403));
    next();
  };
}

export function requireAnyPermission(...perms: string[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    if (req.user.roles.includes('SUPER_ADMIN')) return next();
    const ok = perms.some((p) => req.user!.permissions.includes(p));
    if (!ok) return next(new AppError('Forbidden', 403));
    next();
  };
}
