import {
  APPLICATION_DOCUMENT_TITLES,
  REFRESH_COOKIE_NAME,
} from '@siperbun/shared';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

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

async function login(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({
    email,
    password: 'password',
  });
  expect(res.status).toBe(200);
  expect(res.body.data.accessToken).toBeTruthy();
  return {
    accessToken: res.body.data.accessToken as string,
    cookies: res.headers['set-cookie'] as string[] | string | undefined,
  };
}

function cookieHeader(cookies: string[] | string | undefined) {
  if (!cookies) return '';
  return Array.isArray(cookies) ? cookies.join('; ') : cookies;
}

describe('Stage 7 — Auth refresh, dashboard, permissions, producer, app verify, files', () => {
  let adminToken: string;
  let penangkarToken: string;
  let producerId: string;
  let commodityId: string;

  beforeAll(async () => {
    const admin = await login('admin@siperbun.local');
    adminToken = admin.accessToken;

    const penangkar = await login('penangkar1@siperbun.local');
    penangkarToken = penangkar.accessToken;

    const producer = await prisma.producer.findFirst({
      where: { deletedAt: null },
      select: { id: true },
    });
    expect(producer?.id).toBeTruthy();
    producerId = producer!.id;

    const commodity = await prisma.commodity.findFirst({
      where: { deletedAt: null },
      select: { id: true },
    });
    expect(commodity?.id).toBeTruthy();
    commodityId = commodity!.id;
  });

  it('refresh token rotates access token and /auth/me works', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@siperbun.local',
      password: 'password',
    });
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeTruthy();
    expect(cookieHeader(cookies)).toContain(REFRESH_COOKIE_NAME);

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookieHeader(cookies));

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    const newToken = refreshRes.body.data.accessToken as string;
    expect(newToken).toBeTruthy();

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${newToken}`);

    expect(me.status).toBe(200);
    expect(me.body.success).toBe(true);
    expect(me.body.data.email).toBe('admin@siperbun.local');
  });

  it('GET /dashboard/summary requires auth', async () => {
    const unauth = await request(app).get('/api/v1/dashboard/summary');
    expect(unauth.status).toBe(401);

    const auth = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auth.status).toBe(200);
    expect(auth.body.success).toBe(true);
    expect(auth.body.data).toBeTruthy();
  });

  it('GET /users as penangkar returns 403', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${penangkarToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('updates producer businessName and verifies via GET', async () => {
    const stamp = Date.now();
    const businessName = `CV Stage7 Update ${stamp}`;

    const created = await request(app)
      .post('/api/v1/producers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        businessName: `CV Stage7 Create ${stamp}`,
        ownerName: 'Pemilik Stage7',
        businessType: 'CV',
        phone: '081234567890',
      });

    expect(created.status).toBe(201);
    const id = created.body.data.id as string;

    const updated = await request(app)
      .put(`/api/v1/producers/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ businessName });

    expect(updated.status).toBe(200);
    expect(updated.body.data.businessName).toBe(businessName);

    const got = await request(app)
      .get(`/api/v1/producers/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(got.status).toBe(200);
    expect(got.body.data.businessName).toBe(businessName);
  });

  it('application DRAFT → submit → verify reaches DOCUMENT_COMPLETE path', async () => {
    const create = await request(app)
      .post('/api/v1/certification-applications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        producerId,
        commodityId,
        seedlingCount: 1200,
        notes: 'Stage 7 verify flow',
      });

    expect(create.status).toBe(201);
    expect(create.body.data.status).toBe('DRAFT');
    const appId = create.body.data.id as string;

    await uploadRequiredDocuments(appId, adminToken);

    const submit = await request(app)
      .post(`/api/v1/certification-applications/${appId}/submit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Diajukan Stage 7' });

    expect(submit.status).toBe(200);
    expect(['SUBMITTED', 'ADMIN_REVIEW']).toContain(submit.body.data.status);

    const verify = await request(app)
      .post(`/api/v1/certification-applications/${appId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Dokumen lengkap Stage 7' });

    expect(verify.status).toBe(200);
    // verify advances through DOCUMENT_COMPLETE into WAITING_ASSIGNMENT
    expect(verify.body.data.status).toBe('WAITING_ASSIGNMENT');

    const history = await prisma.applicationStatusHistory.findMany({
      where: { applicationId: appId },
      select: { toStatus: true },
      orderBy: { createdAt: 'asc' },
    });
    const statuses = history.map((h) => h.toStatus);
    expect(statuses).toContain('DOCUMENT_COMPLETE');
  });

  it('GET /files/:id without auth is 401; with auth 200 or 404', async () => {
    const unauth = await request(app).get(
      '/api/v1/files/00000000-0000-4000-8000-000000000001',
    );
    expect(unauth.status).toBe(401);

    const cert = await prisma.certificate.findFirst({
      where: { deletedAt: null, currentFileId: { not: null } },
      select: { currentFileId: true },
    });
    const fileId =
      cert?.currentFileId ??
      (
        await prisma.storedFile.findFirst({
          where: { deletedAt: null },
          select: { id: true },
        })
      )?.id ??
      '00000000-0000-4000-8000-000000000001';

    const auth = await request(app)
      .get(`/api/v1/files/${fileId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 404]).toContain(auth.status);
  });
});
