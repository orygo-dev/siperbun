import { Check } from 'lucide-react';

const STEPS = [
  { label: 'Pengajuan', statuses: ['DRAFT', 'SUBMITTED', 'ADMIN_REVIEW', 'ADMIN_REVISION_REQUIRED', 'DOCUMENT_COMPLETE', 'WAITING_ASSIGNMENT'] },
  { label: 'Pemeriksaan', statuses: ['INSPECTION_SCHEDULED', 'INSPECTION_IN_PROGRESS', 'FIELD_REVISION_REQUIRED', 'WAITING_RESULT_VALIDATION', 'INSPECTION_PASSED', 'INSPECTION_FAILED'] },
  { label: 'LHP & Invoice', statuses: ['WAITING_LHP_INVOICE'] },
  { label: 'Pembayaran', statuses: ['WAITING_PAYMENT', 'PAYMENT_VERIFICATION', 'PAYMENT_REJECTED', 'PAYMENT_VERIFIED'] },
  { label: 'Sertifikat', statuses: ['CERTIFICATE_ISSUED_MANUALLY', 'WAITING_CERTIFICATE_SCAN', 'CERTIFICATE_SCAN_UPLOADED', 'COMPLETED'] },
] as const;

const TERMINAL_FAILURES = new Set(['REJECTED', 'CANCELLED', 'INSPECTION_FAILED']);

export function ApplicationWorkflowWizard({ status }: { status: string }) {
  const activeIndex = TERMINAL_FAILURES.has(status)
    ? status === 'INSPECTION_FAILED' ? 1 : 0
    : Math.max(0, STEPS.findIndex((step) => step.statuses.includes(status as never)));

  return (
    <section className="overflow-x-auto rounded-xl border border-border bg-white px-4 py-5 shadow-soft" aria-label="Tahapan pengajuan sertifikat">
      <ol className="flex min-w-[660px] items-start">
        {STEPS.map((step, index) => {
          const complete = index < activeIndex || status === 'COMPLETED';
          const active = index === activeIndex && status !== 'COMPLETED';
          return (
            <li key={step.label} className="relative flex flex-1 flex-col items-center text-center">
              {index > 0 ? (
                <span className={`absolute right-1/2 top-5 h-0.5 w-full ${index <= activeIndex ? 'bg-primary' : 'bg-slate-200'}`} />
              ) : null}
              <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold ${complete || active ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-slate-400'}`}>
                {complete ? <Check className="h-5 w-5" /> : index + 1}
              </span>
              <span className={`mt-2 text-xs font-medium ${active ? 'text-primary' : complete ? 'text-slate-700' : 'text-slate-400'}`}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
