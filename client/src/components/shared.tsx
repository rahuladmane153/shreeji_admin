'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ChevronLeft, ChevronRight, Inbox, LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { statusVariant, prettify } from '@/lib/format';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status?: string | null }) {
  const variant = statusVariant(status);
  return (
    <Badge variant={variant} className="capitalize">
      <span
        className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', {
          'bg-success': variant === 'success',
          'bg-destructive': variant === 'destructive',
          'bg-warning': variant === 'warning',
          'bg-primary': variant === 'default',
          'bg-muted-foreground': variant === 'muted' || variant === 'secondary',
        })}
      />
      {prettify(status) || '—'}
    </Badge>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  hint,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: 'primary' | 'success' | 'warning' | 'destructive' | 'muted';
  hint?: string;
  delay?: number;
}) {
  const tones: Record<string, string> = {
    primary: 'from-primary/10 to-primary/5 text-primary',
    success: 'from-success/10 to-success/5 text-success',
    warning: 'from-warning/15 to-warning/5 text-warning',
    destructive: 'from-destructive/10 to-destructive/5 text-destructive',
    muted: 'from-muted to-muted/40 text-muted-foreground',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="card-hover overflow-hidden">
        <CardContent className="flex items-center gap-4 p-5">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br', tones[tone])}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-20', className)}>
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}

export function EmptyState({ message, icon: Icon = Inbox }: { message: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function Pagination({
  meta,
  onPage,
}: {
  meta?: { page: number; total_pages: number; total: number };
  onPage: (p: number) => void;
}) {
  if (!meta) return null;
  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
      <span>{meta.total} record(s)</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[90px] text-center">
          Page {meta.page} of {meta.total_pages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={meta.page >= meta.total_pages}
          onClick={() => onPage(meta.page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Wraps page content with a subtle fade/slide-in. */
export function FadeIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
