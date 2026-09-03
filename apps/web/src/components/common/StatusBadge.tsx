import {
  APPLICATION_STATUS_LABELS,
  ASSIGNMENT_STATUS_LABELS,
  CERTIFICATE_STATUS_LABELS,
  FINDING_STATUS_LABELS,
  PRODUCER_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  type ApplicationStatus,
  type AssignmentStatus,
  type CertificateStatus,
  type FindingStatus,
  type ProducerStatus,
  type ProductionStatus,
} from '@siperbun/shared';
import { cn } from '../../lib/utils';

const colorMap: Record<string, string> = {
  ADMIN_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-200',
  ADMIN_REVISION_REQUIRED: 'bg-orange-50 text-orange-700 border-orange-200',
  FIELD_REVISION_REQUIRED: 'bg-orange-50 text-orange-700 border-orange-200',
  WAITING_ASSIGNMENT: 'bg-blue-50 text-blue-700 border-blue-200',
  DOCUMENT_COMPLETE: 'bg-blue-50 text-blue-700 border-blue-200',
  INSPECTION_IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  INSPECTION_SCHEDULED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  WAITING_RESULT_VALIDATION: 'bg-purple-50 text-purple-700 border-purple-200',
  WAITING_LHP_INVOICE: 'bg-amber-50 text-amber-700 border-amber-200',
  WAITING_PAYMENT: 'bg-blue-50 text-blue-700 border-blue-200',
  PAYMENT_VERIFICATION: 'bg-amber-50 text-amber-700 border-amber-200',
  PAYMENT_REJECTED: 'bg-red-50 text-red-700 border-red-200',
  PAYMENT_VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WAITING_CERTIFICATE_SCAN: 'bg-purple-50 text-purple-700 border-purple-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CERTIFICATE_SCAN_UPLOADED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CERTIFICATE_ISSUED_MANUALLY: 'bg-blue-50 text-blue-700 border-blue-200',
  INSPECTION_PASSED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INSPECTION_FAILED: 'bg-red-50 text-red-700 border-red-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-slate-50 text-slate-600 border-slate-200',
  PENDING_VERIFICATION: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  VERIFIED: 'bg-blue-50 text-blue-700 border-blue-200',
  DRAFT: 'bg-slate-50 text-slate-600 border-slate-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  PREPARATION: 'bg-slate-50 text-slate-600 border-slate-200',
  SOWING: 'bg-amber-50 text-amber-700 border-amber-200',
  GROWING: 'bg-blue-50 text-blue-700 border-blue-200',
  READY_FOR_INSPECTION: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  UNDER_INSPECTION: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PASSED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-50 text-slate-600 border-slate-200',
  SCHEDULED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
  EN_ROUTE: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  INSPECTING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  RESCHEDULED: 'bg-amber-50 text-amber-700 border-amber-200',
  OPEN: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  WAITING_VERIFICATION: 'bg-purple-50 text-purple-700 border-purple-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-slate-50 text-slate-600 border-slate-200',
  WAITING_ISSUANCE: 'bg-slate-50 text-slate-600 border-slate-200',
  ISSUED_MANUALLY: 'bg-blue-50 text-blue-700 border-blue-200',
  WAITING_SCAN: 'bg-purple-50 text-purple-700 border-purple-200',
  SCAN_UPLOADED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  REPLACED: 'bg-amber-50 text-amber-700 border-amber-200',
  EXPIRED: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function StatusBadge({ status }: { status: string }) {
  const label =
    CERTIFICATE_STATUS_LABELS[status as CertificateStatus] ??
    PRODUCER_STATUS_LABELS[status as ProducerStatus] ??
    APPLICATION_STATUS_LABELS[status as ApplicationStatus] ??
    PRODUCTION_STATUS_LABELS[status as ProductionStatus] ??
    ASSIGNMENT_STATUS_LABELS[status as AssignmentStatus] ??
    FINDING_STATUS_LABELS[status as FindingStatus] ??
    status.replaceAll('_', ' ');
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        colorMap[status] ?? 'bg-slate-50 text-slate-600 border-slate-200',
      )}
    >
      {label}
    </span>
  );
}
