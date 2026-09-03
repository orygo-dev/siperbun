import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { districtNamesMatch } from '../../lib/kalsel';
import { formatNumber } from '../../lib/utils';
import type { SeedDistributionSummary } from '../../services/dashboard';
import {
  DistrictChipList,
  KalselChoroplethMap,
} from '../maps/KalselChoroplethMap';

export function SeedDistributionCard({
  data,
}: {
  data: SeedDistributionSummary;
}) {
  const [selected, setSelected] = useState('');
  const stats = useMemo(
    () => data.districts.map((d) => ({ name: d.name, value: d.quantity })),
    [data.districts],
  );

  const selectedRow = data.districts.find((d) =>
    selected ? districtNamesMatch(d.name, selected) : false,
  );

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Distribusi benih penangkar</h3>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Penjualan/penyaluran bibit berdasarkan kabupaten tujuan
          </p>
        </div>
        <Link
          to="/label-distribusi?tab=distribusi"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Lihat semua
        </Link>
      </div>

      <div className="mb-3 grid shrink-0 grid-cols-4 gap-2">
        <Metric label="Batang" value={formatNumber(data.totalQuantity)} />
        <Metric label="Transaksi" value={formatNumber(data.totalTransactions)} />
        <Metric label="Penangkar" value={formatNumber(data.producerCount)} />
        <Metric label="Tahun ini" value={formatNumber(data.thisYearQuantity)} />
      </div>

      {selectedRow ? (
        <p className="mb-3 shrink-0 rounded-lg bg-primary-light px-3 py-1.5 text-xs text-primary">
          <span className="font-semibold">{selectedRow.name}</span>
          {' · '}
          {formatNumber(selectedRow.quantity)} batang dari{' '}
          {formatNumber(selectedRow.count)} transaksi
        </p>
      ) : null}

      <KalselChoroplethMap
        stats={stats}
        selectedName={selected}
        onSelect={setSelected}
        legendLabel="Batang"
        formatValue={(v) => `${formatNumber(v)} batang`}
        height={340}
      />
      <div className="mt-3 shrink-0">
        {stats.length > 0 ? (
          <DistrictChipList
            stats={stats}
            selected={selected}
            onSelect={setSelected}
            formatValue={(v) => formatNumber(v)}
            className="max-h-[4.75rem] overflow-y-auto"
          />
        ) : (
          <p className="text-xs text-[var(--text-secondary)]">
            Belum ada distribusi dengan kabupaten tujuan.
          </p>
        )}
      </div>

      {data.recent.length > 0 ? (
        <div className="mt-3 min-h-0 overflow-hidden rounded-lg border border-border">
          <div className="border-b border-border bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
            Distribusi terbaru
          </div>
          <ul>
            {data.recent.slice(0, 3).map((row) => (
              <li key={row.id}>
                <Link
                  to={`/label-distribusi/distribusi/${row.id}`}
                  className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-1.5 last:border-0 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-800">
                      {row.buyerName}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {row.producer} · {row.destinationKab ?? 'Tanpa tujuan'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-slate-800">
                      {formatNumber(row.quantity)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {row.distributedAt.slice(0, 10)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          Belum ada data distribusi bibit.
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}
