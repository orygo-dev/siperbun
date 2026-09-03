import { PERMISSIONS } from '@siperbun/shared';
import { Router } from 'express';
import {
  authenticate,
  requireAnyPermission,
} from '../../middlewares/auth';
import { AuthedRequest, success } from '../../utils/response';
import { resolveDashboardScope } from '../dashboard/dashboard.service';
import { mapService } from './map.service';

export const mapRouter = Router();

mapRouter.use(authenticate);

mapRouter.get(
  '/markers',
  requireAnyPermission(PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.PRODUCER_VIEW),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const scope = resolveDashboardScope({
        id: user.id,
        roles: user.roles,
        producerId: user.producerId,
      });
      const items = await mapService.markers(scope);
      return success(res, items, 'Marker peta berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);
