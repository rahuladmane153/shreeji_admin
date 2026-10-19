'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Copy, Check, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiError } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Customer = { id: number; full_name?: string | null; mobile?: string | null };

export default function ResetPasswordDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [generate, setGenerate] = useState(true);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ password: string; generated: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset local state whenever the dialog opens for a (new) customer
  useEffect(() => {
    if (open) {
      setGenerate(true);
      setPassword('');
      setResult(null);
      setCopied(false);
    }
  }, [open, customer?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    if (!generate && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/customer/customers/${customer.id}/reset-password`, {
        password: generate ? '' : password,
      });
      setResult({ password: data.data.password, generated: data.data.generated });
      toast.success('Password reset — all sessions signed out');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Reset Password
          </DialogTitle>
          <DialogDescription>
            {customer?.full_name || customer?.mobile
              ? `For ${customer?.full_name || ''} ${customer?.mobile ? `(${customer.mobile})` : ''}`.trim()
              : 'Reset the customer login password.'}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-xs font-medium text-muted-foreground">New password</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <code className="select-all font-mono text-lg font-semibold tracking-wide">{result.password}</code>
                <Button type="button" variant="outline" size="sm" onClick={copy}>
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this with the customer. They were signed out of all devices and must log in again with this
              password. It won&apos;t be shown again.
            </p>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
              <input
                type="checkbox"
                checked={generate}
                onChange={(e) => setGenerate(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Wand2 className="h-4 w-4 text-primary" /> Generate a secure password
                </span>
                <span className="text-xs text-muted-foreground">Recommended — a strong temporary password is created.</span>
              </span>
            </label>

            {!generate && (
              <div className="space-y-1.5">
                <Label>New password</Label>
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoFocus
                />
              </div>
            )}

            <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              This signs the customer out of all devices. They must log in again with the new password.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
