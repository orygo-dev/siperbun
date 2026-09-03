import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import type { MapMarker } from '../../services/dashboard';
import { formatNumber } from '../../lib/utils';
import {
  DistrictChipList,
  KalselChoroplethMap,
} from '../maps/KalselChoroplethMap';

const MARKER_COLOR: Record<string, string> = {
  green: '#07844a',
  yellow: '#f59e0b',
  red: '#dc2626',
  blue: '#2563eb',
  orange: '#ea580c',
};

export function MapCard({
  markers,
  compact = false,
}: {
  markers: MapMarker[];
  compact?: boolean;
}) {
  const [selected, setSelected] = useState('');
  const stats = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of markers) {
      const name = m.kabupaten?.trim();
      if (!name || name === '-') continue;
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [markers]);

  const mapMarkers = useMemo(
    () =>
      markers.map((m) => ({
        id: `${m.type}-${m.id}`,
        lat: m.lat,
        lng: m.lng,
        title: m.name,
        detail: `${m.locationType}: ${m.locationName} · ${m.commodity}`,
        color: MARKER_COLOR[m.color] ?? MARKER_COLOR.green,
        href: m.href,
        kabupaten: m.kabupaten,
      })),
    [markers],
  );

  const nurseryCount = markers.filter((m) => m.type !== 'seed_garden').length;
  const gardenCount = markers.filter((m) => m.type === 'seed_garden').length;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Peta sebaran Kalimantan Selatan</h3>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {formatNumber(markers.length)} lokasi pembibitan dan kebun sumber
          </p>
        </div>
        <Link
          to="/peta"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Peta lengkap
        </Link>
      </div>
      {compact ? (
        <div className="mb-3 grid shrink-0 grid-cols-4 gap-2">
          <MiniStat label="Lokasi" value={formatNumber(markers.length)} />
          <MiniStat label="Kabupaten" value={formatNumber(stats.length)} />
          <MiniStat label="Pembibitan" value={formatNumber(nurseryCount)} />
          <MiniStat label="Kebun sumber" value={formatNumber(gardenCount)} />
        </div>
      ) : null}
      <KalselChoroplethMap
        stats={stats}
        markers={mapMarkers}
        selectedName={selected}
        onSelect={setSelected}
        legendLabel="Lokasi"
        formatValue={(v) => `${formatNumber(v)} lokasi`}
        height={compact ? 340 : 460}
      />
      <div className="mt-3 min-h-0 flex-1">
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
            Belum ada lokasi dengan kabupaten yang dapat dipetakan.
          </p>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}
