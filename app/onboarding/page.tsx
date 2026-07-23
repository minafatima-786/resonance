'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/components/auth-provider';
import { Brain, Moon, Zap, Smile, ArrowRight, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sleep, setSleep] = useState(7);
  const [stress, setStress] = useState(5);
  const [mood, setMood] = useState(6);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  const jitter = (base: number, range: number) => {
    const v = base + (Math.random() - 0.5) * 2 * range;
    return Math.round(v * 10) / 10;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const today = new Date();
      const rows = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const s = Math.min(12, Math.max(0, jitter(sleep, 1.2)));
        const st = Math.min(10, Math.max(0, jitter(stress, 1.5)));
        const m = Math.min(10, Math.max(0, jitter(mood, 1.5)));
        return {
          date: d.toISOString().slice(0, 10),
          sleep: s,
          stress: st,
          mood: m,
          trigger_category: 'None',
          is_baseline: true,
        };
      });

      const { error: insertError } = await supabase.from('daily_logs').insert(rows);
      if (insertError) throw insertError;

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save baseline. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float absolute -left-20 top-20 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="animate-float absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-accent/15 blur-3xl" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative mx-auto max-w-2xl animate-fade-in-up">
        <div className="mb-8 text-center">
          <div className="animate-float mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-3xl shadow-lg shadow-primary/30">
            🧠
          </div>
          <h1 className="heading-font text-3xl font-bold text-primary sm:text-4xl">Let&apos;s get to know you</h1>
          <p className="mt-3 text-muted-foreground">
            Tell us about your past week. We&apos;ll use this as your emotional baseline.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-8 p-6 sm:p-10">
          {/* Sleep slider */}
          <SliderField
            icon={<Moon className="h-5 w-5 text-primary" />}
            label="Average Sleep"
            value={sleep}
            min={4}
            max={10}
            step={0.5}
            unit="hrs"
            onChange={setSleep}
            accent="primary"
          />

          {/* Stress slider */}
          <SliderField
            icon={<Zap className="h-5 w-5 text-accent" />}
            label="Average Stress"
            value={stress}
            min={1}
            max={10}
            step={0.5}
            unit="/10"
            onChange={setStress}
            accent="accent"
          />

          {/* Mood slider */}
          <SliderField
            icon={<Smile className="h-5 w-5 text-primary" />}
            label="Average Mood"
            value={mood}
            min={1}
            max={10}
            step={0.5}
            unit="/10"
            onChange={setMood}
            accent="primary"
          />

          {error && (
            <div className="animate-fade-in rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-center text-xs text-muted-foreground">
              We&apos;ll generate 7 days of baseline entries with slight natural variation.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Create my baseline
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SliderField({
  icon,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  accent: 'primary' | 'accent';
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-foreground/80">{label}</span>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${accent === 'primary' ? 'bg-primary/10 text-primary' : 'bg-accent/15 text-accent'}`}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        className="resonance-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground/60">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
