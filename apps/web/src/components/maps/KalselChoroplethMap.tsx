import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { ClientOnlyMap } from '../common/ClientOnlyMap';
import { cn, formatNumber } from '../../lib/utils';
import {
  KALSEL_BOUNDS,
  KALSEL_CENTER,
  choroplethFill,
  districtNamesMatch,
  loadKalselTopology,
} from '../../lib/kalsel';

export type KalselDistrictStat = {
  name: string;
  value: number;
};

export type KalselMapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  detail?: string;
  color?: string;
  href?: string;
  kabupaten?: string;
};

type Props = {
  stats: KalselDistrictStat[];
  markers?: KalselMapMarker[];
  height?: number;
  formatValue?: (value: number) => string;
  selectedName?: string;
  onSelect?: (name: string) => void;
  legendLabel?: string;
};

export function KalselChoroplethMap({
  stats,
  markers = [],
  height = 440,
  formatValue = (v) => formatNumber(v),
  selectedName,
  onSelect,
  legendLabel = 'Jumlah',
}: Props) {
  const [internalSelected, setInternalSelected] = useState('');
  const selected = selectedName ?? internalSelected;

  const topologyQ = useQuery({
    queryKey: ['kalsel-topology'],
    staleTime: Infinity,
    queryFn: loadKalselTopology,
  });

  const valueByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stats) {
      map.set(normalizeKey(row.name), (map.get(normalizeKey(row.name)) ?? 0) + row.value);
    }
    return map;
  }, [stats]);

  const max = useMemo(
    () => Math.max(0, ...stats.map((s) => s.value)),
    [stats],
  );

  const visibleMarkers = useMemo(() => {
    const valid = markers.filter(
      (m) => Number.isFinite(m.lat) && Number.isFinite(m.lng),
    );
    if (!selected) return valid.slice(0, 80);
    return valid
      .filter((m) => m.kabupaten && districtNamesMatch(m.kabupaten, selected))
      .slice(0, 80);
  }, [markers, selected]);

  function selectDistrict(name: string) {
    const next = selected && districtNamesMatch(selected, name) ? '' : name;
    onSelect?.(next);
    if (selectedName === undefined) setInternalSelected(next);
  }

  const featureStyle = (mapFeature?: GeoJSON.Feature) => {
    const name = String(mapFeature?.properties?.kabkot ?? '');
    const value = lookupValue(valueByName, name);
    const active = Boolean(selected && districtNamesMatch(selected, name));
    return {
      color: active ? '#0c4a3a' : '#7aa38f',
      weight: active ? 2.4 : 1,
      fillColor: choroplethFill(value, max),
      fillOpacity: active ? 0.95 : 0.82,
    };
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#dbe7e1] bg-[#f7fbf8]" style={{ height }}>
      {topologyQ.isError ? (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
          Peta Kalimantan Selatan belum dapat dimuat.
        </div>
      ) : topologyQ.data ? (
        <ClientOnlyMap className="h-full w-full">
          <MapContainer
            key="kalsel-choropleth"
            center={KALSEL_CENTER}
            zoom={7.2}
            minZoom={7}
            maxZoom={10}
            maxBounds={KALSEL_BOUNDS}
            maxBoundsViscosity={1}
            scrollWheelZoom={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%', background: '#f7fbf8' }}
          >
            <InvalidateSize />
            <GeoJSON
              key={`${selected}-${max}-${stats.length}`}
              data={topologyQ.data}
              style={featureStyle}
              onEachFeature={(mapFeature, layer) => {
                const name = String(mapFeature.properties?.kabkot ?? '');
                const value = lookupValue(valueByName, name);
                layer.bindTooltip(
                  `${name}<br/>${legendLabel}: ${formatValue(value)}`,
                  {
                    sticky: true,
                    direction: 'top',
                    className: 'kalsel-map-tooltip',
                  },
                );
                layer.on('click', () => selectDistrict(name));
              }}
            />
            {visibleMarkers.map((marker) => (
              <CircleMarker
                key={marker.id}
                center={[marker.lat, marker.lng]}
                radius={6}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: marker.color ?? '#0c7a4d',
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="min-w-40 space-y-1 text-xs">
                    <div className="font-semibold text-slate-900">{marker.title}</div>
                    {marker.detail ? (
                      <div className="text-slate-500">{marker.detail}</div>
                    ) : null}
                    {marker.href ? (
                      <Link to={marker.href} className="text-primary underline">
                        Lihat detail
                      </Link>
                    ) : null}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </ClientOnlyMap>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Memuat peta…
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-2.5 py-2 text-[10px] shadow-sm ring-1 ring-black/5">
        <div className="mb-1 font-semibold text-slate-600">{legendLabel}</div>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Rendah</span>
          <span className="h-2 w-16 rounded-full bg-[linear-gradient(90deg,#eef7f1,#2f8f55,#0c4a3a)]" />
          <span className="text-slate-400">Tinggi</span>
        </div>
      </div>
    </div>
  );
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 160);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

function normalizeKey(value: string) {
  return value.toLocaleLowerCase('id-ID').replace(/[^a-z0-9]/g, '');
}

function lookupValue(map: Map<string, number>, name: string) {
  return map.get(normalizeKey(name)) ?? 0;
}

export function DistrictChipList({
  stats,
  selected,
  onSelect,
  formatValue,
  className,
}: {
  stats: KalselDistrictStat[];
  selected?: string;
  onSelect: (name: string) => void;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const fmt = formatValue ?? ((v: number) => formatNumber(v));
  const rows = [...stats].sort((a, b) => b.value - a.value);
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {rows.map((row) => {
        const active = Boolean(selected && districtNamesMatch(selected, row.name));
        return (
          <button
            key={row.name}
            type="button"
            onClick={() => onSelect(active ? '' : row.name)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
              active
                ? 'border-primary bg-primary-light text-primary'
                : 'border-border bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {row.name}
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
              {fmt(row.value)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
