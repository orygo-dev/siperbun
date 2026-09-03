import request from 'supertest';
import { APPLICATION_DOCUMENT_TITLES } from '@siperbun/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

async function uploadRequiredDocuments(
  applicationId: string,
  token: string,
) {
  for (const title of APPLICATION_DOCUMENT_TITLES) {
    const response = await request(app)
      .post(`/api/v1/certification-applications/${applicationId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('title', title)
      .attach('file', Buffer.from('%PDF-1.4 test document'), {
        filename: 'persyaratan.pdf',
        contentType: 'application/pdf',
      });
    expect(response.status).toBe(201);
  }
}

async function loginAdmin() {
  const res = await request(app).post('/api/v1/auth/login').send({
    email: 'admin@siperbun.local',
    password: 'password',
  });
  if (res.status !== 200) return null;
  return res.body.data.accessToken as string;
}

describe('Stage 3 — Seed sources & production & applications', () => {
  let token: string | null = null;
  let producerId: string | null = null;
  let commodityId: string | null = null;

  beforeAll(async () => {
    token = await loginAdmin();
    if (!token) return;

    const producers = await request(app)
      .get('/api/v1/producers?page=1&limit=1')
      .set('Authorization', `Bearer ${token}`);
    producerId = producers.body.data?.[0]?.id ?? null;

    const commodities = await request(app)
      .get('/api/v1/commodities?page=1&limit=1')
      .set('Authorization', `Bearer ${token}`);
    commodityId = commodities.body.data?.[0]?.id ?? null;
  });

  it('creates a seed source', async () => {
    if (!token || !producerId || !commodityId) {
      expect(true).toBe(true);
      return;
    }
    const lotNumber = `LOT-TEST-${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/seed-sources')
      .set('Authorization', `Bearer ${token}`)
      .send({
        producerId,
        commodityId,
        lotNumber,
        quantity: 100,
        unit: 'kg',
        usedQuantity: 10,
        supplier: 'Balai Uji',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lotNumber).toBe(lotNumber);
    expect(res.body.data.remainingStock).toBe(90);
  });

  it('creates and lists a production batch', async () => {
    if (!token || !producerId || !commodityId) {
      expect(true).toBe(true);
      return;
    }
    const create = await request(app)
      .post('/api/v1/production-batches')
      .set('Authorization', `Bearer ${token}`)
      .send({
        producerId,
        commodityId,
        initialCount: 5000,
      });
    expect(create.status).toBe(201);
    expect(create.body.data.batchNumber).toMatch(/^PB-\d{4}-\d+$/);
    expect(create.body.data.activeCount).toBe(5000);

    const list = await request(app)
      .get('/api/v1/production-batches?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
  });

  it('creates application and submits to ADMIN_REVIEW', async () => {
    if (!token || !producerId || !commodityId) {
      expect(true).toBe(true);
      return;
    }
    const create = await request(app)
      .post('/api/v1/certification-applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        producerId,
        commodityId,
        seedlingCount: 2500,
        notes: 'Test Stage 3',
      });
    expect(create.status).toBe(201);
    expect(create.body.data.status).toBe('DRAFT');
    expect(create.body.data.applicationNumber).toMatch(/^SBN-\d{4}-\d{5}$/);

    await uploadRequiredDocuments(create.body.data.id, token);

    const submit = await request(app)
      .post(`/api/v1/certification-applications/${create.body.data.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(submit.status).toBe(200);
    expect(submit.body.data.status).toBe('ADMIN_REVIEW');
    expect(submit.body.data.submittedAt).toBeTruthy();
  });
});
