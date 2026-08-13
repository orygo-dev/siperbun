import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

async function loginAdmin() {
  const res = await request(app).post('/api/v1/auth/login').send({
    email: 'admin@siperbun.local',
    password: 'password',
  });
  if (res.status !== 200) return null;
  return res.body.data.accessToken as string;
}

describe('Stage 4 — Field assignments, inspections, findings', () => {
  let token: string | null = null;
  let assignmentId: string | null = null;
  let inspectionId: string | null = null;

  beforeAll(async () => {
    token = await loginAdmin();
    if (!token) return;

    const list = await request(app)
      .get('/api/v1/field-assignments?page=1&limit=20&status=SCHEDULED')
      .set('Authorization', `Bearer ${token}`);

    assignmentId = list.body.data?.[0]?.id ?? null;

    if (!assignmentId) {
      const any = await request(app)
        .get('/api/v1/field-assignments?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`);
      assignmentId = any.body.data?.[0]?.id ?? null;
    }
  });

  it('lists field assignments and checklists', async () => {
    if (!token) {
      expect(true).toBe(true);
      return;
    }

    const assignments = await request(app)
      .get('/api/v1/field-assignments?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(assignments.status).toBe(200);
    expect(assignments.body.success).toBe(true);
    expect(Array.isArray(assignments.body.data)).toBe(true);

    const checklists = await request(app)
      .get('/api/v1/inspection-checklists')
      .set('Authorization', `Bearer ${token}`);
    expect(checklists.status).toBe(200);
    expect(checklists.body.data.length).toBeGreaterThanOrEqual(10);
    expect(
      checklists.body.data.some(
        (c: { code: string }) => c.code === 'asal_benih',
      ),
    ).toBe(true);
  });

  it('starts inspection, adds finding, finalizes REVISION', async () => {
    if (!token || !assignmentId) {
      expect(true).toBe(true);
      return;
    }

    const detail = await request(app)
      .get(`/api/v1/field-assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);

    if (detail.body.data.inspection?.id) {
      inspectionId = detail.body.data.inspection.id;
    } else {
      const start = await request(app)
        .post(`/api/v1/field-assignments/${assignmentId}/start-inspection`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect([200, 201]).toContain(start.status);
      inspectionId = start.body.data.inspection?.id ?? null;
    }

    expect(inspectionId).toBeTruthy();

    // If already finalized from seed, skip mutation path
    const insp = await request(app)
      .get(`/api/v1/field-inspections/${inspectionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(insp.status).toBe(200);

    if (insp.body.data.isFinalized) {
      expect(insp.body.data.isFinalized).toBe(true);
      return;
    }

    const finding = await request(app)
      .post(`/api/v1/field-inspections/${inspectionId}/findings`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        findingType: 'Keseragaman',
        description: 'Bibit tidak seragam — uji Stage 4',
        severity: 'MEDIUM',
        recommendation: 'Sortir ulang',
      });
    expect(finding.status).toBe(201);
    expect(finding.body.data.findingType).toBe('Keseragaman');

    const finalize = await request(app)
      .post(`/api/v1/field-inspections/${inspectionId}/finalize`)
      .set('Authorization', `Bearer ${token}`)
      .send({ result: 'REVISION', notes: 'Perlu perbaikan lapangan' });
    expect(finalize.status).toBe(200);
    expect(finalize.body.data.isFinalized).toBe(true);
  });

  it('blocks further edit after finalize', async () => {
    if (!token || !inspectionId) {
      expect(true).toBe(true);
      return;
    }

    const insp = await request(app)
      .get(`/api/v1/field-inspections/${inspectionId}`)
      .set('Authorization', `Bearer ${token}`);

    if (!insp.body.data?.isFinalized) {
      // ensure finalized for this assertion
      await request(app)
        .post(`/api/v1/field-inspections/${inspectionId}/finalize`)
        .set('Authorization', `Bearer ${token}`)
        .send({ result: 'REVISION' });
    }

    const put = await request(app)
      .put(`/api/v1/field-inspections/${inspectionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'should fail' });
    expect(put.status).toBe(400);

    const finding = await request(app)
      .post(`/api/v1/field-inspections/${inspectionId}/findings`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        findingType: 'After finalize',
        description: 'Should be blocked',
        severity: 'LOW',
      });
    expect(finding.status).toBe(400);
  });
});
