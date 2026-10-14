'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, Smartphone, Lock, ShieldOff, Battery, Wifi } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { StatusBadge, Spinner, EmptyState, Pagination, PageHeader, StatCard, FadeIn } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { timeAgo } from '@/lib/format';

const STATUSES = ['all', 'active', 'locked', 'disabled', 'released', 'revoked'];

export default function DevicesPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/device/devices', { params: { status: status === 'all' ? '' : status, search, page } })
      .then((res) => {
        setItems(res.data.data.items);
        setMeta(res.data.data.meta);
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [status, search, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api.get('/device/devices/stats').then((res) => setStats(res.data.data)).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader title="Devices" description="Monitor and manage every registered device." />

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard label="Total" value={stats.total} icon={Smartphone} delay={0} />
          <StatCard label="Active" value={stats.active} icon={Wifi} tone="success" delay={0.05} />
          <StatCard label="Locked" value={stats.locked} icon={Lock} tone="destructive" delay={0.1} />
          <StatCard label="Disabled" value={stats.disabled} icon={ShieldOff} tone="warning" delay={0.15} />
          <StatCard label="Offline" value={stats.offline} icon={Battery} tone="muted" delay={0.2} />
        </div>
      )}

      <FadeIn delay={0.1}>
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search device code or model…"
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              />
            </div>
            <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v); }}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s === 'all' ? 'All statuses' : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <Spinner />
          ) : error ? (
            <p className="p-6 text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <EmptyState message="No devices found" icon={Smartphone} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Battery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uninstall Lock</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => router.push(`/devices/${d.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{d.device_code}</p>
                          <p className="text-xs text-muted-foreground">{d.device_model || '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{d.customer?.full_name || d.customer?.mobile || '—'}</TableCell>
                    <TableCell>{d.battery_level != null ? `${d.battery_level}%` : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <StatusBadge status={d.status} />
                        <StatusBadge status={d.connectivity} />
                      </div>
                    </TableCell>
                    <TableCell>{d.uninstall_protection ? '🔒 On' : '🔓 Off'}</TableCell>
                    <TableCell className="text-muted-foreground">{timeAgo(d.last_seen)}</TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination meta={meta} onPage={setPage} />
        </Card>
      </FadeIn>
    </div>
  );
}
