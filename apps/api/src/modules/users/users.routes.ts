import { PERMISSIONS } from '@siperbun/shared';
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { AppError } from '../../utils/errors';
import { AuthedRequest, success } from '../../utils/response';
import {
  userCreateSchema,
  userUpdateSchema,
} from '@siperbun/shared';
import { validateBody } from '../../middlewares/validate';
import { requirePermission } from '../../middlewares/auth';
import { usersService } from './users.service';

export const usersRouter = Router();
export const rolesRouter = Router();

usersRouter.use(authenticate);
rolesRouter.use(authenticate);

usersRouter.get(
  '/inspectors',
  requirePermission(PERMISSIONS.APPLICATION_ASSIGN),
  async (_req, res, next) => {
    try {
      const items = await usersService.listInspectors();
      return success(res, items, 'Daftar PBT berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.get(
  '/',
  requirePermission(PERMISSIONS.USER_MANAGE),
  async (req, res, next) => {
    try {
      const result = await usersService.list({
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        search: req.query.search as string | undefined,
        role: req.query.role as string | undefined,
        isActive: req.query.isActive as string | undefined,
      });
      return success(
        res,
        result.items,
        'Daftar pengguna berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.USER_MANAGE),
  async (req, res, next) => {
    try {
      const item = await usersService.getById(String(req.params.id));
      return success(res, item, 'Detail pengguna berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.post(
  '/',
  requirePermission(PERMISSIONS.USER_MANAGE),
  validateBody(userCreateSchema),
  async (req, res, next) => {
    try {
      const item = await usersService.create(req.body);
      return success(res, item, 'Pengguna berhasil ditambahkan', 201);
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.USER_MANAGE),
  validateBody(userUpdateSchema),
  async (req, res, next) => {
    try {
      const item = await usersService.update(String(req.params.id), req.body);
      return success(res, item, 'Pengguna berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.post(
  '/:id/toggle-active',
  requirePermission(PERMISSIONS.USER_MANAGE),
  async (req, res, next) => {
    try {
      const item = await usersService.toggleActive(String(req.params.id));
      return success(
        res,
        item,
        item.isActive
          ? 'Pengguna berhasil diaktifkan'
          : 'Pengguna berhasil dinonaktifkan',
      );
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.USER_MANAGE),
  async (req, res, next) => {
    try {
      const item = await usersService.softDelete(String(req.params.id));
      return success(res, item, 'Pengguna berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);

rolesRouter.get('/', async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    if (!user) throw new AppError('Unauthorized', 401);
    const ok =
      user.roles.includes('SUPER_ADMIN') ||
      user.permissions.includes(PERMISSIONS.USER_MANAGE) ||
      user.permissions.includes(PERMISSIONS.ROLE_MANAGE);
    if (!ok) throw new AppError('Forbidden', 403);
    const item = await usersService.listRoles();
    return success(res, item, 'Daftar role berhasil dimuat');
  } catch (e) {
    next(e);
  }
});
