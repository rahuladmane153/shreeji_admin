'use client';

import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet';

type Marker = {
  id: number;
  device_code: string;
  customer_name: string | null;
  mobile: string | null;
  status: string;
  bucket: string;
  battery_level: number | null;
  latitude: number;
  longitude: number;
};

type Geofence = {
  id: number;
  name: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
};

const BUCKET_COLOR: Record<string, string> = {
  active: '#16a34a',
  locked: '#dc2626',
  disabled: '#ea580c',
  offline: '#94a3b8',
};

export default function LiveMap({
  markers,
  geofences = [],
  center = [21.1458, 79.0882], // Nagpur default
}: {
  markers: Marker[];
  geofences?: Geofence[];
  center?: [number, number];
}) {
  const start: [number, number] = markers.length ? [markers[0].latitude, markers[0].longitude] : center;

  return (
    <MapContainer center={start} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {geofences.map((g) => (
        <Circle
          key={`gf-${g.id}`}
          center={[g.center_latitude, g.center_longitude]}
          radius={g.radius_meters}
          pathOptions={{ color: '#1d4ed8', fillOpacity: 0.08 }}
        >
          <Popup>
            <b>{g.name}</b>
            <br />
            Radius: {g.radius_meters} m
          </Popup>
        </Circle>
      ))}

      {markers.map((m) => (
        <CircleMarker
          key={m.id}
          center={[m.latitude, m.longitude]}
          radius={9}
          pathOptions={{
            color: '#fff',
            weight: 2,
            fillColor: BUCKET_COLOR[m.bucket] || '#64748b',
            fillOpacity: 1,
          }}
        >
          <Popup>
            <div className="text-sm">
              <b>{m.device_code}</b>
              <br />
              {m.customer_name || '—'}
              <br />
              {m.mobile}
              <br />
              Status: {m.status}
              <br />
              Battery: {m.battery_level ?? '—'}%
              <br />
              {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
