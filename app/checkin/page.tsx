'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { AppNav } from '@/components/app-nav';
import { supabase } from '@/lib/supabase-client';
import { TRIGGER_CATEGORIES, type TriggerCategory } from '@/lib/types';
import { Moon, Zap, Smile, AlertCircle, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

export default function CheckinPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sleep, setSleep] = useState(7);
  const [stress, setStress] = useState(5);
  const [mood, setMood] = useState(6);
  const [trigger, setTrigger] = useState<TriggerCategory>('None');
  const [existingId, setExistingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingToday(true);
      const today = new Date().toISOString().slice(0, 10);
      const { data, error: queryError } = await supabase
        .from('daily_logs')
        .select('id, sleep, stress, mood, trigger_category')
        .eq('date', today)
        .maybeSingle();

      if (queryError) {
        setError(queryError.message);
      } else if (data) {
        setExistingId(data.id);
        setSleep(Number(data.sleep ?? 7));
        setStress(Number(data.stress ?? 5));
        setMood(Number(data.mood ?? 6));
        setTrigger((data.trigger_category as TriggerCategory) ?? 'None');
      }
      setLoadingToday(false);
    })();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const payload = {
        date: today,
        sleep,
        stress,
        mood,
        trigger_category: trigger,
        is_baseline: false,
      };

      if (existingId) {
        const { error: updateError } = await supabase
          .from('daily_logs')
          .update(payload)
          .eq('id', existingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('daily_logs').insert(payload);
        if (insertError) throw insertError;
      }

      setSaved(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save check-in');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || loadingToday) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <AppNav />
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="heading-font text-3xl font-bold text-primary sm:text-4xl">Daily Check-in</h1>
          <p className="mt-2 text-muted-foreground">
            {existingId ? 'You already logged today. Update your values below.' : 'How are you feeling right now?'}
          </p>
        </div>

        {saved ? (
          <div className="glass-card animate-fade-in-up flex flex-col items-center gap-4 p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-primary animate-pulse-heart" />
            <h2 className="heading-font text-2xl font-bold text-primary">Saved!</h2>
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card space-y-8 p-6 sm:p-10">
            <SliderField
              icon={<Moon className="h-5 w-5 text-primary" />}
              label="Sleep"
              value={sleep}
              min={0}
              max={12}
              step={0.5}
              unit="hrs"
              onChange={setSleep}
              accent="primary"
            />
            <SliderField
              icon={<Zap className="h-5 w-5 text-accent" />}
              label="Stress"
              value={stress}
              min={0}
              max={10}
              step={0.5}
              unit="/10"
              onChange={setStress}
              accent="accent"
            />
            <SliderField
              icon={<Smile className="h-5 w-5 text-primary" />}
              label="Mood"
              value={mood}
              min={0}
              max={10}
              step={0.5}
              unit="/10"
              onChange={setMood}
              accent="primary"
            />

            {/* Trigger dropdown */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-foreground/80">Trigger Category</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {TRIGGER_CATEGORIES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrigger(t)}
                    className={`rounded-xl py-2.5 text-sm font-medium transition-all ${
                      trigger === t
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-white/60 text-foreground/60 hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="animate-fade-in rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {existingId ? 'Update check-in' : 'Save check-in'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        )}
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
