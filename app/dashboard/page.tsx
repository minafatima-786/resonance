'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { AppNav } from '@/components/app-nav';
import { supabase } from '@/lib/supabase-client';
import type { AnalyzeResponse } from '@/lib/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { Moon, Zap, AlertTriangle, Loader2, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        const res = await fetch('/api/analyze', {
          headers: { Authorization: `Bearer ${session.session?.access_token ?? ''}` },
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Failed (${res.status})`);
        }
        const json: AnalyzeResponse = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analysis');
      } finally {
        setFetching(false);
      }
    })();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sleepImpact = data ? Math.round(data.coefficients.sleep * 10) : 0;
  const stressImpact = data ? Math.round(data.coefficients.stress * 10) : 0;

  return (
    <div className="min-h-screen pb-12">
      <AppNav />
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="heading-font text-3xl font-bold text-primary sm:text-4xl">Your Emotional Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Patterns from your last 14 entries. The more you check in, the smarter this gets.
          </p>
        </div>

        {fetching && (
          <div className="glass-card flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && !fetching && (
          <div className="glass-card p-8 text-center">
            <p className="text-destructive">{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Need more data? Complete onboarding or add a few check-ins.
            </p>
            <Link href="/onboarding" className="mt-4 inline-flex items-center gap-2 text-primary font-medium hover:underline">
              Go to onboarding <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {data && !fetching && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                icon={<Moon className="h-5 w-5" />}
                label="Sleep Impact"
                value={sleepImpact}
                hint="Regression coefficient × 10"
                color="primary"
              />
              <StatCard
                icon={<Zap className="h-5 w-5" />}
                label="Stress Impact"
                value={stressImpact}
                hint="Regression coefficient × 10"
                color="accent"
              />
              <StatCard
                icon={<AlertTriangle className="h-5 w-5" />}
                label="Worst Trigger"
                value={data.worstTrigger}
                hint="Lowest mood category"
                color="destructive"
                isText
              />
            </div>

            {/* Mood chart */}
            <div className="glass-card animate-fade-in-up p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="heading-font text-xl font-bold text-primary">Mood Over Time</h2>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  R² = {data.rSquared.toFixed(2)}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(173 80% 40%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(173 80% 40%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(173 20% 85%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(173 10% 40%)' }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'hsl(173 10% 40%)' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid hsl(173 20% 85%)',
                      background: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mood"
                    stroke="hsl(173 80% 35%)"
                    strokeWidth={3}
                    fill="url(#moodGradient)"
                    dot={{ fill: 'hsl(38 92% 50%)', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: 'hsl(173 80% 30%)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Quick actions */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/checkin" className="glass-card group flex items-center justify-between p-5 transition-all hover:shadow-lg hover:shadow-primary/15">
                <div>
                  <p className="font-semibold text-primary">Daily Check-in</p>
                  <p className="text-sm text-muted-foreground">Log today&apos;s sleep, stress & mood</p>
                </div>
                <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/redbutton" className="glass-card group flex items-center justify-between p-5 transition-all hover:shadow-lg hover:shadow-destructive/15">
                <div>
                  <p className="font-semibold text-destructive">Emergency Red Button</p>
                  <p className="text-sm text-muted-foreground">Feeling overwhelmed? Get help now</p>
                </div>
                <ArrowRight className="h-5 w-5 text-destructive transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  color,
  isText,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint: string;
  color: 'primary' | 'accent' | 'destructive';
  isText?: boolean;
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/15 text-accent',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <div className="glass-card animate-fade-in-up p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${colorClasses[color]}`}>
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="heading-font mt-1 text-3xl font-bold text-foreground">
        {isText ? value : `${typeof value === 'number' && value > 0 ? '+' : ''}${value}`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p>
    </div>
  );
}
