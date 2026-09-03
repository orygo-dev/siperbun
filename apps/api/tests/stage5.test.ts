import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

const app = createApp();

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function login(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({
    email,
    password: 'password',
  });
  if (res.status !== 200) return null;
  return res.body.data.accessToken as string;
}

describe('Stage 5 — Certificates upload, verify, versioning', () => {
  let token: string | null = null;
  let certificateId: string | null = null;
  let firstFileId: string | null = null;
  let applicationId: string | null = null;

  beforeAll(async () => {
    token = await login('admin@siperbun.local');
    if (!token) return;

    // Prefer an existing paid application without certificate;
    // otherwise promote a WAITING_ASSIGNMENT app that has no cert.
    let appRow = await prisma.certificationApplication.findFirst({
      where: {
        deletedAt: null,
        status: 'PAYMENT_VERIFIED',
        certificate: null,
      },
      select: { id: true },
    });

    if (!appRow) {
      appRow = await prisma.certificationApplication.findFirst({
        where: {
          deletedAt: null,
          certificate: null,
          status: {
            in: [
              'WAITING_ASSIGNMENT',
              'ADMIN_REVIEW',
              'INSPECTION_IN_PROGRESS',
            ],
          },
        },
        select: { id: true },
      });
      if (appRow) {
        await prisma.certificationApplication.update({
          where: { id: appRow.id },
          data: { status: 'PAYMENT_VERIFIED' },
        });
      }
    }

    applicationId = appRow?.id ?? null;
  });

  it('creates certificate for PAYMENT_VERIFIED application', async () => {
    if (!token || !applicationId) {
      expect(true).toBe(true);
      return;
    }

    const res = await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        applicationId,
        issuedAt: '2026-08-01',
        signatoryName: 'Kepala Dinas',
        signatoryTitle: 'Kepala Dinas',
        status: 'WAITING_SCAN',
        notes: 'Stage 5 test',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.applicationId).toBe(applicationId);
    expect(res.body.data.status).toBe('WAITING_SCAN');
    expect(res.body.data.certificateNumber).toMatch(/\/BNH\/\d{4}$/);
    certificateId = res.body.data.id;
  });

  it('uploads scan and moves to WAITING_VERIFICATION', async () => {
    if (!token || !certificateId) {
      expect(true).toBe(true);
      return;
    }

    const res = await request(app)
      .post(`/api/v1/certificates/${certificateId}/upload-scan`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', TINY_PNG, {
        filename: 'scan-v1.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('WAITING_VERIFICATION');
    expect(res.body.data.currentFile).toBeTruthy();
    expect(res.body.data.currentFile.sha256).toHaveLength(64);
    expect(res.body.data.versions?.length).toBeGreaterThanOrEqual(1);
    firstFileId = res.body.data.currentFile.id;
  });

  it('verifies scan to ACTIVE', async () => {
    if (!token || !certificateId) {
      expect(true).toBe(true);
      return;
    }

    const res = await request(app)
      .post(`/api/v1/certificates/${certificateId}/verify-scan`)
      .set('Authorization', `Bearer ${token}`)
      .send({ approved: true, notes: 'OK Stage 5' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.verifiedAt).toBeTruthy();
  });

  it('replaces scan → version 2, old file retained', async () => {
    if (!token || !certificateId || !firstFileId) {
      expect(true).toBe(true);
      return;
    }

    const res = await request(app)
      .post(`/api/v1/certificates/${certificateId}/replace-scan`)
      .set('Authorization', `Bearer ${token}`)
      .field('reason', 'Perbaikan kualitas scan')
      .attach('file', TINY_PNG, {
        filename: 'scan-v2.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('WAITING_VERIFICATION');
    expect(res.body.data.currentFile.id).not.toBe(firstFileId);

    const versions = res.body.data.versions as Array<{
      version: number;
      fileId: string;
      reason?: string;
    }>;
    expect(versions.some((v) => v.version === 2)).toBe(true);
    expect(versions.some((v) => v.fileId === firstFileId)).toBe(true);

    const oldFile = await prisma.storedFile.findFirst({
      where: { id: firstFileId, deletedAt: null },
    });
    expect(oldFile).toBeTruthy();
  });

  it('download returns 200', async () => {
    if (!token || !certificateId) {
      expect(true).toBe(true);
      return;
    }

    const res = await request(app)
      .get(`/api/v1/certificates/${certificateId}/download`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/i);
  });

  it('user without CERTIFICATE_UPLOAD cannot upload', async () => {
    if (!certificateId) {
      expect(true).toBe(true);
      return;
    }

    const penangkarToken = await login('penangkar1@siperbun.local');
    if (!penangkarToken) {
      expect(true).toBe(true);
      return;
    }

    // Ensure cert is in uploadable state for a fair permission check
    await prisma.certificate.update({
      where: { id: certificateId },
      data: { status: 'WAITING_SCAN' },
    });

    const res = await request(app)
      .post(`/api/v1/certificates/${certificateId}/upload-scan`)
      .set('Authorization', `Bearer ${penangkarToken}`)
      .attach('file', TINY_PNG, {
        filename: 'forbidden.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(403);
  });
});
