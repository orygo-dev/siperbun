import {
  applicationNotesSchema,
  applicationRevisionSchema,
  applicationStatusChangeSchema,
  assignInspectorSchema,
  certificationApplicationCreateSchema,
  certificationApplicationUpdateSchema,
  invoiceCreateSchema,
  paymentProofCreateSchema,
  paymentVerificationSchema,
  PERMISSIONS,
} from '@siperbun/shared';
import { Router } from 'express';
import {
  authenticate,
  requireAnyPermission,
  requirePermission,
} from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { uploadSingle } from '../../middlewares/upload';
import { AppError } from '../../utils/errors';
import type { AuthedRequest } from '../../utils/response';
import { success } from '../../utils/response';
import { certificationApplicationsService } from './certification-applications.service';
import { createInvoicePdf } from './invoice-pdf';

export const certificationApplicationsRouter = Router();

certificationApplicationsRouter.use(authenticate);

certificationApplicationsRouter.get(
  '/',
  requirePermission(PERMISSIONS.APPLICATION_VIEW),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const result = await certificationApplicationsService.list({
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        producerId: req.query.producerId as string | undefined,
        commodityId: req.query.commodityId as string | undefined,
      }, user);
      return success(
        res,
        result.items,
        'Daftar pengajuan berhasil dimuat',
        200,
        result.meta,
      );
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.post(
  '/',
  requirePermission(PERMISSIONS.APPLICATION_CREATE),
  validateBody(certificationApplicationCreateSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.create(
        req.body,
        req.user!,
      );
      return success(res, item, 'Pengajuan berhasil dibuat', 201);
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.APPLICATION_VIEW),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await certificationApplicationsService.getById(
        String(req.params.id),
        user,
      );
      return success(res, item, 'Detail pengajuan berhasil dimuat');
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.APPLICATION_CREATE),
  validateBody(certificationApplicationUpdateSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const item = await certificationApplicationsService.update(
        String(req.params.id),
        req.body,
        user,
      );
      return success(res, item, 'Pengajuan berhasil diperbarui');
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/submit',
  requireAnyPermission(
    PERMISSIONS.APPLICATION_CREATE,
    PERMISSIONS.APPLICATION_VERIFY,
  ),
  validateBody(applicationNotesSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.submit(
        String(req.params.id),
        req.user!,
        req.body.notes,
      );
      return success(res, item, 'Pengajuan berhasil diajukan');
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.get(
  '/:id/invoice',
  requirePermission(PERMISSIONS.APPLICATION_VIEW),
  async (req: AuthedRequest, res, next) => {
    try {
      const application = await certificationApplicationsService.getById(String(req.params.id), req.user!);
      if (!application.invoice) throw new AppError('Invoice belum tersedia', 404);
      const pdf = await createInvoicePdf({
        applicationNumber: application.applicationNumber,
        producerName: application.producer?.businessName ?? '-',
        commodityName: application.commodity?.name ?? '-',
        invoiceNumber: application.invoice.invoiceNumber,
        amount: application.invoice.amount,
        dueDate: new Date(application.invoice.dueDate),
        issuedAt: new Date(application.invoice.issuedAt),
        paymentInstructions: application.invoice.paymentInstructions,
        status: application.invoice.status,
      });
      const safeNumber = application.invoice.invoiceNumber.replace(/[^a-zA-Z0-9._-]+/g, '-');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${safeNumber}.pdf"`);
      return res.status(200).send(pdf);
    } catch (error) {
      next(error);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/documents',
  requirePermission(PERMISSIONS.APPLICATION_CREATE),
  (req, res, next) => {
    uploadSingle(req, res, (error) => {
      if (error) {
        return next(
          error instanceof AppError
            ? error
            : new AppError(
                error instanceof Error ? error.message : 'Gagal mengunggah file',
                400,
              ),
        );
      }
      next();
    });
  },
  async (req: AuthedRequest, res, next) => {
    try {
      if (!req.file) throw new AppError('File wajib diunggah', 400);
      const title = String(req.body?.title ?? '').trim();
      const item = await certificationApplicationsService.uploadDocument(
        String(req.params.id),
        title,
        req.file,
        req.user!,
      );
      return success(res, item, 'Dokumen pengajuan berhasil diunggah', 201);
    } catch (error) {
      next(error);
    }
  },
);

certificationApplicationsRouter.delete(
  '/:id/documents/:documentId',
  requirePermission(PERMISSIONS.APPLICATION_CREATE),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.removeDocument(
        String(req.params.id),
        String(req.params.documentId),
        req.user!,
      );
      return success(res, item, 'Dokumen pengajuan berhasil dihapus');
    } catch (error) {
      next(error);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/lhp-invoice',
  requirePermission(PERMISSIONS.APPLICATION_VERIFY),
  uploadSingle,
  async (req: AuthedRequest, res, next) => {
    try {
      if (!req.file) throw new AppError('File LHP wajib diunggah', 400);
      const parsed = invoiceCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('Data LHP dan invoice tidak valid', 400, {
          form: parsed.error.issues.map((issue) => issue.message),
        });
      }
      const item = await certificationApplicationsService.createLhpAndInvoice(
        String(req.params.id),
        parsed.data,
        req.file,
        req.user!,
      );
      return success(res, item, 'LHP dan invoice berhasil diterbitkan', 201);
    } catch (error) {
      next(error);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/payment-proof',
  requireAnyPermission(PERMISSIONS.APPLICATION_CREATE, PERMISSIONS.APPLICATION_VERIFY),
  uploadSingle,
  async (req: AuthedRequest, res, next) => {
    try {
      if (!req.file) throw new AppError('Bukti pembayaran wajib diunggah', 400);
      const parsed = paymentProofCreateSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError('Data pembayaran tidak valid', 400);
      const item = await certificationApplicationsService.uploadPaymentProof(
        String(req.params.id),
        parsed.data.notes,
        req.file,
        req.user!,
      );
      return success(res, item, 'Bukti pembayaran berhasil dikirim', 201);
    } catch (error) {
      next(error);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/verify-payment',
  requirePermission(PERMISSIONS.APPLICATION_VERIFY),
  validateBody(paymentVerificationSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.verifyPayment(
        String(req.params.id),
        req.body.decision,
        req.body.notes,
        req.user!,
      );
      return success(res, item, 'Pembayaran berhasil diverifikasi');
    } catch (error) {
      next(error);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/verify',
  requirePermission(PERMISSIONS.APPLICATION_VERIFY),
  validateBody(applicationNotesSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.verify(
        String(req.params.id),
        req.user!.id,
        req.body.notes,
      );
      return success(res, item, 'Pengajuan berhasil diverifikasi');
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/request-revision',
  requirePermission(PERMISSIONS.APPLICATION_VERIFY),
  validateBody(applicationRevisionSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.requestRevision(
        String(req.params.id),
        req.user!.id,
        req.body.notes,
      );
      return success(res, item, 'Permintaan perbaikan berhasil dikirim');
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/assign-inspector',
  requirePermission(PERMISSIONS.APPLICATION_ASSIGN),
  validateBody(assignInspectorSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.assignInspector(
        String(req.params.id),
        req.body,
        req.user!.id,
      );
      return success(res, item, 'PBT berhasil ditugaskan');
    } catch (e) {
      next(e);
    }
  },
);

certificationApplicationsRouter.post(
  '/:id/change-status',
  requirePermission(PERMISSIONS.APPLICATION_VERIFY),
  validateBody(applicationStatusChangeSchema),
  async (req: AuthedRequest, res, next) => {
    try {
      const item = await certificationApplicationsService.changeStatus(
        String(req.params.id),
        req.body,
        req.user!.id,
      );
      return success(res, item, 'Status pengajuan berhasil diubah');
    } catch (e) {
      next(e);
    }
  },
);
