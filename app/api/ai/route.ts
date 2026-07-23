import { NextResponse } from 'next/server';
import { CohereClient } from 'cohere-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { coefficients, worstTrigger, userText, triggerType } = body as {
      coefficients: { sleep: number; stress: number; intercept?: number };
      worstTrigger: string;
      userText: string;
      triggerType: string;
    };

    if (!coefficients || !worstTrigger || userText == null || triggerType == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Cohere API key not configured' }, { status: 500 });
    }

    const cohere = new CohereClient({ token: apiKey });

    const systemPrompt = `You are a data-driven behavioral psychologist. Regression analysis shows Sleep weight = ${coefficients.sleep}, Stress weight = ${coefficients.stress}. The user's worst trigger is ${worstTrigger}. If user sent text: "${userText}" and trigger is "${triggerType}". Generate a JSON response with exactly these keys: 'prescription' (1-sentence morning action), 'grounding' (15-second breathing mantra), 'reframed' (rewrite their angry text into a diplomatic message), 'insight' (1-sentence weekly insight). Output ONLY valid JSON. No markdown, no extra text.`;

    const response = await cohere.chat({
      model: 'command-r-08-2024',
      message: systemPrompt,
      temperature: 0.7,
    });

    let text: string;
    if (response.text) {
      text = response.text;
    } else {
      const stream = await cohere.chatStream({
        model: 'command-r-08-2024',
        message: systemPrompt,
        temperature: 0.7,
      });
      let full = '';
      for await (const chunk of stream) {
        if (chunk.eventType === 'text-generation') {
          full += chunk.text;
        }
      }
      text = full;
    }

    // Strip markdown fences if present
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    let parsed: { prescription: string; grounding: string; reframed: string; insight: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON object from text
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return NextResponse.json({ error: 'AI returned invalid JSON', raw: text }, { status: 502 });
      }
    }

    return NextResponse.json({
      prescription: parsed.prescription ?? '',
      grounding: parsed.grounding ?? '',
      reframed: parsed.reframed ?? '',
      insight: parsed.insight ?? '',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
