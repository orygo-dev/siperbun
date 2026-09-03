import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

async function login(email: string) {
  const response = await request(app).post('/api/v1/auth/login').send({
    email,
    password: 'password',
  });
  expect(response.status).toBe(200);
  return response.body.data as {
    accessToken: string;
    user: { id: string; producerId?: string | null };
  };
}

describe('Certification tenant isolation', () => {
  let producerToken = '';
  let producerId = '';
  let adminToken = '';

  beforeAll(async () => {
    const producer = await login('penangkar1@siperbun.local');
    producerToken = producer.accessToken;
    producerId = producer.user.producerId ?? '';
    adminToken = (await login('admin@siperbun.local')).accessToken;
  });

  it('limits applications, production batches, nurseries and certificates to the logged producer', async () => {
    const endpoints = [
      '/api/v1/certification-applications?limit=100',
      '/api/v1/production-batches?limit=100',
      '/api/v1/nursery-locations?limit=100',
      '/api/v1/certificates?limit=100',
    ];

    for (const endpoint of endpoints) {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${producerToken}`);
      expect(response.status).toBe(200);
      expect(
        response.body.data.every(
          (item: { producerId: string }) => item.producerId === producerId,
        ),
      ).toBe(true);
    }
  });

  it('does not expose another producer application or certificate by id', async () => {
    const adminApplications = await request(app)
      .get(`/api/v1/certification-applications?limit=100`)
      .set('Authorization', `Bearer ${adminToken}`);
    const foreignApplication = adminApplications.body.data.find(
      (item: { producerId: string }) => item.producerId !== producerId,
    );
    expect(foreignApplication).toBeTruthy();

    const applicationResponse = await request(app)
      .get(`/api/v1/certification-applications/${foreignApplication.id}`)
      .set('Authorization', `Bearer ${producerToken}`);
    expect(applicationResponse.status).toBe(404);

    const adminCertificates = await request(app)
      .get('/api/v1/certificates?limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    const foreignCertificate = adminCertificates.body.data.find(
      (item: { producerId: string }) => item.producerId !== producerId,
    );
    if (foreignCertificate) {
      const certificateResponse = await request(app)
        .get(`/api/v1/certificates/${foreignCertificate.id}`)
        .set('Authorization', `Bearer ${producerToken}`);
      expect(certificateResponse.status).toBe(404);
    }
  });

  it('limits findings to applications owned by the logged producer', async () => {
    const response = await request(app)
      .get('/api/v1/findings?limit=100')
      .set('Authorization', `Bearer ${producerToken}`);
    expect(response.status).toBe(200);
    expect(
      response.body.data.every(
        (item: { application: { producer: { id: string } } }) =>
          item.application.producer.id === producerId,
      ),
    ).toBe(true);

    const adminResponse = await request(app)
      .get('/api/v1/findings?limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    const foreignFinding = adminResponse.body.data.find(
      (item: { application: { producer: { id: string } } }) =>
        item.application.producer.id !== producerId,
    );
    if (!foreignFinding) return;

    const detailResponse = await request(app)
      .get(`/api/v1/findings/${foreignFinding.id}`)
      .set('Authorization', `Bearer ${producerToken}`);
    expect(detailResponse.status).toBe(404);
  });

  it('rejects a producer attempting to create an application for another producer', async () => {
    const adminApplications = await request(app)
      .get('/api/v1/certification-applications?limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    const foreignApplication = adminApplications.body.data.find(
      (item: { producerId: string }) => item.producerId !== producerId,
    );
    expect(foreignApplication).toBeTruthy();

    const response = await request(app)
      .post('/api/v1/certification-applications')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({
        producerId: foreignApplication.producerId,
        commodityId: foreignApplication.commodityId,
        seedlingCount: 1,
      });
    expect(response.status).toBe(403);
  });

  it('rejects a foreign production batch even when producerId is valid', async () => {
    const adminBatches = await request(app)
      .get('/api/v1/production-batches?limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    const foreignBatch = adminBatches.body.data.find(
      (item: { producerId: string }) => item.producerId !== producerId,
    );
    expect(foreignBatch).toBeTruthy();

    const response = await request(app)
      .post('/api/v1/certification-applications')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({
        producerId,
        batchId: foreignBatch.id,
        commodityId: foreignBatch.commodityId,
        seedlingCount: 1,
      });
    expect(response.status).toBe(400);
  });

  it('limits PBT inspection detail to the assigned inspector', async () => {
    const pbt = await login('ahmad@siperbun.local');
    const adminInspections = await request(app)
      .get('/api/v1/field-inspections?limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    const foreignInspection = adminInspections.body.data.find(
      (item: { inspectorId: string }) => item.inspectorId !== pbt.user.id,
    );
    if (!foreignInspection) return;

    const response = await request(app)
      .get(`/api/v1/field-inspections/${foreignInspection.id}`)
      .set('Authorization', `Bearer ${pbt.accessToken}`);
    expect(response.status).toBe(404);
  });
});
