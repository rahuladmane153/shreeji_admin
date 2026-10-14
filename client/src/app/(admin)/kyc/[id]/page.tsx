'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiError } from '@/lib/api';
import { Spinner, StatusBadge, FadeIn } from '@/components/shared';
import DocViewer from '@/components/DocViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { fmtDate } from '@/lib/format';

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value ?? '—'}</p>
    </div>
  );
}

export default function KycDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [a, setA] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [remarks, setRemarks] = useState('');

  function load() {
    api.get(`/customer/kyc/${id}`).then((res) => setA(res.data.data)).catch((err) => setError(apiError(err)));
  }
  useEffect(load, [id]);

  async function act(action: 'approve' | 'reject') {
    setBusy(true);
    try {
      await api.post(`/customer/kyc/${id}/${action}`, { remarks });
      toast.success(action === 'approve' ? 'KYC approved' : 'KYC rejected');
      setRejectOpen(false);
      setRemarks('');
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-destructive">{error}</p>;
  if (!a) return <Spinner />;

  const canReview = a.status === 'submitted' || a.status === 'under_review';

  return (
    <FadeIn className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <h1 className="text-xl font-bold">{a.customer?.full_name || a.customer?.mobile}</h1>
            <p className="text-sm text-muted-foreground">{a.customer?.mobile}</p>
          </div>
          <StatusBadge status={a.status} />
        </CardContent>
        <CardContent className="grid grid-cols-2 gap-5 border-t pt-6 md:grid-cols-4">
          <Field label="Name on Document" value={a.name_on_document} />
          <Field label="DOB on Document" value={a.dob_on_document} />
          <Field label="Gender" value={a.gender_on_document} />
          <Field label="Aadhaar" value={a.aadhaar_masked} />
          <Field label="PAN" value={a.pan_number} />
          <Field label="Address" value={a.address_on_document} />
          <Field label="Declaration" value={a.declaration_accepted ? 'Accepted ✓' : 'Not accepted'} />
          <Field label="Submitted" value={fmtDate(a.submitted_at)} />
        </CardContent>
        {a.review_remarks && (
          <CardContent className="pt-0">
            <p className="rounded-lg bg-muted p-3 text-sm">
              <span className="font-medium">Remarks:</span> {a.review_remarks}
            </p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <DocViewer documents={a.documents || []} />
        </CardContent>
      </Card>

      {canReview && (
        <Card>
          <CardContent className="flex items-center justify-end gap-3 p-4">
            <Button variant="destructive" disabled={busy} onClick={() => setRejectOpen(true)}>
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button variant="success" disabled={busy} onClick={() => act('approve')}>
              <Check className="h-4 w-4" /> Approve KYC
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC application</DialogTitle>
            <DialogDescription>Add a reason so the customer knows what to correct.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason / remarks</Label>
            <Textarea className="h-28" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={() => act('reject')}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
