import type { Request } from 'express';
import { prisma } from '../config/database';

type WriteAuditInput = {
  userId?: string | null;
  action: string;
  module: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  req?: Request;
};

function toJson(value: unknown) {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, v) =>
        typeof v === 'bigint' ? Number(v) : v,
      ),
    );
  } catch {
    return null;
  }
}

export async function writeAudit(input: WriteAuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        module: input.module,
        entityId: input.entityId ?? null,
        beforeData: toJson(input.before) ?? undefined,
        afterData: toJson(input.after) ?? undefined,
        ipAddress:
          (input.req?.headers['x-forwarded-for'] as string | undefined)?.split(
            ',',
          )[0]?.trim() ??
          input.req?.ip ??
          null,
        userAgent: input.req?.headers['user-agent']?.slice(0, 500) ?? null,
      },
    });
  } catch {
    // Audit must not break primary write operations
  }
}
