import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const supabase = createServerClient(token || undefined);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    const { data: logs, error: logsError } = await supabase
      .from('daily_logs')
      .select('date, sleep, stress, mood, trigger_category')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .limit(14);

    if (logsError) throw logsError;
    if (!logs || logs.length < 2) {
      return NextResponse.json({ error: 'Not enough data' }, { status: 400 });
    }

    // Build regression: mood ~ sleep + stress (multiple linear regression via normal equations)
    const valid = logs.filter((l) => l.mood != null && l.sleep != null && l.stress != null);
    if (valid.length < 2) {
      return NextResponse.json({ error: 'Not enough data' }, { status: 400 });
    }

    // Multiple linear regression using least squares (X = [1, sleep, stress], y = mood)
    const n = valid.length;
    let sX1 = 0, sX2 = 0, sY = 0, sX1Y = 0, sX2Y = 0, sX1X2 = 0, sX1Sq = 0, sX2Sq = 0;
    for (const l of valid) {
      const x1 = Number(l.sleep);
      const x2 = Number(l.stress);
      const y = Number(l.mood);
      sX1 += x1; sX2 += x2; sY += y;
      sX1Y += x1 * y; sX2Y += x2 * y; sX1X2 += x1 * x2;
      sX1Sq += x1 * x1; sX2Sq += x2 * x2;
    }
    // Normal equations matrix (3x3): [n, sX1, sX2; sX1, sX1Sq, sX1X2; sX2, sX1X2, sX2Sq] * [b0,b1,b2] = [sY, sX1Y, sX2Y]
    const A = [
      [n, sX1, sX2],
      [sX1, sX1Sq, sX1X2],
      [sX2, sX1X2, sX2Sq],
    ];
    const B = [sY, sX1Y, sX2Y];
    const coeffs = solve3x3(A, B);
    if (!coeffs) {
      return NextResponse.json({ error: 'Regression failed' }, { status: 500 });
    }
    const [intercept, sleepCoef, stressCoef] = coeffs;

    // R-squared
    const yMean = sY / n;
    let ssTot = 0, ssRes = 0;
    for (const l of valid) {
      const yPred = intercept + sleepCoef * Number(l.sleep) + stressCoef * Number(l.stress);
      ssRes += (Number(l.mood) - yPred) ** 2;
      ssTot += (Number(l.mood) - yMean) ** 2;
    }
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    // Worst trigger: the trigger category with lowest average mood
    const triggerMap: Record<string, { sum: number; count: number }> = {};
    for (const l of logs) {
      const t = l.trigger_category || 'None';
      if (!triggerMap[t]) triggerMap[t] = { sum: 0, count: 0 };
      triggerMap[t].sum += Number(l.mood ?? 0);
      triggerMap[t].count += 1;
    }
    let worstTrigger = 'None';
    let worstMood = Infinity;
    for (const [t, v] of Object.entries(triggerMap)) {
      const avg = v.sum / v.count;
      if (v.count > 0 && avg < worstMood && t !== 'None') {
        worstMood = avg;
        worstTrigger = t;
      }
    }
    if (worstMood === Infinity) worstTrigger = 'None';

    return NextResponse.json({
      coefficients: {
        sleep: Math.round(sleepCoef * 1000) / 1000,
        stress: Math.round(stressCoef * 1000) / 1000,
        intercept: Math.round(intercept * 1000) / 1000,
      },
      rSquared: Math.round(rSquared * 1000) / 1000,
      worstTrigger,
      data: logs.map((l) => ({
        date: l.date,
        mood: Number(l.mood ?? 0),
        sleep: Number(l.sleep ?? 0),
        stress: Number(l.stress ?? 0),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Solve 3x3 linear system via Gaussian elimination
function solve3x3(A: number[][], B: number[]): number[] | null {
  const m = A.map((row, i) => [...row, B[i]]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    [m[col], m[pivot]] = [m[pivot], m[col]];
    if (Math.abs(m[col][col]) < 1e-10) return null;
    for (let r = col + 1; r < 3; r++) {
      const factor = m[r][col] / m[col][col];
      for (let c = col; c <= 3; c++) {
        m[r][c] -= factor * m[col][c];
      }
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let sum = m[i][3];
    for (let j = i + 1; j < 3; j++) sum -= m[i][j] * x[j];
    x[i] = sum / m[i][i];
  }
  return x;
}
