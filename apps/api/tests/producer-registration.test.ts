import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();
const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const pdf = Buffer.from('%PDF-1.4\n% test registration document');

const documentFields = [
  'businessLicense',
  'landOwnershipProof',
  'sourceAgreement',
  'businessRecommendation',
  'expertCertificate',
  'workforceList',
] as const;
const photoFields = [
  'nurseryPhoto',
  'facilitiesPhoto',
  'waterSourcePhoto',
] as const;

describe('Producer registration end-to-end', () => {
  let adminToken = '';
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `registration-${suffix}@example.com`;
  const password = 'BenihAman123';
  let registrationId = '';
  let producerId = '';
  let nurseryId = '';
  let officeKabupatenId = '';
  let nurseryKabupatenId = '';

  beforeAll(async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@siperbun.local',
      password: 'password',
    });
    expect(login.status).toBe(200);
    adminToken = login.body.data.accessToken;
    const regions = await request(app).get('/api/v1/public/regions/kabupaten');
    expect(regions.status).toBe(200);
    expect(regions.body.data.length).toBeGreaterThanOrEqual(2);
    officeKabupatenId = regions.body.data[0].id;
    nurseryKabupatenId = regions.body.data[1].id;
  });

  it('requires all registration documents', async () => {
    const response = await request(app)
      .post('/api/v1/public/registrations')
      .field('email', `missing-${email}`)
      .field('password', password)
      .field('producerName', 'Penangkar Tanpa Dokumen')
      .field('organizationName', 'Usaha Tanpa Dokumen')
      .field('phone', '081234567890')
      .field('officeAddress', 'Jalan Kantor Nomor 10 Banjarbaru')
      .field('kabupatenId', officeKabupatenId)
      .field('nurseryAddress', 'Jalan Kebun Nomor 20 Banjarbaru')
      .field('nurseryKabupatenId', nurseryKabupatenId)
      .field('landOwnershipStatus', 'OWNED');

    expect(response.status).toBe(422);
    expect(response.body.message).toContain('dokumen');
  });

  it('stores account data, nursery data, and nine files without exposing password hash', async () => {
    let submission = request(app)
      .post('/api/v1/public/registrations')
      .field('email', email)
      .field('password', password)
      .field('producerName', 'Penangkar Integrasi')
      .field('organizationName', `CV Integrasi ${suffix}`)
      .field('phone', '081234567890')
      .field('officeAddress', 'Jalan Kantor Nomor 10 Banjarbaru')
      .field('kabupatenId', officeKabupatenId)
      .field('nurseryAddress', 'Jalan Kebun Nomor 20 Banjarbaru')
      .field('nurseryKabupatenId', nurseryKabupatenId)
      .field('landOwnershipStatus', 'RENTED');

    for (const field of documentFields) {
      submission = submission.attach(field, pdf, {
        filename: `${field}.pdf`,
        contentType: 'application/pdf',
      });
    }
    for (const field of photoFields) {
      submission = submission.attach(field, png, {
        filename: `${field}.png`,
        contentType: 'image/png',
      });
    }

    const response = await submission;
    expect(response.status).toBe(201);
    registrationId = response.body.data.id;

    const list = await request(app)
      .get('/api/v1/catalog/registrations')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    const row = list.body.data.find((item: { id: string }) => item.id === registrationId);
    expect(row).toBeTruthy();
    expect(row.passwordHash).toBeUndefined();
    expect(row.documents).toHaveLength(9);
    expect(row.nurseryAddress).toContain('Jalan Kebun');
    expect(row.kabupaten.id).toBe(officeKabupatenId);
    expect(row.nurseryKabupaten.id).toBe(nurseryKabupatenId);
    expect(row.landOwnershipStatus).toBe('RENTED');
  });

  it('approval creates a synchronized producer, nursery, documents, and login account', async () => {
    const approval = await request(app)
      .patch(`/api/v1/catalog/registrations/${registrationId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', reviewNotes: 'Dokumen lengkap' });

    expect(approval.status).toBe(200);
    expect(approval.body.data.createdProducer.id).toBeTruthy();
    producerId = approval.body.data.createdProducer.id;

    const producer = await request(app)
      .get(`/api/v1/producers/${approval.body.data.createdProducer.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(producer.status).toBe(200);
    expect(producer.body.data.email).toBe(email);
    expect(producer.body.data.nurseryAddress).toContain('Jalan Kebun');
    expect(producer.body.data.landOwnershipStatus).toBe('RENTED');
    expect(producer.body.data.nurseries).toHaveLength(1);
    nurseryId = producer.body.data.nurseries[0].id;
    expect(producer.body.data.nurseries[0].address).toContain('Jalan Kebun');
    expect(producer.body.data.kabupaten.id).toBe(officeKabupatenId);
    expect(producer.body.data.nurseries[0].region.id).toBe(nurseryKabupatenId);
    expect(producer.body.data.documents).toHaveLength(9);

    const login = await request(app).post('/api/v1/auth/login').send({
      email,
      password,
    });
    expect(login.status).toBe(200);
    expect(login.body.data.user.producerId).toBe(producer.body.data.id);
    expect(login.body.data.user.roles).toContain('PENANGKAR');
  });

  it('lets Super Admin create a producer with the complete registration form', async () => {
    const adminEmail = `admin-created-${suffix}@example.com`;
    let submission = request(app)
      .post('/api/v1/catalog/registrations')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('email', adminEmail)
      .field('password', password)
      .field('producerName', 'Penangkar Buatan Admin')
      .field('organizationName', `CV Admin ${suffix}`)
      .field('phone', '081298765432')
      .field('officeAddress', 'Jalan Kantor Admin')
      .field('kabupatenId', officeKabupatenId)
      .field('nurseryAddress', 'Jalan Pembibitan Admin')
      .field('nurseryKabupatenId', nurseryKabupatenId)
      .field('landOwnershipStatus', 'OWNED');

    for (const field of documentFields) {
      submission = submission.attach(field, pdf, {
        filename: `${field}.pdf`,
        contentType: 'application/pdf',
      });
    }
    for (const field of photoFields) {
      submission = submission.attach(field, png, {
        filename: `${field}.png`,
        contentType: 'image/png',
      });
    }

    const response = await submission;
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('APPROVED');
    expect(response.body.data.createdProducer.id).toBeTruthy();

    const login = await request(app).post('/api/v1/auth/login').send({
      email: adminEmail,
      password,
    });
    expect(login.status).toBe(200);
    expect(login.body.data.user.roles).toContain('PENANGKAR');
  });

  it('keeps the producer summary synchronized when its primary nursery changes', async () => {
    const update = await request(app)
      .put(`/api/v1/nursery-locations/${nurseryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        address: 'Alamat pembibitan hasil pembaruan',
        landOwnershipStatus: 'OWNED',
      });
    expect(update.status).toBe(200);

    const producer = await request(app)
      .get(`/api/v1/producers/${producerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(producer.body.data.nurseryAddress).toBe('Alamat pembibitan hasil pembaruan');
    expect(producer.body.data.landOwnershipStatus).toBe('OWNED');
  });
});
