import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { KALSEL_MAP_CENTER } from '@siperbun/shared';
import { Link } from 'react-router-dom';
import type { MapMarker } from '../../services/dashboard';

const colorHex: Record<string, string> = {
  green: '#07844a',
  yellow: '#f59e0b',
  red: '#dc2626',
  blue: '#2563eb',
  orange: '#ea580c',
};

function markerIcon(color: string) {
  const fill = colorHex[color] ?? colorHex.green;
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${fill};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function MapCard({ markers }: { markers: MapMarker[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Peta Persebaran</h3>
        <div className="flex gap-3 text-[10px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-primary" /> Aktif</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-warning" /> Proses</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-danger" /> Temuan</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-info" /> Kebun Sumber</span>
        </div>
      </div>
      <div className="h-[280px] overflow-hidden rounded-xl">
        <MapContainer
          center={[KALSEL_MAP_CENTER.lat, KALSEL_MAP_CENTER.lng]}
          zoom={KALSEL_MAP_CENTER.zoom}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((m) => (
            <Marker
              key={`${m.type}-${m.id}`}
              position={[m.lat, m.lng]}
              icon={markerIcon(m.color)}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="font-semibold">{m.name}</div>
                  <div>{m.locationType}: {m.locationName}</div>
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
      </div>
    </div>
  );
}
