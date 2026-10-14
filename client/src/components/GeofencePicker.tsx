'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

type Props = {
  lat: number;
  lng: number;
  radius: number;
  onChange: (lat: number, lng: number) => void;
};

// A pin built from HTML so we don't depend on Leaflet's (bundler-broken) image assets.
function pinIcon() {
  return L.divIcon({
    className: 'geofence-pin',
    html: `<div style="transform:translate(-50%,-100%);font-size:28px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">📍</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function ClickToPlace({ onChange }: { onChange: Props['onChange'] }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Leaflet renders grey tiles when mounted inside a hidden/animating container
// (like a dialog). Force a resize once it's visible, and keep the center framed.
function KeepFramed({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  useEffect(() => {
    map.panTo([lat, lng], { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function GeofencePicker({ lat, lng, radius, onChange }: Props) {
  const icon = useMemo(() => pinIcon(), []);
  const center: [number, number] = [lat, lng];

  return (
    <MapContainer center={center} zoom={13} style={{ height: 300, width: '100%' }} scrollWheelZoom>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickToPlace onChange={onChange} />
      <KeepFramed lat={lat} lng={lng} />
      <Circle
        center={center}
        radius={radius}
        pathOptions={{ color: 'hsl(221 83% 53%)', fillColor: 'hsl(221 83% 53%)', fillOpacity: 0.12, weight: 2 }}
      />
      <Marker
        position={center}
        icon={icon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const m = (e.target as L.Marker).getLatLng();
            onChange(m.lat, m.lng);
          },
        }}
      />
    </MapContainer>
  );
}
