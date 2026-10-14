'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Trash2, MapPin, Bell, LocateFixed, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiError } from '@/lib/api';
import { Spinner, EmptyState, StatusBadge, PageHeader, FadeIn } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { fmtDate } from '@/lib/format';

const GeofencePicker = dynamic(() => import('@/components/GeofencePicker'), {
  ssr: false,
  loading: () => <div className="flex h-[300px] items-center justify-center rounded-lg bg-muted"><Spinner /></div>,
});

// Nagpur as a sensible default center
const DEFAULT = { lat: 21.1458, lng: 79.0882 };

const emptyForm = () => ({
  name: '',
  description: '',
  device_id: 'all',
  center_latitude: DEFAULT.lat,
  center_longitude: DEFAULT.lng,
  radius_meters: 500,
  alert_on: 'both',
});

type Device = { id: number; device_code: string; customer?: { full_name?: string; mobile?: string }; last_latitude?: number | null; last_longitude?: number | null };

export default function GeofencingPage() {
  const [tab, setTab] = useState<'fences' | 'alerts'>('fences');
  const [fences, setFences] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.get('/tracking/geofences'), api.get('/tracking/alerts')])
      .then(([g, a]) => {
        setFences(g.data.data);
        setAlerts(a.data.data.items);
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  // Devices for the picker (first 100)
  useEffect(() => {
    api.get('/device/devices', { params: { limit: 100 } }).then((res) => setDevices(res.data.data.items)).catch(() => {});
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setOpen(true);
  }

  // When a specific device is chosen, jump the map to its last known location
  function onDeviceChange(value: string) {
    const next = { ...form, device_id: value };
    if (value !== 'all') {
      const d = devices.find((x) => String(x.id) === value);
      if (d?.last_latitude != null && d?.last_longitude != null) {
        next.center_latitude = Number(d.last_latitude);
        next.center_longitude = Number(d.last_longitude);
      }
    }
    setForm(next);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, center_latitude: pos.coords.latitude, center_longitude: pos.coords.longitude })),
      () => toast.error('Could not get your location')
    );
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/tracking/geofences', {
        name: form.name,
        description: form.description,
        device_id: form.device_id === 'all' ? null : Number(form.device_id),
        center_latitude: Number(form.center_latitude),
        center_longitude: Number(form.center_longitude),
        radius_meters: Number(form.radius_meters),
        alert_on: form.alert_on,
      });
      toast.success('Geofence created');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this geofence?')) return;
    try {
      await api.delete(`/tracking/geofences/${id}`);
      toast.success('Geofence deleted');
    } catch (err) {
      toast.error(apiError(err));
    }
    load();
  }

  async function ack(id: number) {
    try {
      await api.post(`/tracking/alerts/${id}/acknowledge`);
      toast.success('Alert acknowledged');
    } catch (err) {
      toast.error(apiError(err));
    }
    load();
  }

  const deviceLabel = (d: Device) => `${d.customer?.full_name || d.customer?.mobile || 'Unknown'} · ${d.device_code}`;
  const fenceScope = (g: any) => {
    if (!g.device_id) return 'All devices';
    const d = devices.find((x) => x.id === g.device_id);
    return d ? deviceLabel(d) : `Device #${g.device_id}`;
  };

  if (loading) return <Spinner />;
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <PageHeader title="Geofencing" description="Virtual boundaries and entry/exit alerts.">
        {tab === 'fences' && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Geofence
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 inline-flex rounded-lg border bg-card p-1">
        <button
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'fences' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setTab('fences')}
        >
          Geofences ({fences.length})
        </button>
        <button
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'alerts' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setTab('alerts')}
        >
          Alerts ({alerts.length})
        </button>
      </div>

      <FadeIn key={tab}>
        <Card>
          {tab === 'fences' ? (
            fences.length === 0 ? (
              <EmptyState message="No geofences created yet" icon={MapPin} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Applies To</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead>Alert On</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fences.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm">
                          {g.device_id ? <Smartphone className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                          {fenceScope(g)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {g.center_latitude.toFixed(4)}, {g.center_longitude.toFixed(4)}
                      </TableCell>
                      <TableCell>{g.radius_meters} m</TableCell>
                      <TableCell className="capitalize">{g.alert_on}</TableCell>
                      <TableCell>{g.is_active ? <StatusBadge status="active" /> : <StatusBadge status="disabled" />}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(g.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : alerts.length === 0 ? (
            <EmptyState message="No geofence alerts" icon={Bell} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Geofence</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell><StatusBadge status={a.event === 'enter' ? 'approved' : 'rejected'} /></TableCell>
                    <TableCell>{a.geofence}</TableCell>
                    <TableCell>{a.device_code}</TableCell>
                    <TableCell>{a.customer_name || a.mobile}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(a.recorded_at)}</TableCell>
                    <TableCell className="text-right">
                      {a.acknowledged_at ? (
                        <span className="text-xs text-muted-foreground">Acknowledged</span>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => ack(a.id)}>Acknowledge</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </FadeIn>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Geofence</DialogTitle>
            <DialogDescription>Pick a device, click the map to set the center, then choose the radius.</DialogDescription>
          </DialogHeader>

          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office zone" required />
              </div>
              <div className="space-y-1.5">
                <Label>Apply to</Label>
                <Select value={form.device_id} onValueChange={onDeviceChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">All devices</SelectItem>
                    {devices.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{deviceLabel(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Center location</Label>
                <Button type="button" variant="ghost" size="sm" onClick={useMyLocation}>
                  <LocateFixed className="h-4 w-4" /> Use my location
                </Button>
              </div>
              <div className="overflow-hidden rounded-lg border">
                <GeofencePicker
                  lat={form.center_latitude}
                  lng={form.center_longitude}
                  radius={Number(form.radius_meters)}
                  onChange={(lat, lng) => setForm((f) => ({ ...f, center_latitude: lat, center_longitude: lng }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Tap the map or drag the pin · Lat {form.center_latitude.toFixed(5)}, Lng {form.center_longitude.toFixed(5)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Radius</Label>
                <span className="text-sm font-medium text-primary">
                  {form.radius_meters >= 1000 ? `${(form.radius_meters / 1000).toFixed(1)} km` : `${form.radius_meters} m`}
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={5000}
                step={50}
                value={form.radius_meters}
                onChange={(e) => setForm({ ...form, radius_meters: Number(e.target.value) })}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>50 m</span>
                <span>5 km</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Alert On</Label>
                <Select value={form.alert_on} onValueChange={(v) => setForm({ ...form, alert_on: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Enter &amp; Exit</SelectItem>
                    <SelectItem value="enter">Enter</SelectItem>
                    <SelectItem value="exit">Exit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create Geofence'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
