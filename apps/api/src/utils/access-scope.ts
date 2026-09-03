export type AccessUser = {
  id: string;
  roles: string[];
  permissions: string[];
  producerId?: string | null;
};

export function isProducerUser(user: AccessUser) {
  return user.roles.includes('PENANGKAR');
}

export function isInspectorUser(user: AccessUser) {
  return user.roles.includes('PBT');
}

export function requireProducerId(user: AccessUser) {
  if (!user.producerId) {
    throw new AppError(
      'Akun Penangkar belum terhubung dengan data penangkar',
      403,
    );
  }
  return user.producerId;
}

export function canViewAllOperationalData(user: AccessUser) {
  return !isProducerUser(user) && !isInspectorUser(user);
}
import { AppError } from './errors';
