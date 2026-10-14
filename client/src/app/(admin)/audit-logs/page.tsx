'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, apiError } from '@/lib/api';
import { Spinner, EmptyState, Pagination, StatusBadge, PageHeader, FadeIn } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmtDate, prettify } from '@/lib/format';

export default function AuditLogsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actorType, setActorType] = useState('all');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/master/audit-logs', { params: { actor_type: actorType === 'all' ? '' : actorType, page } })
      .then((res) => {
        setItems(res.data.data.items);
        setMeta(res.data.data.meta);
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [actorType, page]);

  useEffect(load, [load]);

  return (
    <div>
      <PageHeader title="Audit Logs" description="A trail of every admin, customer and system action." />

      <FadeIn>
        <Card>
          <div className="border-b p-4">
            <Select value={actorType} onValueChange={(v) => { setPage(1); setActorType(v); }}>
              <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actors</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <Spinner />
          ) : error ? (
            <p className="p-6 text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <EmptyState message="No audit logs yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(l.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={l.actor_type} />
                        <span className="text-sm">{l.actor_name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{prettify(l.action)}</TableCell>
                    <TableCell className="text-muted-foreground">{l.entity_type ? `${l.entity_type} #${l.entity_id}` : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.service || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.ip_address || '—'}</TableCell>
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
