'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Smartphone, Lock, Unlock, ShieldOff, ShieldCheck, Trash2, Ban, Power, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiError } from '@/lib/api';
import { Spinner, StatusBadge, FadeIn } from '@/components/shared';
import ResetPasswordDialog from '@/components/ResetPasswordDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtDate, prettify } from '@/lib/format';

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value ?? '—'}</p>
    </div>
  );
}

const ACTIONS = [
  { command: 'lock', label: 'Lock App', icon: Lock, variant: 'destructive' as const },
  { command: 'unlock', label: 'Unlock App', icon: Unlock, variant: 'outline' as const },
  { command: 'disable', label: 'Disable App', icon: ShieldOff, variant: 'outline' as const },
  { command: 'enable', label: 'Enable App', icon: Power, variant: 'outline' as const },
  { command: 'allow_uninstall', label: 'Allow Uninstall', icon: Unlock, variant: 'outline' as const },
  { command: 'block_uninstall', label: 'Block Uninstall', icon: ShieldCheck, variant: 'outline' as const },
  { command: 'release', label: 'Release Device', icon: Ban, variant: 'outline' as const },
  { command: 'revoke', label: 'Revoke Device', icon: Trash2, variant: 'destructive' as const },
];

export default function DeviceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  function load() {
    api.get(`/device/devices/${id}`).then((res) => setD(res.data.data)).catch((err) => setError(apiError(err)));
    api.get(`/device/devices/${id}/commands`).then((res) => setHistory(res.data.data)).catch(() => {});
  }
  useEffect(load, [id]);

  async function issue(command: string, label: string) {
    if (!confirm(`Send "${label}" command to this device?`)) return;
    setBusy(command);
    try {
      await api.post(`/device/devices/${id}/commands`, { command });
      toast.success(`${label} queued`);
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy('');
    }
  }

  if (error) return <p className="text-destructive">{error}</p>;
  if (!d) return <Spinner />;

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {d.customer?.id && (
          <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
            <KeyRound className="h-4 w-4" /> Reset Customer Password
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Smartphone className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{d.device_code}</h1>
              <p className="text-sm text-muted-foreground">{d.manufacturer} {d.device_model}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={d.status} />
            <StatusBadge status={d.connectivity} />
          </div>
        </CardContent>
        <CardContent className="grid grid-cols-2 gap-5 border-t pt-6 md:grid-cols-4">
          <Field label="Customer" value={d.customer?.full_name || d.customer?.mobile} />
          <Field label="OS Version" value={d.os_version} />
          <Field label="App Version" value={d.app_version} />
          <Field label="Battery" value={d.battery_level != null ? `${d.battery_level}%${d.is_charging ? ' ⚡' : ''}` : '—'} />
          <Field label="Network" value={d.network_type} />
          <Field label="Uninstall Protection" value={d.uninstall_protection ? 'Enabled 🔒' : 'Disabled 🔓'} />
          <Field label="Last Seen" value={fmtDate(d.last_seen)} />
          <Field label="Registered" value={fmtDate(d.registered_at)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Synced Contacts</CardTitle>
          <CardDescription>
            {d.contacts?.length || 0} contacts · Last synced {fmtDate(d.contacts_synced_at)}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {d.contacts?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone Numbers</TableHead>
                  <TableHead>Synced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.contacts.map((contact: any) => (
                  <TableRow key={contact.contact_id}>
                    <TableCell className="font-medium">{contact.display_name || 'Unnamed contact'}</TableCell>
                    <TableCell>{Array.isArray(contact.phones) ? contact.phones.join(', ') : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(contact.synced_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">No contacts synced from this device.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device Management</CardTitle>
          <CardDescription>
            Commands are queued and delivered to the device agent on its next poll, then confirmed back to the server.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <Button key={a.command} variant={a.variant} size="sm" disabled={!!busy} onClick={() => issue(a.command, a.label)}>
              <a.icon className="h-4 w-4" />
              {busy === a.command ? '…' : a.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Command History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Command</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Executed</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.uuid}>
                    <TableCell className="font-medium">{prettify(h.command)}</TableCell>
                    <TableCell><StatusBadge status={h.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(h.issued_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(h.executed_at)}</TableCell>
                    <TableCell>{h.result_message || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">No commands issued yet.</p>
          )}
        </CardContent>
      </Card>

      {d.customer?.id && (
        <ResetPasswordDialog
          customer={{ id: d.customer.id, full_name: d.customer.full_name, mobile: d.customer.mobile }}
          open={resetOpen}
          onOpenChange={setResetOpen}
        />
      )}
    </FadeIn>
  );
}
