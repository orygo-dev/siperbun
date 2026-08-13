import { PERMISSIONS } from '@siperbun/shared';
import { Router } from 'express';
import {
  authenticate,
  requireAnyPermission,
} from '../../middlewares/auth';
import { success } from '../../utils/response';
import { mapService } from './map.service';

export const mapRouter = Router();

mapRouter.use(authenticate);

mapRouter.get(
  '/markers',
  requireAnyPermission(PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.PRODUCER_VIEW),
  async (_req, res, next) => {
    try {
      const items = await mapService.markers();
      return success(res, items, 'Marker peta berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);
