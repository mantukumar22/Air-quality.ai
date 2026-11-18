import { NextRequest, NextResponse } from 'next/server';
import { generateTailoredRecommendations } from '@/lib/gemini';
import { getClientIp, recommendRateLimiter } from '@/lib/rateLimit';
import { recommendRequestSchema } from '@/lib/schemas';

/**
 * POST /api/recommend
 * Generates structured, Zod-validated winter-smog and indoor air recommendations via Gemini.
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rate = recommendRateLimiter.check(clientIp);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for plan generation. Please wait a minute and retry.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rate.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = recommendRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Invalid household profile or AQI context.',
      },
      { status: 400 }
    );
  }

  try {
    const plan = await generateTailoredRecommendations(parsed.data.profile, parsed.data.aqi);
    return NextResponse.json({ plan }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'AI recommendation service is currently unavailable.';
    const isConfigError = message.includes('GEMINI_API_KEY');
    return NextResponse.json(
      { error: message },
      { status: isConfigError ? 503 : 502 }
    );
  }
}
