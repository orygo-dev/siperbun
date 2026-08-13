import multer from 'multer';
import type { RequestHandler } from 'express';
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE } from '../utils/storage';
import { AppError } from '../utils/errors';

const storage = multer.memoryStorage();

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  if (
    ALLOWED_MIME_TYPES.includes(
      file.mimetype as (typeof ALLOWED_MIME_TYPES)[number],
    )
  ) {
    cb(null, true);
    return;
  }
  cb(
    new AppError(
      'Tipe file tidak diizinkan. Gunakan JPEG, PNG, WebP, atau PDF',
      400,
    ),
  );
}

export const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter,
});

export const uploadSingle: RequestHandler = upload.single('file');
