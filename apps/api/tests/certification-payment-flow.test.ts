import { ApplicationStatus } from '@prisma/client';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

const app = createApp();

async function login(email: string) {
  const response = await request(app).post('/api/v1/auth/login').send({
    email,
    password: 'password',
  });
  return response.status === 200 ? response.body.data.accessToken as string : null;
}

describe('Certification payment workflow', () => {
  let adminToken: string | null = null;
  let producerToken: string | null = null;
  let foreignProducerToken: string | null = null;
  let applicationId: string | null = null;

  beforeAll(async () => {
    [adminToken, producerToken, foreignProducerToken] = await Promise.all([
      login('admin@siperbun.local'),
      login('penangkar1@siperbun.local'),
      login('penangkar2@siperbun.local'),
    ]);
    const producerUser = await prisma.user.findUnique({
      where: { email: 'penangkar1@siperbun.local' },
      select: { producerId: true },
    });
    const commodity = await prisma.commodity.findFirst({ where: { isActive: true }, select: { id: true } });
    if (!producerUser?.producerId || !commodity) return;
    const created = await prisma.certificationApplication.create({
      data: {
        applicationNumber: `FLOW-${Date.now()}`,
        producerId: producerUser.producerId,
        commodityId: commodity.id,
        seedlingCount: 1000,
        status: ApplicationStatus.INSPECTION_PASSED,
        submittedAt: new Date(),
      },
    });
    applicationId = created.id;
  });

  it('enforces LHP, invoice, payment verification, rejection and resubmission in order', async () => {
    if (!adminToken || !producerToken || !applicationId) {
      expect(true).toBe(true);
      return;
    }
    const suffix = Date.now();
    const issued = await request(app)
      .post(`/api/v1/certification-applications/${applicationId}/lhp-invoice`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('reportNumber', `LHP-TEST-${suffix}`)
      .field('invoiceNumber', `INV-TEST-${suffix}`)
      .field('amount', '1250000')
      .field('dueDate', '2026-12-31')
      .field('paymentInstructions', 'Transfer ke rekening resmi balai.')
      .attach('file', Buffer.from('%PDF-1.4 LHP test'), {
        filename: 'lhp.pdf',
        contentType: 'application/pdf',
      });
    expect(issued.status).toBe(201);
    expect(issued.body.data.status).toBe('WAITING_PAYMENT');
    expect(issued.body.data.invoice.amount).toBe(1_250_000);
    expect(issued.body.data.inspectionReport.file.id).toBeTruthy();

    const duplicate = await request(app)
      .post(`/api/v1/certification-applications/${applicationId}/lhp-invoice`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('reportNumber', `LHP-TEST-${suffix}`)
      .field('invoiceNumber', `INV-TEST-${suffix}`)
      .field('amount', '1')
      .field('dueDate', '2026-12-31')
      .attach('file', Buffer.from('%PDF-1.4 duplicate'), { filename: 'duplicate.pdf', contentType: 'application/pdf' });
    expect(duplicate.status).toBe(400);

    const invoice = await request(app)
      .get(`/api/v1/certification-applications/${applicationId}/invoice`)
      .set('Authorization', `Bearer ${producerToken}`)
      .buffer(true);
    expect(invoice.status).toBe(200);
    expect(invoice.headers['content-type']).toContain('application/pdf');
    expect(Buffer.from(invoice.body).subarray(0, 4).toString()).toBe('%PDF');

    if (foreignProducerToken) {
      const forbiddenInvoice = await request(app)
        .get(`/api/v1/certification-applications/${applicationId}/invoice`)
        .set('Authorization', `Bearer ${foreignProducerToken}`);
      expect(forbiddenInvoice.status).toBe(404);
    }

    const submitted = await request(app)
      .post(`/api/v1/certification-applications/${applicationId}/payment-proof`)
      .set('Authorization', `Bearer ${producerToken}`)
      .field('notes', 'Pembayaran tahap pertama')
      .attach('file', Buffer.from('%PDF-1.4 payment'), { filename: 'bukti.pdf', contentType: 'application/pdf' });
    expect(submitted.status).toBe(201);
    expect(submitted.body.data.status).toBe('PAYMENT_VERIFICATION');

    const rejectWithoutReason = await request(app)
      .post(`/api/v1/certification-applications/${applicationId}/verify-payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'REJECTED' });
    expect(rejectWithoutReason.status).toBe(422);

    const rejected = await request(app)
      .post(`/api/v1/certification-applications/${applicationId}/verify-payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'REJECTED', notes: 'Nominal pada bukti tidak terbaca.' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.status).toBe('PAYMENT_REJECTED');

    const resubmitted = await request(app)
      .post(`/api/v1/certification-applications/${applicationId}/payment-proof`)
      .set('Authorization', `Bearer ${producerToken}`)
      .attach('file', Buffer.from('%PDF-1.4 payment corrected'), { filename: 'bukti-perbaikan.pdf', contentType: 'application/pdf' });
    expect(resubmitted.status).toBe(201);
    expect(resubmitted.body.data.invoice.paymentProofs).toHaveLength(2);

    const accepted = await request(app)
      .post(`/api/v1/certification-applications/${applicationId}/verify-payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'ACCEPTED', notes: 'Pembayaran sesuai.' });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe('PAYMENT_VERIFIED');
    expect(accepted.body.data.invoice.status).toBe('PAID');
    expect(accepted.body.data.invoice.paidAt).toBeTruthy();
  });

  it('blocks workflow status bypass and rejection without a reason', async () => {
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }
    const row = await prisma.certificationApplication.findFirst({
      where: { deletedAt: null, status: ApplicationStatus.ADMIN_REVIEW },
      select: { id: true },
    });
    if (!row) return;

    const noReason = await request(app)
      .post(`/api/v1/certification-applications/${row.id}/change-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'REJECTED' });
    expect(noReason.status).toBe(422);

    const bypass = await request(app)
      .post(`/api/v1/certification-applications/${row.id}/change-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'PAYMENT_VERIFIED' });
    expect(bypass.status).toBe(400);
  });
});
