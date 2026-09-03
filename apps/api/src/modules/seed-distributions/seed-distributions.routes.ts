import {
  PERMISSIONS,
  seedDistributionCreateSchema,
  seedDistributionUpdateSchema,
} from '@siperbun/shared';
import { Router } from 'express';
import {
  authenticate,
  requireAnyPermission,
} from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { AuthedRequest, success } from '../../utils/response';
import { seedDistributionsService } from './seed-distributions.service';

export const seedDistributionsRouter = Router();

seedDistributionsRouter.use(authenticate);

seedDistributionsRouter.get(
  '/',
  requireAnyPermission(
    PERMISSIONS.CERTIFICATE_VIEW,
    PERMISSIONS.DISTRIBUTION_VIEW,
  ),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const result = await seedDistributionsService.list(
        {
          page: Number(req.query.page ?? 1),
          limit: Number(req.query.limit ?? 10),
          search: req.query.search as string | undefined,
          producerId: req.query.producerId as string | undefined,
          certificateId: req.query.certificateId as string | undefined,
        },
        user,
      );
      return success(
        res,
        result.items,
        'Daftar distribusi bibit berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

seedDistributionsRouter.post(
  '/',
  requireAnyPermission(
    PERMISSIONS.CERTIFICATE_UPLOAD,
    PERMISSIONS.DISTRIBUTION_CREATE,
  ),
  validateBody(seedDistributionCreateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await seedDistributionsService.create(req.body, user);
      return success(res, item, 'Distribusi bibit berhasil dicatat', 201);
    } catch (e) {
      next(e);
    }
  },
);

seedDistributionsRouter.get(
  '/:id',
  requireAnyPermission(
    PERMISSIONS.CERTIFICATE_VIEW,
    PERMISSIONS.DISTRIBUTION_VIEW,
  ),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await seedDistributionsService.getById(
        String(req.params.id),
        user,
      );
      return success(res, item, 'Detail distribusi bibit berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

seedDistributionsRouter.put(
  '/:id',
  requireAnyPermission(
    PERMISSIONS.CERTIFICATE_UPLOAD,
    PERMISSIONS.DISTRIBUTION_CREATE,
  ),
  validateBody(seedDistributionUpdateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await seedDistributionsService.update(
        String(req.params.id),
        req.body,
        user,
      );
      return success(res, item, 'Distribusi bibit berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

seedDistributionsRouter.delete(
  '/:id',
  requireAnyPermission(
    PERMISSIONS.CERTIFICATE_UPLOAD,
    PERMISSIONS.DISTRIBUTION_CREATE,
  ),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await seedDistributionsService.softDelete(
        String(req.params.id),
        user,
      );
      return success(res, item, 'Distribusi bibit berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);
