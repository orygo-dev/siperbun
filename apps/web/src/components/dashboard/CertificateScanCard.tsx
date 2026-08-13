import { Link } from 'react-router-dom';
import type { CertificateScans } from '../../services/dashboard';

export function CertificateScanCard({ data }: { data: CertificateScans }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Monitoring Scan Sertifikat</h3>
        <Link
          to="/sertifikat"
          className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-dark"
        >
          Unggah Scan
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Telah Diterbitkan" value={data.issued} />
        <Metric label="Scan Terunggah" value={data.uploaded} />
        <Metric label="Belum Diunggah" value={data.pendingUpload} />
        <Metric label="Terverifikasi" value={data.verified} />
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-[var(--text-secondary)]">Persentase terverifikasi</span>
          <span className="font-semibold">{data.verifiedPercent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-secondary"
            style={{ width: `${data.verifiedPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-background px-3 py-2">
      <div className="text-[11px] text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
