'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type DailyLog = {
  id: number;
  user_id: string;
  date: string;
  sleep: number | null;
  stress: number | null;
  mood: number | null;
  trigger_category: string | null;
  is_baseline: boolean;
  created_at: string;
};
