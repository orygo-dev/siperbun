import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from './errors';

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function detectFileMimeType(buffer: Buffer): AllowedMimeType | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  ) {
    return 'application/pdf';
  }
  return null;
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
}

export async function ensureStorageDir(...parts: string[]) {
  const relativeDir = path.join(...parts);
  const dir = resolveStoragePath(relativeDir);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function resolveStoragePath(relativePath: string) {
  const storageRoot = path.resolve(process.cwd(), env.storagePath);
  const candidate = path.resolve(storageRoot, relativePath);
  const relative = path.relative(storageRoot, candidate);
  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new AppError('Path penyimpanan tidak valid', 400);
  }
  return candidate;
}

export async function saveMulterFile(
  file: Express.Multer.File,
  opts: {
    /** Relative directory under storage root, e.g. inspections/2026/{id} */
    relativeDir?: string;
    /** Builds inspections/{year}/{inspectionId} when relativeDir omitted */
    inspectionId?: string;
    uploadedById?: string | null;
  },
) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype as AllowedMimeType)) {
    throw new AppError(
      'Tipe file tidak diizinkan. Gunakan JPEG, PNG, WebP, atau PDF',
      400,
    );
  }

  const buffer =
    file.buffer ??
    (file.path ? await fs.readFile(file.path) : null);
  if (!buffer) {
    throw new AppError('File tidak valid', 400);
  }

  if (buffer.length > MAX_UPLOAD_SIZE) {
    throw new AppError('Ukuran file maksimal 10MB', 400);
  }

  const detectedMimeType = detectFileMimeType(buffer);
  if (!detectedMimeType || detectedMimeType !== file.mimetype) {
    throw new AppError('Isi file tidak cocok dengan tipe file yang dikirim', 400);
  }

  let relativeDir = opts.relativeDir;
  if (!relativeDir && opts.inspectionId) {
    const year = String(new Date().getFullYear());
    relativeDir = path.join('inspections', year, opts.inspectionId);
  }
  if (!relativeDir) {
    throw new AppError('Direktori penyimpanan wajib diisi', 500);
  }

  const ext = mimeToExt(detectedMimeType);
  const storageName = `${uuidv4()}${ext}`;
  const dir = await ensureStorageDir(relativeDir);
  const absolutePath = path.join(dir, storageName);
  await fs.writeFile(absolutePath, buffer);

  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const relativePath = path
    .join(relativeDir, storageName)
    .split(path.sep)
    .join('/');

  const stored = await prisma.storedFile.create({
    data: {
      originalName: file.originalname,
      storageName,
      mimeType: detectedMimeType,
      size: BigInt(buffer.length),
      sha256,
      path: relativePath,
      uploadedById: opts.uploadedById ?? null,
    },
  });

  return {
    ...stored,
    size: Number(stored.size),
  };
}

/** Save certificate scan under storage/certificates/{year}/{applicationNumber}/{uuid}.ext */
export async function saveCertificateScanFile(
  file: Express.Multer.File,
  opts: {
    applicationNumber: string;
    uploadedById?: string | null;
  },
) {
  const year = String(new Date().getFullYear());
  const safeAppNo = opts.applicationNumber.replace(/[^\w.-]+/g, '_');
  return saveMulterFile(file, {
    relativeDir: path.join('certificates', year, safeAppNo),
    uploadedById: opts.uploadedById,
  });
}

export function serializeStoredFile(file: {
  id: string;
  originalName: string;
  storageName: string;
  mimeType: string;
  size: bigint | number;
  sha256: string;
  path: string;
  uploadedById?: string | null;
  createdAt?: Date;
}) {
  return {
    id: file.id,
    originalName: file.originalName,
    storageName: file.storageName,
    mimeType: file.mimeType,
    size: Number(file.size),
    sha256: file.sha256,
    path: file.path,
    uploadedById: file.uploadedById ?? null,
    createdAt: file.createdAt,
    url: `/api/v1/files/${file.id}`,
  };
}
