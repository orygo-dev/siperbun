import { ApplicationStatus } from '@siperbun/shared';
import { FileCheck2, ReceiptText, Upload } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  applicationsApi,
  type CertificationApplication,
} from '../../services/applications';

type Props = {
  application: CertificationApplication;
  canManage: boolean;
  canUploadPayment: boolean;
  onChanged: () => void;
};

const FINANCE_STATUSES = new Set([
  ApplicationStatus.INSPECTION_PASSED,
  ApplicationStatus.WAITING_LHP_INVOICE,
  ApplicationStatus.WAITING_PAYMENT,
  ApplicationStatus.PAYMENT_VERIFICATION,
  ApplicationStatus.PAYMENT_REJECTED,
  ApplicationStatus.PAYMENT_VERIFIED,
  ApplicationStatus.CERTIFICATE_ISSUED_MANUALLY,
  ApplicationStatus.WAITING_CERTIFICATE_SCAN,
  ApplicationStatus.CERTIFICATE_SCAN_UPLOADED,
  ApplicationStatus.COMPLETED,
]);

function errorMessage(error: unknown) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? 'Gagal memproses data'
  );
}

async function download(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    toast.error(errorMessage(error));
  }
}

export function ApplicationFinancePanel({
  application,
  canManage,
  canUploadPayment,
  onChanged,
}: Props) {
  const [lhpFile, setLhpFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [financeForm, setFinanceForm] = useState({
    reportNumber: '',
    invoiceNumber: '',
    amount: '',
    dueDate: '',
    paymentInstructions: '',
    notes: '',
  });

  const lhpMutation = useMutation({
    mutationFn: () =>
      applicationsApi.createLhpAndInvoice(application.id, {
        ...financeForm,
        amount: Number(financeForm.amount),
        file: lhpFile!,
      }),
    onSuccess: (response) => {
      toast.success(response.data.message);
      onChanged();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      applicationsApi.uploadPaymentProof(
        application.id,
        paymentFile!,
        paymentNotes || null,
      ),
    onSuccess: (response) => {
      toast.success(response.data.message);
      setPaymentFile(null);
      setPaymentNotes('');
      onChanged();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const verifyMutation = useMutation({
    mutationFn: (decision: 'ACCEPTED' | 'REJECTED') =>
      applicationsApi.verifyPayment(application.id, {
        decision,
        notes: verificationNotes || null,
      }),
    onSuccess: (response) => {
      toast.success(response.data.message);
      setVerificationNotes('');
      onChanged();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (!FINANCE_STATUSES.has(application.status as never)) return null;

  const invoice = application.invoice;
  const latestProof = invoice?.paymentProofs?.[0];
  const canSendPayment =
    canUploadPayment &&
    (application.status === ApplicationStatus.WAITING_PAYMENT ||
      application.status === ApplicationStatus.PAYMENT_REJECTED);

  return (
    <section className="rounded-xl border border-border bg-white p-5 shadow-soft">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-primary">LHP & Pembayaran</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          LHP dan invoice diterbitkan setelah hasil pemeriksaan dinyatakan lulus.
        </p>
      </div>

      {canManage && application.status === ApplicationStatus.INSPECTION_PASSED ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
          <h4 className="text-sm font-semibold">Terbitkan LHP dan Invoice</h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {[
              ['reportNumber', 'Nomor LHP', 'LHP/2026/00128'],
              ['invoiceNumber', 'Nomor Invoice', 'INV/2026/00128'],
              ['amount', 'Nominal Pembayaran', '1250000'],
              ['dueDate', 'Batas Pembayaran', ''],
            ].map(([key, label, placeholder]) => (
              <label key={key} className="text-xs font-medium">
                {label} <span className="text-danger">*</span>
                <input
                  type={key === 'amount' ? 'number' : key === 'dueDate' ? 'date' : 'text'}
                  min={key === 'amount' ? 1 : undefined}
                  value={financeForm[key as keyof typeof financeForm]}
                  placeholder={placeholder}
                  onChange={(event) =>
                    setFinanceForm((current) => ({ ...current, [key]: event.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
                />
              </label>
            ))}
            <label className="text-xs font-medium md:col-span-2">
              Instruksi Pembayaran
              <textarea
                rows={2}
                value={financeForm.paymentInstructions}
                onChange={(event) => setFinanceForm((current) => ({ ...current, paymentInstructions: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium md:col-span-2">
              File LHP <span className="text-danger">*</span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) => setLhpFile(event.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => lhpMutation.mutate()}
            disabled={
              lhpMutation.isPending ||
              !lhpFile ||
              !financeForm.reportNumber.trim() ||
              !financeForm.invoiceNumber.trim() ||
              Number(financeForm.amount) <= 0 ||
              !financeForm.dueDate
            }
            className="mt-4 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {lhpMutation.isPending ? 'Menerbitkan...' : 'Terbitkan LHP & Invoice'}
          </button>
        </div>
      ) : null}

      {application.inspectionReport && invoice ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-start gap-3">
                <FileCheck2 className="h-6 w-6 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-[var(--text-secondary)]">Laporan Hasil Pemeriksaan</div>
                  <div className="mt-1 font-semibold">{application.inspectionReport.reportNumber}</div>
                  {application.inspectionReport.file ? (
                    <button type="button" onClick={() => download(() => applicationsApi.downloadFile(application.inspectionReport!.file!.id, application.inspectionReport!.file!.originalName))} className="mt-2 text-xs font-medium text-primary hover:underline">
                      Unduh LHP
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-start gap-3">
                <ReceiptText className="h-6 w-6 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-[var(--text-secondary)]">Invoice</div>
                  <div className="mt-1 font-semibold">{invoice.invoiceNumber}</div>
                  <div className="mt-2 text-sm">Rp {invoice.amount.toLocaleString('id-ID')}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Batas: {new Date(invoice.dueDate).toLocaleDateString('id-ID')}</div>
                  <button type="button" onClick={() => download(() => applicationsApi.downloadInvoice(application.id, invoice.invoiceNumber))} className="mt-2 text-xs font-medium text-primary hover:underline">
                    Unduh Invoice PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          {invoice.paymentInstructions ? (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <div className="font-semibold">Instruksi pembayaran</div>
              <div className="mt-1 whitespace-pre-wrap">{invoice.paymentInstructions}</div>
            </div>
          ) : null}

          {application.status === ApplicationStatus.PAYMENT_REJECTED && latestProof?.verificationNotes ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Pembayaran ditolak: {latestProof.verificationNotes}
            </div>
          ) : null}

          {canSendPayment ? (
            <div className="mt-4 rounded-lg border border-dashed border-primary/40 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><Upload className="h-4 w-4" /> Bukti Pembayaran</div>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) => setPaymentFile(event.target.files?.[0] ?? null)}
                className="mt-3 block w-full text-sm"
              />
              <textarea
                rows={2}
                value={paymentNotes}
                onChange={(event) => setPaymentNotes(event.target.value)}
                placeholder="Catatan pembayaran (opsional)"
                className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => paymentMutation.mutate()} disabled={!paymentFile || paymentMutation.isPending} className="mt-3 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-50">
                {paymentMutation.isPending ? 'Mengirim...' : 'Kirim untuk Verifikasi'}
              </button>
            </div>
          ) : null}

          {latestProof ? (
            <div className="mt-4 rounded-lg border border-border p-4 text-sm">
              <div className="font-semibold">Bukti Pembayaran Terakhir</div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">{latestProof.file?.originalName} · {new Date(latestProof.submittedAt).toLocaleString('id-ID')}</div>
              {latestProof.file ? (
                <button type="button" onClick={() => download(() => applicationsApi.downloadFile(latestProof.file!.id, latestProof.file!.originalName))} className="mt-2 text-xs font-medium text-primary hover:underline">Unduh bukti pembayaran</button>
              ) : null}
            </div>
          ) : null}

          {canManage && application.status === ApplicationStatus.PAYMENT_VERIFICATION ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
              <h4 className="text-sm font-semibold">Verifikasi Pembayaran</h4>
              <textarea rows={2} value={verificationNotes} onChange={(event) => setVerificationNotes(event.target.value)} placeholder="Catatan verifikasi; wajib jika ditolak" className="mt-3 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => verifyMutation.mutate('ACCEPTED')} disabled={verifyMutation.isPending} className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-50">Tandai Lunas</button>
                <button type="button" onClick={() => verifyMutation.mutate('REJECTED')} disabled={verifyMutation.isPending || !verificationNotes.trim()} className="h-10 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-medium text-red-700 disabled:opacity-50">Tolak Pembayaran</button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
