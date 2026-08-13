import { Router } from 'express';
import { prisma } from '../config/database';
import { success } from '../utils/response';
import { authRouter } from '../modules/auth/auth.routes';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes';
import { producersRouter } from '../modules/producers/producers.routes';
import { nurseriesRouter } from '../modules/nurseries/nurseries.routes';
import { seedGardensRouter } from '../modules/seed-gardens/seed-gardens.routes';
import { seedSourcesRouter } from '../modules/seed-sources/seed-sources.routes';
import { productionBatchesRouter } from '../modules/production-batches/production-batches.routes';
import { certificationApplicationsRouter } from '../modules/certification-applications/certification-applications.routes';
import { fieldAssignmentsRouter } from '../modules/field-assignments/field-assignments.routes';
import { fieldInspectionsRouter } from '../modules/field-inspections/field-inspections.routes';
import { findingsRouter } from '../modules/findings/findings.routes';
import { inspectionChecklistsRouter } from '../modules/inspection-checklists/inspection-checklists.routes';
import { certificatesRouter } from '../modules/certificates/certificates.routes';
import { seedLabelsRouter } from '../modules/seed-labels/seed-labels.routes';
import { seedDistributionsRouter } from '../modules/seed-distributions/seed-distributions.routes';
import { circulationInspectionsRouter } from '../modules/circulation-inspections/circulation-inspections.routes';
import { reportsRouter } from '../modules/reports/reports.routes';
import { auditLogsRouter } from '../modules/audit-logs/audit-logs.routes';
import { mapRouter } from '../modules/map/map.routes';
import { notificationsRouter } from '../modules/notifications/notifications.routes';
import { filesRouter } from '../modules/files/files.routes';
import { regionsRouter } from '../modules/regions/regions.routes';
import { commoditiesRouter } from '../modules/commodities/commodities.routes';
import { varietiesRouter } from '../modules/varieties/varieties.routes';
import { usersRouter, rolesRouter } from '../modules/users/users.routes';
import { settingsRouter } from '../modules/settings/settings.routes';
import {
  catalogAdminRouter,
  publicRouter,
} from '../modules/public/public.routes';

export const v1Router = Router();

v1Router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return success(res, { status: 'ok', database: 'up' }, 'API sehat');
  } catch {
    return success(
      res,
      { status: 'degraded', database: 'down' },
      'API berjalan tanpa database',
      200,
    );
  }
});

v1Router.use('/auth', authRouter);
v1Router.use('/dashboard', dashboardRouter);
v1Router.use('/producers', producersRouter);
v1Router.use('/nursery-locations', nurseriesRouter);
v1Router.use('/seed-gardens', seedGardensRouter);
v1Router.use('/seed-sources', seedSourcesRouter);
v1Router.use('/production-batches', productionBatchesRouter);
v1Router.use('/certification-applications', certificationApplicationsRouter);
v1Router.use('/field-assignments', fieldAssignmentsRouter);
v1Router.use('/field-inspections', fieldInspectionsRouter);
v1Router.use('/findings', findingsRouter);
v1Router.use('/inspection-checklists', inspectionChecklistsRouter);
v1Router.use('/certificates', certificatesRouter);
v1Router.use('/seed-labels', seedLabelsRouter);
v1Router.use('/seed-distributions', seedDistributionsRouter);
v1Router.use('/circulation-inspections', circulationInspectionsRouter);
v1Router.use('/reports', reportsRouter);
v1Router.use('/audit-logs', auditLogsRouter);
v1Router.use('/map', mapRouter);
v1Router.use('/notifications', notificationsRouter);
v1Router.use('/files', filesRouter);
v1Router.use('/regions', regionsRouter);
v1Router.use('/commodities', commoditiesRouter);
v1Router.use('/varieties', varietiesRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/roles', rolesRouter);
v1Router.use('/settings', settingsRouter);
v1Router.use('/public', publicRouter);
v1Router.use('/catalog', catalogAdminRouter);
