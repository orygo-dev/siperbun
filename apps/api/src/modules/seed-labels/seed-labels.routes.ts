import {
  labelDistributionCreateSchema,
  PERMISSIONS,
  seedLabelCreateSchema,
  seedLabelUpdateSchema,
} from '@siperbun/shared';
import { Router } from 'express';
import {
  authenticate,
  requirePermission,
} from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { AuthedRequest, success } from '../../utils/response';
import { seedLabelsService } from './seed-labels.service';

export const seedLabelsRouter = Router();

seedLabelsRouter.use(authenticate);

seedLabelsRouter.get(
  '/',
  requirePermission(PERMISSIONS.CERTIFICATE_VIEW),
  async (req, res, next) => {
    try {
      const result = await seedLabelsService.list({
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        search: req.query.search as string | undefined,
        certificateId: req.query.certificateId as string | undefined,
      });
      return success(
        res,
        result.items,
        'Daftar label berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

seedLabelsRouter.post(
  '/',
  requirePermission(PERMISSIONS.CERTIFICATE_UPLOAD),
  validateBody(seedLabelCreateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await seedLabelsService.create(req.body, user.id);
      return success(res, item, 'Label berhasil dibuat', 201);
    } catch (e) {
      next(e);
    }
  },
);

seedLabelsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.CERTIFICATE_VIEW),
  async (req, res, next) => {
    try {
      const item = await seedLabelsService.getById(String(req.params.id));
      return success(res, item, 'Detail label berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

seedLabelsRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.CERTIFICATE_UPLOAD),
  validateBody(seedLabelUpdateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await seedLabelsService.update(
        String(req.params.id),
        req.body,
        user.id,
      );
      return success(res, item, 'Label berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

seedLabelsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.CERTIFICATE_UPLOAD),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await seedLabelsService.softDelete(
        String(req.params.id),
        user.id,
      );
      return success(res, item, 'Label berhasil dihapus');
    } catch (e) {
      next(e);
    }
  },
);

seedLabelsRouter.post(
  '/:id/distributions',
  requirePermission(PERMISSIONS.CERTIFICATE_UPLOAD),
  validateBody(labelDistributionCreateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await seedLabelsService.addDistribution(
        String(req.params.id),
        req.body,
        user.id,
      );
      return success(res, item, 'Distribusi label berhasil dicatat', 201);
    } catch (e) {
      next(e);
    }
  },
);
