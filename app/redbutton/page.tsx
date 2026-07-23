'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { AppNav } from '@/components/app-nav';
import { supabase } from '@/lib/supabase-client';
import { TRIGGER_CATEGORIES, type TriggerCategory, type AiResponse } from '@/lib/types';
import { AlertTriangle, Loader2, Sparkles, Heart, Lightbulb, Sunrise, Send } from 'lucide-react';

export default function RedButtonPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [text, setText] = useState('');
  const [trigger, setTrigger] = useState<TriggerCategory>('Work');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coefficients, setCoefficients] = useState<{ sleep: number; stress: number } | null>(null);
  const [worstTrigger, setWorstTrigger] = useState<string>('None');

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const res = await fetch('/api/analyze', {
          headers: { Authorization: `Bearer ${session.session?.access_token ?? ''}` },
        });
        if (res.ok) {
          const json = await res.json();
          setCoefficients(json.coefficients);
          setWorstTrigger(json.worstTrigger ?? 'None');
        }
      } catch {
        // Non-critical — we can still submit without coefficients
      }
    })();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coefficients: coefficients ?? { sleep: 0, stress: 0 },
          worstTrigger,
          userText: text,
          triggerType: trigger,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }

      const json: AiResponse = await res.json();
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
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
    <div className="min-h-screen pb-12">
      <AppNav />
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <div className="mb-8 animate-fade-in-up text-center">
          <div className="animate-pulse-heart mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-destructive to-destructive/80 text-white shadow-lg shadow-destructive/30">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="heading-font text-3xl font-bold text-destructive sm:text-4xl">Emergency Red Button</h1>
          <p className="mt-2 text-muted-foreground">
            Vent below. Our AI will help you reframe, ground, and plan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-5 p-6 sm:p-8">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/80">
              What&apos;s going on? Let it out.
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              required
              placeholder="I'm so frustrated because..."
              className="w-full resize-none rounded-xl border border-primary/20 bg-white/70 p-4 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/80">Trigger Category</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TRIGGER_CATEGORIES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrigger(t)}
                  className={`rounded-xl py-2.5 text-sm font-medium transition-all ${
                    trigger === t
                      ? 'bg-destructive text-destructive-foreground shadow-md'
                      : 'bg-white/60 text-foreground/60 hover:bg-destructive/10 hover:text-destructive'
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
            disabled={submitting || !text.trim()}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3.5 text-sm font-semibold text-destructive-foreground shadow-lg shadow-destructive/30 transition-all hover:bg-destructive/90 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing your patterns...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Help me reframe this
              </>
            )}
          </button>
        </form>

        {result && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ResultCard
              icon={<Sparkles className="h-5 w-5" />}
              title="Diplomatic Version"
              text={result.reframed}
              color="primary"
              delay="0s"
            />
            <ResultCard
              icon={<Heart className="h-5 w-5" />}
              title="Grounding Mantra"
              text={result.grounding}
              color="accent"
              delay="0.1s"
            />
            <ResultCard
              icon={<Lightbulb className="h-5 w-5" />}
              title="Insight"
              text={result.insight}
              color="primary"
              delay="0.2s"
            />
            <ResultCard
              icon={<Sunrise className="h-5 w-5" />}
              title="Morning Prescription"
              text={result.prescription}
              color="accent"
              delay="0.3s"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  icon,
  title,
  text,
  color,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  color: 'primary' | 'accent';
  delay: string;
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/15 text-accent',
  };
  return (
    <div className="glass-card animate-fade-in-up p-5" style={{ animationDelay: delay }}>
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="heading-font text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/70">{text}</p>
    </div>
  );
}
