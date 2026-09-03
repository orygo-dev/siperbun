import { KALSEL_MAP_CENTER } from '@siperbun/shared';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import { useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { ClientOnlyMap } from '../../components/common/ClientOnlyMap';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { mapApi } from '../../services/map';
import { cn } from '../../lib/utils';

const colorHex: Record<string, string> = {
  green: '#07844a',
  yellow: '#f59e0b',
  red: '#dc2626',
  blue: '#2563eb',
  orange: '#ea580c',
};

const TYPE_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'active', label: 'Pembibitan Aktif' },
  { key: 'process', label: 'Proses' },
  { key: 'finding', label: 'Temuan' },
  { key: 'seed_garden', label: 'Kebun Sumber' },
  { key: 'circulation', label: 'Pengawasan' },
];

function markerIcon(color: string) {
  const fill = colorHex[color] ?? colorHex.green;
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${fill};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function MapPage() {
  const [filter, setFilter] = useState('all');
  const query = useQuery({
    queryKey: ['map-markers'],
    queryFn: async () => {
      const res = await mapApi.markers();
      return res.data.data ?? [];
    },
  });

  const markers = useMemo(() => {
    const all = query.data ?? [];
    if (filter === 'all') return all;
    return all.filter((m) => m.type === filter);
  }, [query.data, filter]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Peta Persebaran"
        subtitle="Lokasi pembibitan, kebun sumber, dan pengawasan peredaran"
      />

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium',
              filter === f.key
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-white text-[var(--text-secondary)]',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-white p-3 shadow-soft">
        <div className="mb-3 flex flex-wrap gap-4 text-[10px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-full bg-primary" /> Aktif
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-full bg-warning" /> Proses
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-full bg-danger" /> Temuan
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-full bg-info" /> Kebun Sumber
          </span>
          <span className="flex items-center gap-1">
            <i
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: colorHex.orange }}
            />{' '}
            Pengawasan
          </span>
        </div>

        {query.isLoading ? (
          <LoadingState />
        ) : (
          <div className="h-[calc(100vh-260px)] min-h-[420px] overflow-hidden rounded-xl">
            <ClientOnlyMap className="h-full w-full">
            <MapContainer
              key={`map-${filter}`}
              center={[KALSEL_MAP_CENTER.lat, KALSEL_MAP_CENTER.lng]}
              zoom={KALSEL_MAP_CENTER.zoom}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {markers
                .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
                .map((m) => (
                <Marker
                  key={`${m.type}-${m.id}`}
                  position={[m.lat, m.lng]}
                  icon={markerIcon(m.color)}
                >
                  <Popup>
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold">{m.name}</div>
                      <div>
                        {m.locationType}: {m.locationName}
                      </div>
                      <div>Komoditas: {m.commodity}</div>
                      <div>Kabupaten: {m.kabupaten}</div>
                      <div>Status: {m.status}</div>
                      <Link to={m.href} className="text-primary underline">
                        Lihat detail
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            </ClientOnlyMap>
          </div>
        )}
      </div>
    </div>
  );
}
