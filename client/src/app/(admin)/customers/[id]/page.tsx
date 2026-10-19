'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Smartphone, KeyRound } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { Spinner, StatusBadge, FadeIn, Pagination } from '@/components/shared';
import DocViewer from '@/components/DocViewer';
import ResetPasswordDialog from '@/components/ResetPasswordDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtDate, initials } from '@/lib/format';

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value ?? '—'}</p>
    </div>
  );
}

function DeviceContactsTable({ customerId, device }: { customerId: number; device: any }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      api
        .get(`/customer/customers/${customerId}/devices/${device.id}/contacts`, {
          params: { page, limit: 25, search },
        })
        .then((res) => {
          if (cancelled) return;
          setItems(res.data.data.items);
          setMeta(res.data.data.meta);
        })
        .catch((err) => {
          if (!cancelled) setError(apiError(err));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerId, device.id, page, search]);

  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Contacts on {device.device_code || `Device ${device.id}`}</h3>
        <span className="text-xs text-muted-foreground">
          {device.contacts_count ?? 0} contacts · Last synced {fmtDate(device.contacts_synced_at)}
        </span>
      </div>
      <Input
        className="mb-3 max-w-sm"
        placeholder="Search contact name or phone number"
        value={search}
        onChange={(event) => {
          setPage(1);
          setSearch(event.target.value);
        }}
      />
      {error ? (
        <p className="py-4 text-sm text-destructive">{error}</p>
      ) : loading ? (
        <p className="py-4 text-sm text-muted-foreground">Loading contacts…</p>
      ) : items.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact Name</TableHead>
                <TableHead>Phone Numbers</TableHead>
                <TableHead>Synced At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((contact) => (
                <TableRow key={contact.contact_id}>
                  <TableCell className="font-medium">{contact.display_name || 'Unnamed contact'}</TableCell>
                  <TableCell>{contact.phones?.length ? contact.phones.join(', ') : 'No phone number'}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(contact.synced_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="py-4 text-sm text-muted-foreground">
          {search ? 'No contacts match your search.' : 'No contacts synced from this device.'}
        </p>
      )}
      {!error && !loading && <Pagination meta={meta} onPage={setPage} />}
    </section>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [c, setC] = useState<any>(null);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    api.get(`/customer/customers/${id}`).then((res) => setC(res.data.data)).catch((err) => setError(apiError(err)));
  }, [id]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!c) return <Spinner />;

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
          <KeyRound className="h-4 w-4" /> Reset Password
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/15 via-blue-500/10 to-transparent" />
        <CardContent className="-mt-10 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="h-20 w-20 border-4 border-card shadow">
                <AvatarFallback className="text-xl">{initials(c.full_name || c.mobile)}</AvatarFallback>
              </Avatar>
              <div className="pb-1">
                <h1 className="text-xl font-bold">{c.full_name || c.mobile}</h1>
                <p className="text-sm text-muted-foreground">{c.mobile}</p>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <StatusBadge status={c.kyc_status} />
              <StatusBadge status={c.status} />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
            <Field label="Email" value={c.email} />
            <Field label="Date of Birth" value={c.dob} />
            <Field label="Gender" value={c.gender} />
            <Field label="Pincode" value={c.pincode} />
            <Field label="City" value={c.city} />
            <Field label="State" value={c.state} />
            <Field label="Address" value={c.address} />
            <Field label="Onboarded" value={fmtDate(c.onboarded_at)} />
          </div>
        </CardContent>
      </Card>

      {c.kyc && (
        <Card>
          <CardHeader>
            <CardTitle>KYC Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              <Field label="Name on Document" value={c.kyc.name_on_document} />
              <Field label="DOB on Document" value={c.kyc.dob_on_document} />
              <Field label="Aadhaar" value={c.kyc.aadhaar_masked} />
              <Field label="PAN" value={c.kyc.pan_number} />
              <Field label="Address on Document" value={c.kyc.address_on_document} />
              <Field label="Selfie Captured" value={fmtDate(c.kyc.selfie_captured_at)} />
              <Field label="Submitted" value={fmtDate(c.kyc.submitted_at)} />
              <Field label="Reviewed" value={fmtDate(c.kyc.reviewed_at)} />
            </div>
            {c.kyc.review_remarks && (
              <p className="rounded-lg bg-muted p-3 text-sm">
                <span className="font-medium">Remarks:</span> {c.kyc.review_remarks}
              </p>
            )}
            <div>
              <p className="mb-3 text-sm font-semibold">Documents</p>
              <DocViewer documents={c.kyc.documents || []} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registered Devices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {c.devices?.length ? (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Battery</TableHead>
                  <TableHead>Synced Contacts</TableHead>
                  <TableHead>Contacts Synced</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.devices.map((d: any) => (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => router.push(`/devices/${d.id}`)}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        {d.device_code || d.id}
                      </span>
                    </TableCell>
                    <TableCell>{d.device_model || '—'}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell>{d.battery_level != null ? `${d.battery_level}%` : '—'}</TableCell>
                    <TableCell>{d.contacts_count ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(d.contacts_synced_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(d.last_seen)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="space-y-4 p-4">
              {c.devices.map((device: any) => (
                <DeviceContactsTable key={device.id} customerId={c.id} device={device} />
              ))}
            </div>
            </>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">No devices registered.</p>
          )}
        </CardContent>
      </Card>

      <ResetPasswordDialog
        customer={{ id: c.id, full_name: c.full_name, mobile: c.mobile }}
        open={resetOpen}
        onOpenChange={setResetOpen}
      />
    </FadeIn>
  );
}
