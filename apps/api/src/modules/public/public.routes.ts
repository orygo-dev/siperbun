import {
  PERMISSIONS,
  producerRegistrationSchema,
  publicListingCreateSchema,
  publicListingUpdateSchema,
} from '@siperbun/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { upload, uploadSingle } from '../../middlewares/upload';
import { requiredUuidParam, validateBody } from '../../middlewares/validate';
import { AppError } from '../../utils/errors';
import { AuthedRequest, success } from '../../utils/response';
import { publicService } from './public.service';

export const publicRouter = Router();

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak pendaftaran. Coba lagi nanti.',
  },
});

publicRouter.get('/commodities', async (_req, res, next) => {
  try {
    return success(res, await publicService.listCommodities());
  } catch (e) {
    next(e);
  }
});

publicRouter.get('/regions/kabupaten', async (_req, res, next) => {
  try {
    return success(res, await publicService.listKabupaten());
  } catch (e) {
    next(e);
  }
});

const registrationDocumentFields = [
  'businessLicense',
  'landOwnershipProof',
  'nurseryPhoto',
  'facilitiesPhoto',
  'sourceAgreement',
  'waterSourcePhoto',
  'businessRecommendation',
  'expertCertificate',
  'workforceList',
] as const;

const registrationUpload = upload.fields(
  registrationDocumentFields.map((name) => ({ name, maxCount: 1 })),
);

publicRouter.get('/map', async (req, res, next) => {
  try {
    const commodityId =
      typeof req.query.commodityId === 'string'
        ? req.query.commodityId
        : undefined;
    return success(res, await publicService.getMapSummary(commodityId));
  } catch (e) {
    next(e);
  }
});

publicRouter.get('/listings', async (req, res, next) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;
    const radiusKm = req.query.radiusKm
      ? Number(req.query.radiusKm)
      : undefined;
    const ageMin = req.query.ageMin ? Number(req.query.ageMin) : undefined;
    const ageMax = req.query.ageMax ? Number(req.query.ageMax) : undefined;
    return success(
      res,
      await publicService.listListings({
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        commodityId:
          typeof req.query.commodityId === 'string'
            ? req.query.commodityId
            : undefined,
        kabupatenId:
          typeof req.query.kabupatenId === 'string'
            ? req.query.kabupatenId
            : undefined,
        ageMin: Number.isFinite(ageMin) ? ageMin : undefined,
        ageMax: Number.isFinite(ageMax) ? ageMax : undefined,
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined,
        radiusKm: Number.isFinite(radiusKm) ? radiusKm : undefined,
      }),
    );
  } catch (e) {
    next(e);
  }
});

publicRouter.get('/listings/:id', async (req, res, next) => {
  try {
    return success(
      res,
      await publicService.getListing(requiredUuidParam(req.params.id)),
    );
  } catch (e) {
    next(e);
  }
});

publicRouter.get('/listings/:id/photos/:photoId', async (req, res, next) => {
  try {
    const image = await publicService.getListingPhotoAbsolute(
      requiredUuidParam(req.params.id),
      requiredUuidParam(req.params.photoId, 'photoId'),
    );
    if (!image) throw new AppError('Foto tidak ditemukan', 404);
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(image.originalName)}"`,
    );
    return res.sendFile(image.absolute);
  } catch (e) {
    next(e);
  }
});

publicRouter.get('/producers', async (req, res, next) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    return success(
      res,
      await publicService.listNearbyProducers({
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        kabupatenId:
          typeof req.query.kabupatenId === 'string'
            ? req.query.kabupatenId
            : undefined,
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined,
        limit: Number.isFinite(limit) ? limit : undefined,
      }),
    );
  } catch (e) {
    next(e);
  }
});

publicRouter.get('/producers/:id', async (req, res, next) => {
  try {
    return success(
      res,
      await publicService.getProducer(requiredUuidParam(req.params.id)),
    );
  } catch (e) {
    next(e);
  }
});

publicRouter.post(
  '/registrations',
  registrationLimiter,
  registrationUpload,
  async (req, res, next) => {
    try {
      const input = producerRegistrationSchema.parse(req.body);
      const uploaded = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
      const files = Object.fromEntries(
        registrationDocumentFields.map((name) => [name, uploaded[name]?.[0]]),
      );
      const data = await publicService.submitRegistration(input, files);
      return success(res, data, data.message, 201);
    } catch (e) {
      next(e);
    }
  },
);

/** Admin routes for catalog & registrations */
export const catalogAdminRouter = Router();

catalogAdminRouter.use(authenticate);

catalogAdminRouter.get(
  '/listings',
  requirePermission(PERMISSIONS.PRODUCER_VIEW),
  async (_req, res, next) => {
    try {
      return success(res, await publicService.adminListListings());
    } catch (e) {
      next(e);
    }
  },
);

