import L from 'leaflet';
import { feature } from 'topojson-client';
import type { FeatureCollection } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';

export const KALSEL_BOUNDS = L.latLngBounds(
  L.latLng(-4.35, 114.05),
  L.latLng(-1.05, 116.85),
);

export const KALSEL_CENTER: [number, number] = [-2.85, 115.45];

export function normalizeDistrictName(value: string) {
  return value.toLocaleLowerCase('id-ID').replace(/[^a-z0-9]/g, '');
}

export function districtNamesMatch(a: string, b: string) {
  return normalizeDistrictName(a) === normalizeDistrictName(b);
}

let cached: Promise<FeatureCollection> | null = null;

export function loadKalselTopology() {
  if (!cached) {
    cached = (async () => {
      const response = await fetch('/data/kalimantan-selatan.topo.json');
      if (!response.ok) throw new Error('Peta Kalimantan Selatan gagal dimuat');
      const topology = (await response.json()) as Topology;
      const object = topology.objects['kalimantan-selatan'] as GeometryCollection;
      return feature(topology, object) as FeatureCollection;
    })();
  }
  return cached;
}

export function choroplethFill(value: number, max: number) {
  if (!max || value <= 0) return '#eef7f1';
  const t = Math.min(1, value / max);
  const stops: Array<[number, number, number]> = [
    [238, 247, 241],
    [167, 216, 186],
    [47, 143, 85],
    [12, 74, 58],
  ];
  const scaled = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const a = stops[i]!;
  const b = stops[i + 1]!;
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r}, ${g}, ${bl})`;
}
