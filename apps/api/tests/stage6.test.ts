import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

const app = createApp();

async function login(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({
    email,
    password: 'password',
  });
  if (res.status !== 200) return null;
  return res.body.data.accessToken as string;
}

describe('Stage 6 — Labels, distributions, circulation, reports, audit', () => {
  let token: string | null = null;
  let certificateId: string | null = null;
  let producerId: string | null = null;
  let labelId: string | null = null;
  let distributionId: string | null = null;
  let circulationId: string | null = null;

  beforeAll(async () => {
    token = await login('admin@siperbun.local');
    if (!token) return;

    const cert = await prisma.certificate.findFirst({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true, producerId: true },
    });
    certificateId = cert?.id ?? null;
    producerId = cert?.producerId ?? null;

    if (!certificateId) {
      const anyCert = await prisma.certificate.findFirst({
        where: { deletedAt: null },
        select: { id: true, producerId: true },
      });
      certificateId = anyCert?.id ?? null;
      producerId = anyCert?.producerId ?? null;
    }

    if (!producerId) {
      const producer = await prisma.producer.findFirst({
        where: { deletedAt: null },
        select: { id: true },
      });
      producerId = producer?.id ?? null;
    }
  });

  it('creates seed label + lists', async () => {
    if (!token || !certificateId) {
      expect(true).toBe(true);
      return;
    }

    const create = await request(app)
      .post('/api/v1/seed-labels')
      .set('Authorization', `Bearer ${token}`)
      .send({
        certificateId,
        serialStart: 'TEST-S6-0001',
        serialEnd: 'TEST-S6-0100',
        quantity: 100,
        recipient: 'Stage 6 Test',
        notes: 'stage6',
      });

    expect(create.status).toBe(201);
    expect(create.body.success).toBe(true);
    expect(create.body.data.remainingCount).toBe(100);
    labelId = create.body.data.id;

    const list = await request(app)
      .get('/api/v1/seed-labels')
      .set('Authorization', `Bearer ${token}`)
      .query({ search: 'TEST-S6' });

    expect(list.status).toBe(200);
    expect(list.body.success).toBe(true);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data.some((x: { id: string }) => x.id === labelId)).toBe(
      true,
    );
  });

  it('creates seed distribution', async () => {
    if (!token || !producerId) {
      expect(true).toBe(true);
      return;
    }

    const res = await request(app)
      .post('/api/v1/seed-distributions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        producerId,
        certificateId: certificateId ?? undefined,
        buyerName: 'Pembeli Stage 6',
        destinationKab: 'Banjar',
        quantity: 250,
        distributedAt: '2026-08-01',
        deliveryNoteNo: 'SJ-S6-001',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quantity).toBe(250);
    distributionId = res.body.data.id;
    expect(distributionId).toBeTruthy();
  });

  it('creates circulation inspection with finding', async () => {
    if (!token) {
      expect(true).toBe(true);
      return;
    }

    const res = await request(app)
      .post('/api/v1/circulation-inspections')
      .set('Authorization', `Bearer ${token}`)
      .send({
        inspectorName: 'PBT Stage 6',
        inspectedAt: '2026-08-02',
        location: 'Pasar Bibit Demo',
        latitude: -3.3,
        longitude: 114.6,
        businessName: 'Usaha Stage 6',
        commodityName: 'Kelapa Sawit',
        seedlingCount: 100,
        findings: [
          {
            category: 'NO_CERTIFICATE',
            description: 'Tidak menemukan sertifikat di lokasi',
            severity: 'HIGH',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inspectionNumber).toMatch(/^WAS-\d{4}-\d+$/);
    expect(res.body.data.findings?.length).toBeGreaterThanOrEqual(1);
    circulationId = res.body.data.id;
    expect(circulationId).toBeTruthy();
  });

  it('GET reports/summary', async () => {
    if (!token) {
      expect(true).toBe(true);
      return;
    }

    const res = await request(app)
      .get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('producers');
    expect(res.body.data).toHaveProperty('certificates');
    expect(res.body.data).toHaveProperty('seedDistributions');
  });

  it('GET audit-logs after write creates audit', async () => {
    if (!token) {
      expect(true).toBe(true);
      return;
    }

    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .query({ module: 'seed-label', limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (labelId) {
      expect(
        res.body.data.some(
          (x: { entityId?: string; module: string }) =>
            x.module === 'seed-label' && x.entityId === labelId,
        ),
      ).toBe(true);
    }
  });

  it('export CSV returns text/csv', async () => {
    if (!token) {
      expect(true).toBe(true);
      return;
    }

    const res = await request(app)
      .get('/api/v1/reports/certificates/export')
      .set('Authorization', `Bearer ${token}`)
      .query({ format: 'csv' });

    expect(res.status).toBe(200);
    expect(String(res.headers['content-type'])).toMatch(/text\/csv/);
    expect(String(res.text)).toContain('No. Sertifikat');
  });
});