catalogAdminRouter.post(
  '/listings',
  requirePermission(PERMISSIONS.PRODUCER_CREATE),
  validateBody(publicListingCreateSchema),
  async (req, res, next) => {
    try {
      return success(
        res,
        await publicService.adminCreateListing(req.body),
        'Listing berhasil dibuat',
        201,
      );
    } catch (e) {
      next(e);
    }
  },
);

catalogAdminRouter.put(
  '/listings/:id',
  requirePermission(PERMISSIONS.PRODUCER_UPDATE),
  validateBody(publicListingUpdateSchema),
  async (req, res, next) => {
    try {
      return success(
        res,
        await publicService.adminUpdateListing(
          requiredUuidParam(req.params.id),
          req.body,
        ),
        'Listing diperbarui',
      );
    } catch (e) {
      next(e);
    }
  },
);

catalogAdminRouter.delete(
  '/listings/:id',
  requirePermission(PERMISSIONS.PRODUCER_DELETE),
  async (req, res, next) => {
    try {
      await publicService.adminDeleteListing(requiredUuidParam(req.params.id));
      return success(res, null, 'Listing dihapus');
    } catch (e) {
      next(e);
    }
  },
);

catalogAdminRouter.post(
  '/listings/:id/photos',
  requirePermission(PERMISSIONS.PRODUCER_UPDATE),
  uploadSingle,
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError('File foto wajib diunggah', 400);
      const user = (req as AuthedRequest).user;
      const isCover = req.body?.isCover === 'true' || req.body?.isCover === true;
      const data = await publicService.adminUploadPhoto(
        requiredUuidParam(req.params.id),
        req.file,
        user?.id,
        { caption: req.body?.caption, isCover },
      );
      return success(res, data, 'Foto berhasil diunggah');
    } catch (e) {
      next(e);
    }
  },
);

catalogAdminRouter.delete(
  '/listings/:id/photos/:photoId',
  requirePermission(PERMISSIONS.PRODUCER_UPDATE),
  async (req, res, next) => {
    try {
      return success(
        res,
        await publicService.adminDeletePhoto(
          requiredUuidParam(req.params.id),
          requiredUuidParam(req.params.photoId, 'photoId'),
        ),
        'Foto dihapus',
      );
    } catch (e) {
      next(e);
    }
  },
);

catalogAdminRouter.get(
  '/listings/:id/photos/:photoId',
  requirePermission(PERMISSIONS.PRODUCER_VIEW),
  async (req, res, next) => {
    try {
      const image = await publicService.getAdminListingPhotoAbsolute(
        requiredUuidParam(req.params.id),
        requiredUuidParam(req.params.photoId, 'photoId'),
      );
      if (!image) throw new AppError('Foto tidak ditemukan', 404);
      res.setHeader('Content-Type', image.mimeType);
      res.setHeader('Cache-Control', 'private, max-age=600');
      return res.sendFile(image.absolute);
    } catch (e) {
      next(e);
    }
  },
);

catalogAdminRouter.get(
  '/registrations',
  requirePermission(PERMISSIONS.PRODUCER_VIEW),
  async (_req, res, next) => {
    try {
      return success(res, await publicService.adminListRegistrations());
    } catch (e) {
      next(e);
    }
  },
);

catalogAdminRouter.post(
  '/registrations',
  requirePermission(PERMISSIONS.PRODUCER_CREATE),
  registrationUpload,
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const input = producerRegistrationSchema.parse(req.body);
      const uploaded = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
      const files = Object.fromEntries(
        registrationDocumentFields.map((name) => [name, uploaded[name]?.[0]]),
      );
      const submitted = await publicService.submitRegistration(input, files);
      const approved = await publicService.adminUpdateRegistrationStatus(
        submitted.id,
        'APPROVED',
        user.id,
        'Ditambahkan langsung oleh Super Admin',
      );
      return success(
        res,
        approved,
        'Penangkar dan akun berhasil ditambahkan',
        201,
      );
    } catch (e) {
      next(e);
    }
  },
);

const registrationStatusSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  reviewNotes: z.string().max(1000).optional().nullable(),
});

catalogAdminRouter.patch(
  '/registrations/:id/status',
  requirePermission(PERMISSIONS.PRODUCER_UPDATE),
  validateBody(registrationStatusSchema),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user!;
      const data = await publicService.adminUpdateRegistrationStatus(
        requiredUuidParam(req.params.id),
        req.body.status,
        user.id,
        req.body.reviewNotes,
      );
      return success(res, data, 'Status pendaftaran diperbarui');
    } catch (e) {
      next(e);
    }
  },
);
