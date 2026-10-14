'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { StatusBadge, Spinner, EmptyState, Pagination, PageHeader, FadeIn } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmtDate, initials } from '@/lib/format';

const STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'in_progress', 'all'];

export default function KycPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('submitted');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/customer/kyc', { params: { status: status === 'all' ? '' : status, search, page } })
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

  return (
    <div>
      <PageHeader title="KYC Records" description="Review and action customer KYC applications." />

      <FadeIn>
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search customer name or mobile…"
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              />
            </div>
            <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v); }}>
              <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <Spinner />
          ) : error ? (
            <p className="p-6 text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <EmptyState message="No KYC applications found" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Aadhaar</TableHead>
                  <TableHead>PAN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => router.push(`/kyc/${a.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{initials(a.customer?.full_name || a.customer?.mobile)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{a.customer?.full_name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{a.customer?.mobile}</TableCell>
                    <TableCell>{a.aadhaar_masked || '—'}</TableCell>
                    <TableCell>{a.pan_number || '—'}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(a.submitted_at)}</TableCell>
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
