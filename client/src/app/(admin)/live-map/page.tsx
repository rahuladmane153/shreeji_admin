'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { Spinner, PageHeader, FadeIn } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false, loading: () => <Spinner /> });

const LEGEND = [
  { key: 'active', label: 'Active', color: '#16a34a' },
  { key: 'locked', label: 'Locked', color: '#dc2626' },
  { key: 'disabled', label: 'Disabled', color: '#ea580c' },
  { key: 'offline', label: 'Offline', color: '#94a3b8' },
];

export default function LiveMapPage() {
  const [data, setData] = useState<any>(null);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [error, setError] = useState('');

  function load() {
    api.get('/tracking/live-map').then((res) => setData(res.data.data)).catch((err) => setError(apiError(err)));
    api.get('/tracking/geofences').then((res) => setGeofences(res.data.data)).catch(() => {});
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <Spinner />;

  return (
    <div>
      <PageHeader title="Live Map" description="Real-time device locations, refreshed automatically.">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '3s' }} /> Auto-refresh 15s
        </span>
      </PageHeader>

      <FadeIn>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-3 px-5">
              <span className="text-sm font-medium">Live Devices: {data.total}</span>
              {LEGEND.map((l) => (
                <span key={l.key} className="flex items-center gap-1.5 text-sm">
                  <span className="relative inline-flex h-2.5 w-2.5">
                    {l.key === 'active' && (
                      <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full" style={{ background: l.color }} />
                    )}
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                  </span>
                  {l.label} ({data.summary[l.key] ?? 0})
                </span>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div style={{ height: '70vh' }}>
            <LiveMap markers={data.markers} geofences={geofences} />
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
