'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MoreVertical, Eye, KeyRound } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { StatusBadge, Spinner, EmptyState, Pagination, PageHeader, FadeIn } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ResetPasswordDialog from '@/components/ResetPasswordDialog';
import { fmtDate, initials } from '@/lib/format';

type Customer = {
  id: number;
  full_name: string | null;
  mobile: string;
  email: string | null;
  city: string | null;
  kyc_status: string;
  status: string;
  onboarded_at: string;
};

const KYC_FILTERS = ['all', 'not_started', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected'];

export default function CustomersPage() {
  const router = useRouter();
  const [items, setItems] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kyc, setKyc] = useState('all');
  const [page, setPage] = useState(1);
  const [resetCustomer, setResetCustomer] = useState<Customer | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/customer/customers', { params: { search, kyc_status: kyc === 'all' ? '' : kyc, page } })
      .then((res) => {
        setItems(res.data.data.items);
        setMeta(res.data.data.meta);
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [search, kyc, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <PageHeader title="Customers" description="Everyone onboarded through the mobile app." />

      <FadeIn>
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, mobile or email…"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
            </div>
            <Select value={kyc} onValueChange={(v) => { setPage(1); setKyc(v); }}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KYC_FILTERS.map((f) => (
                  <SelectItem key={f} value={f} className="capitalize">
                    {f === 'all' ? 'All KYC statuses' : f.replace(/_/g, ' ')}
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
            <EmptyState message="No customers found" icon={Search} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Onboarded</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{initials(c.full_name || c.mobile)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{c.full_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{c.email || 'No email'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{c.mobile}</TableCell>
                    <TableCell>{c.city || '—'}</TableCell>
                    <TableCell><StatusBadge status={c.kyc_status} /></TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(c.onboarded_at)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/customers/${c.id}`)}>
                            <Eye className="h-4 w-4" /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetCustomer(c)}>
                            <KeyRound className="h-4 w-4" /> Reset password
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination meta={meta} onPage={setPage} />
        </Card>
      </FadeIn>

      <ResetPasswordDialog
        customer={resetCustomer}
        open={!!resetCustomer}
        onOpenChange={(o) => !o && setResetCustomer(null)}
      />
    </div>
  );
}
