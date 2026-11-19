import { NextRequest, NextResponse } from 'next/server';
import { formatGeminiApiError, generateTailoredRecommendations } from '@/lib/gemini';
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
    const message = 'Rate limit exceeded for plan generation. Please wait a minute and retry.';
    return NextResponse.json(
      {
        error: message,
        errorDetail: { code: 'RATE_LIMITED', message, retryable: true },
      },
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
    const message = 'Invalid JSON request body.';
    return NextResponse.json(
      {
        error: message,
        errorDetail: { code: 'INVALID_JSON', message, retryable: false },
      },
      { status: 400 }
    );
  }

  const parsed = recommendRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid household profile or AQI context.';
    return NextResponse.json(
      {
        error: message,
        errorDetail: { code: 'INVALID_REQUEST', message, retryable: false },
      },
      { status: 400 }
    );
  }

  try {
    const plan = await generateTailoredRecommendations(parsed.data.profile, parsed.data.aqi);
    return NextResponse.json({ plan }, { status: 200 });
  } catch (err) {
    const formatted = formatGeminiApiError(err);
    console.error('[api/recommend] Upstream AI error:', {
      code: formatted.code,
      statusCode: formatted.statusCode,
      message: formatted.message,
    });
    return NextResponse.json(
      {
        error: formatted.message,
        errorDetail: formatted.toErrorDetail(),
      },
      { status: formatted.statusCode }
    );
  }
}
