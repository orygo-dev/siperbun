import { REPORT_TYPES, PERMISSIONS } from '@siperbun/shared';
import { Router } from 'express';
import {
  authenticate,
  requirePermission,
} from '../../middlewares/auth';
import { AppError } from '../../utils/errors';
import { success } from '../../utils/response';
import { reportsService, toCsv, type ReportFilters } from './reports.service';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

function parseFilters(query: Record<string, unknown>): ReportFilters {
  return {
    dateFrom: query.dateFrom as string | undefined,
    dateTo: query.dateTo as string | undefined,
    year: query.year as string | undefined,
    regionId: (query.regionId ?? query.kabupatenId) as string | undefined,
    kabupatenId: query.kabupatenId as string | undefined,
    commodityId: query.commodityId as string | undefined,
    producerId: query.producerId as string | undefined,
    status: query.status as string | undefined,
    page: query.page ? Number(query.page) : 1,
    limit: query.limit ? Number(query.limit) : 50,
  };
}

reportsRouter.get(
  '/summary',
  requirePermission(PERMISSIONS.REPORT_VIEW),
  async (req, res, next) => {
    try {
      const data = await reportsService.summary(parseFilters(req.query));
      return success(res, data, 'Ringkasan laporan berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

for (const type of REPORT_TYPES) {
  reportsRouter.get(
    `/${type}`,
    requirePermission(PERMISSIONS.REPORT_VIEW),
    async (req, res, next) => {
      try {
        const result = await reportsService.getByType(
          type,
          parseFilters(req.query),
        );
        return success(
          res,
          { items: result.items, columns: result.columns },
          'Laporan berhasil dimuat',
          200,
          result.meta,
        );
      } catch (e) {
        next(e);
      }
    },
  );
}

reportsRouter.get(
  '/:type/export',
  requirePermission(PERMISSIONS.REPORT_EXPORT),
  async (req, res, next) => {
    try {
      const type = String(req.params.type);
      if (!(REPORT_TYPES as readonly string[]).includes(type)) {
        throw new AppError('Jenis laporan tidak dikenal', 404);
      }
      const format = String(req.query.format ?? 'csv');
      if (format !== 'csv') {
        throw new AppError('Format ekspor hanya mendukung csv', 400);
      }

      const result = await reportsService.getByType(
        type,
        parseFilters({ ...req.query, page: 1, limit: 5000 }),
      );
      const csv = toCsv(result.columns, result.items as Array<Record<string, unknown>>);
      const filename = `laporan-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.status(200).send(csv);
    } catch (e) {
      next(e);
    }
  },
);
