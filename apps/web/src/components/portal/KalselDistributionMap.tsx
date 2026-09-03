import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import { useMemo, useState } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Popup } from 'react-leaflet';
import { feature } from 'topojson-client';
import type { FeatureCollection } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { MapPin } from 'lucide-react';
import { ClientOnlyMap } from '../common/ClientOnlyMap';
import { publicApi } from '../../services/public';
import { cn } from '../../lib/utils';

const KALSEL_BOUNDS = L.latLngBounds(
  L.latLng(-4.35, 114.05),
  L.latLng(-1.05, 116.85),
);

const normalizeName = (value: string) =>
  value.toLocaleLowerCase('id-ID').replace(/[^a-z0-9]/g, '');

export function KalselDistributionMap() {
  const [commodityId, setCommodityId] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const [topologyQ, summaryQ, commoditiesQ] = [
    useQuery({
      queryKey: ['portal', 'kalsel-topology'],
      staleTime: Infinity,
      queryFn: async () => {
        const response = await fetch('/data/kalimantan-selatan.topo.json');
        if (!response.ok) throw new Error('Peta Kalimantan Selatan gagal dimuat');
        const topology = (await response.json()) as Topology;
        const object = topology.objects['kalimantan-selatan'] as GeometryCollection;
        return feature(topology, object) as FeatureCollection;
      },
    }),
    useQuery({
      queryKey: ['portal', 'map-summary', commodityId],
      queryFn: async () => (await publicApi.map(commodityId || undefined)).data.data,
    }),
    useQuery({
      queryKey: ['public', 'commodities'],
      queryFn: async () => (await publicApi.commodities()).data.data,
    }),
  ];

  const districts = summaryQ.data?.districts ?? [];
  const markers = useMemo(() => {
    const all = summaryQ.data?.markers ?? [];
    if (!selectedDistrict) return all;
    const normalized = normalizeName(selectedDistrict);
    return all.filter(
      (marker) =>
        marker.kabupaten && normalizeName(marker.kabupaten.name) === normalized,
    );
  }, [summaryQ.data?.markers, selectedDistrict]);

  const featureStyle = (mapFeature?: GeoJSON.Feature) => {
    const name = String(mapFeature?.properties?.kabkot ?? '');
    const active =
      selectedDistrict && normalizeName(selectedDistrict) === normalizeName(name);
    return {
      color: active ? '#0c4a3a' : '#679286',
      weight: active ? 2.2 : 1.1,
      fillColor: active ? '#a7d8ba' : '#eef7f1',
      fillOpacity: active ? 0.9 : 0.72,
    };
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-[#15302a]">
          Kabupaten/Kota
          <select
            value={selectedDistrict}
            onChange={(event) => setSelectedDistrict(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-[#2f8f55] focus:ring-2 focus:ring-[#2f8f55]/10"
          >
            <option value="">Semua Kabupaten</option>
            {districts.map((district) => (
              <option key={district.id} value={district.name}>
                {district.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-[#15302a]">
          Komoditas
          <select
            value={commodityId}
            onChange={(event) => setCommodityId(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-[#2f8f55] focus:ring-2 focus:ring-[#2f8f55]/10"
          >
            <option value="">Semua Komoditas</option>
            {(commoditiesQ.data ?? []).map((commodity) => (
              <option key={commodity.id} value={commodity.id}>
                {commodity.name}
              </option>
            ))}
          </select>
        </label>
        <p className="rounded-lg bg-[#eef7f1] px-3 py-2.5 text-xs leading-5 text-[#315b50]">
          {summaryQ.isLoading
            ? 'Memuat data penangkar…'
            : `${markers.length} lokasi penangkar ditampilkan pada peta.`}
        </p>
      </div>

      <div className="relative h-[500px] overflow-hidden rounded-2xl border border-[#dbe7e1] bg-[#f7fbf8]">
        {topologyQ.isError ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
            Peta Kalimantan Selatan belum dapat dimuat.
          </div>
        ) : topologyQ.data ? (
          <ClientOnlyMap className="h-full w-full">
          <MapContainer
            key="kalsel-map"
            center={[-2.85, 115.45]}
            zoom={7}
            minZoom={7}
            maxZoom={10}
            maxBounds={KALSEL_BOUNDS}
            maxBoundsViscosity={1}
            scrollWheelZoom={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%', background: '#f7fbf8' }}
          >
            <GeoJSON
              key={`${selectedDistrict}-${topologyQ.data.features.length}`}
              data={topologyQ.data}
              style={featureStyle}
              onEachFeature={(mapFeature, layer) => {
                const name = String(mapFeature.properties?.kabkot ?? '');
                layer.bindTooltip(name, {
                  sticky: true,
                  direction: 'top',
                  className: 'kalsel-map-tooltip',
                });
                layer.on('click', () => setSelectedDistrict(name));
              }}
            />
            {markers
              .filter(
                (marker) =>
                  Number.isFinite(marker.latitude) &&
                  Number.isFinite(marker.longitude),
              )
              .map((marker) => (
              <CircleMarker
                key={marker.id}
                center={[marker.latitude, marker.longitude]}
                radius={6}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: '#0c7a4d',
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="min-w-44 space-y-1 text-xs">
                    <div className="font-semibold text-slate-900">
                      {marker.businessName}
                    </div>
                    <div>{marker.kabupaten?.name ?? 'Kalimantan Selatan'}</div>
                    <div className="text-slate-500">
                      {marker.commodities.map((item) => item.name).join(', ')}
                    </div>
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
      </div>

      <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-[#dbe7e1] bg-white p-2">
        <div className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Kabupaten/Kota
        </div>
        {districts.map((district) => {
          const active =
            selectedDistrict &&
            normalizeName(selectedDistrict) === normalizeName(district.name);
          return (
            <button
              key={district.id}
              type="button"
              onClick={() =>
                setSelectedDistrict(active ? '' : district.name)
              }
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition',
                active
                  ? 'bg-[#e2f3e8] font-semibold text-[#0c4a3a]'
                  : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{district.name}</span>
              <span className="rounded-md bg-[#eef7f1] px-1.5 py-0.5 font-semibold text-[#2f6f4f]">
                {district.producerCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
