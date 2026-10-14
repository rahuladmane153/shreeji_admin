export function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function timeAgo(value?: string | null): string {
  if (!value) return 'never';
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'muted';

const VARIANTS: Record<string, Variant> = {
  // KYC
  not_started: 'muted',
  in_progress: 'warning',
  submitted: 'default',
  under_review: 'default',
  approved: 'success',
  rejected: 'destructive',
  // Device
  active: 'success',
  locked: 'destructive',
  disabled: 'warning',
  released: 'muted',
  revoked: 'destructive',
  blocked: 'destructive',
  // connectivity
  online: 'success',
  offline: 'muted',
};

export const statusVariant = (status?: string | null): Variant => VARIANTS[status || ''] || 'secondary';

export const prettify = (s?: string | null) =>
  (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const initials = (name?: string | null) =>
  (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
