import { PERMISSIONS } from '@siperbun/shared';
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { AuthedRequest } from '../../utils/response';
import { success } from '../../utils/response';
import {
  dashboardService,
  resolveDashboardScope,
} from './dashboard.service';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, requirePermission(PERMISSIONS.DASHBOARD_VIEW));

function scopeFrom(req: AuthedRequest) {
  return resolveDashboardScope({
    id: req.user!.id,
    roles: req.user!.roles,
    producerId: req.user!.producerId,
  });
}

dashboardRouter.get('/summary', async (req, res, next) => {
  try {
    return success(res, await dashboardService.summary(scopeFrom(req)));
  } catch (e) {
    next(e);
  }
});

dashboardRouter.get('/certification-status', async (req, res, next) => {
  try {
    return success(
      res,
      await dashboardService.certificationStatus(scopeFrom(req)),
    );
  } catch (e) {
    next(e);
  }
});

dashboardRouter.get('/priorities', async (req, res, next) => {
  try {
    return success(res, await dashboardService.priorities(scopeFrom(req)));
  } catch (e) {
    next(e);
  }
});

dashboardRouter.get('/production-by-commodity', async (req, res, next) => {
  try {
    return success(
      res,
      await dashboardService.productionByCommodity(scopeFrom(req)),
    );
  } catch (e) {
    next(e);
  }
});

dashboardRouter.get('/distribution-map', async (req, res, next) => {
  try {
    return success(
      res,
      await dashboardService.distributionMap(scopeFrom(req)),
    );
  } catch (e) {
    next(e);
  }
});

dashboardRouter.get('/today-inspections', async (req, res, next) => {
  try {
    return success(
      res,
      await dashboardService.todayInspections(scopeFrom(req)),
    );
  } catch (e) {
    next(e);
  }
});

dashboardRouter.get('/inspector-performance', async (req, res, next) => {
  try {
    return success(
      res,
      await dashboardService.inspectorPerformance(scopeFrom(req)),
    );
  } catch (e) {
    next(e);
  }
});

dashboardRouter.get('/recent-applications', async (req, res, next) => {
  try {
    return success(
      res,
      await dashboardService.recentApplications(scopeFrom(req)),
    );
  } catch (e) {
    next(e);
  }
});

dashboardRouter.get('/certificate-scans', async (req, res, next) => {
  try {
    return success(
      res,
      await dashboardService.certificateScans(scopeFrom(req)),
    );
  } catch (e) {
    next(e);
  }
});

dashboardRouter.get('/recent-activities', async (req, res, next) => {
  try {
    return success(
      res,
      await dashboardService.recentActivities(scopeFrom(req)),
    );
  } catch (e) {
    next(e);
  }
});

dashboardRouter.get('/banners', async (req, res, next) => {
  try {
    const placement =
      req.query.placement === 'MOBILE'
        ? ('MOBILE' as const)
        : req.query.placement === 'DASHBOARD'
          ? ('DASHBOARD' as const)
          : undefined;
    return success(res, await dashboardService.banners(placement));
  } catch (e) {
    next(e);
  }
});
