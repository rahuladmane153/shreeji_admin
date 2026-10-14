'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  Tooltip as RTooltip,
} from 'recharts';
import { Users, CheckCircle2, Clock, XCircle, Smartphone, ArrowRight, IdCard, Map } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { StatCard, Spinner, PageHeader, FadeIn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type Dash = {
  customers: { total: number; active: number; blocked: number };
  kyc: Record<string, number> & { pending_review: number };
  devices: { total: number; active: number; locked: number; disabled: number; offline: number };
};

const KYC_COLORS: Record<string, string> = {
  approved: 'hsl(142 71% 45%)',
  pending_review: 'hsl(221 83% 53%)',
  in_progress: 'hsl(38 92% 50%)',
  rejected: 'hsl(0 72% 51%)',
  not_started: 'hsl(215 16% 65%)',
};

export default function DashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/master/dashboard').then((res) => setData(res.data.data)).catch((err) => setError(apiError(err)));
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <Spinner />;

  const kycPie = [
    { name: 'Approved', key: 'approved', value: data.kyc.approved },
    { name: 'Pending Review', key: 'pending_review', value: data.kyc.pending_review },
    { name: 'In Progress', key: 'in_progress', value: data.kyc.in_progress },
    { name: 'Rejected', key: 'rejected', value: data.kyc.rejected },
    { name: 'Not Started', key: 'not_started', value: data.kyc.not_started },
  ].filter((d) => d.value > 0);

  const deviceBars = [
    { name: 'Active', value: data.devices.active, fill: 'hsl(142 71% 45%)' },
    { name: 'Locked', value: data.devices.locked, fill: 'hsl(0 72% 51%)' },
    { name: 'Disabled', value: data.devices.disabled, fill: 'hsl(38 92% 50%)' },
    { name: 'Offline', value: data.devices.offline, fill: 'hsl(215 16% 65%)' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of onboarding, KYC and device activity." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Customers" value={data.customers.total} icon={Users} delay={0} />
        <StatCard label="KYC Approved" value={data.kyc.approved} icon={CheckCircle2} tone="success" delay={0.05} />
        <StatCard label="Pending Review" value={data.kyc.pending_review} icon={Clock} tone="warning" hint="Submitted + under review" delay={0.1} />
        <StatCard label="Rejected" value={data.kyc.rejected} icon={XCircle} tone="destructive" delay={0.15} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* KYC donut */}
        <FadeIn delay={0.2} className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>KYC Status</CardTitle>
              <CardDescription>Distribution across all customers</CardDescription>
            </CardHeader>
            <CardContent>
              {kycPie.length ? (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={kycPie} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                        {kycPie.map((d) => (
                          <Cell key={d.key} fill={KYC_COLORS[d.key]} />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--popover))',
                          color: 'hsl(var(--popover-foreground))',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{data.customers.total}</span>
                    <span className="text-xs text-muted-foreground">Customers</span>
                  </div>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">No KYC data yet</p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                {kycPie.map((d) => (
                  <div key={d.key} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: KYC_COLORS[d.key] }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Device bars */}
        <FadeIn delay={0.25} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Device Fleet</CardTitle>
              <CardDescription>{data.devices.total} devices under management</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deviceBars}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <RTooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {deviceBars.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { href: '/kyc', title: 'Review KYC', desc: 'Approve or reject applications', icon: IdCard },
          { href: '/live-map', title: 'Live Map', desc: 'Real-time device locations', icon: Map },
          { href: '/devices', title: 'Manage Devices', desc: 'Lock, disable or allow uninstall', icon: Smartphone },
        ].map((q, i) => (
          <FadeIn key={q.href} delay={0.3 + i * 0.05}>
            <Link href={q.href}>
              <Card className="card-hover group h-full">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <q.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{q.title}</p>
                    <p className="text-sm text-muted-foreground">{q.desc}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </CardContent>
              </Card>
            </Link>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
