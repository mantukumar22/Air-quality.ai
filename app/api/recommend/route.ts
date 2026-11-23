/**
 * @fileoverview Tailored winter-smog action plan route handler (`POST /api/recommend`)
 * validating household input via Zod and returning structured Gemini JSON plans.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/apiResponse';
import { AppError, formatUpstreamAiError } from '@/lib/errors';
import { generateTailoredRecommendations } from '@/lib/gemini';
import { getClientIp, getRetryAfterSeconds, recommendRateLimiter } from '@/lib/rateLimit';
import { recommendRequestSchema } from '@/lib/schemas';

/**
 * Handles `POST /api/recommend` to generate a household-tailored recommendation plan.
 *
 * @param request - Incoming Next.js POST request containing `profile` and `aqi`.
 * @returns JSON `{ plan }` on success or a standardized summary error payload.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rate = recommendRateLimiter.check(getClientIp(request));
  if (!rate.allowed) {
    return toErrorResponse(
      new AppError(
        'Rate limit exceeded for plan generation. Please wait a minute and retry.',
        429,
        true,
        'RATE_LIMITED',
        { 'Retry-After': getRetryAfterSeconds(rate.resetAt) }
      ),
      { format: 'summary' }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return toErrorResponse(new AppError('Invalid JSON request body.', 400, false, 'INVALID_JSON'), {
      format: 'summary',
    });
  }

  const parsed = recommendRequestSchema.safeParse(body);
  if (!parsed.success) {
    return toErrorResponse(
      new AppError(
        parsed.error.issues[0]?.message ?? 'Invalid household profile or AQI context.',
        400,
        false,
        'INVALID_REQUEST'
      ),
      { format: 'summary' }
    );
  }

  try {
    const plan = await generateTailoredRecommendations(parsed.data.profile, parsed.data.aqi);
    return NextResponse.json({ plan }, { status: 200 });
  } catch (err) {
    const formatted = formatUpstreamAiError(err);
    console.error('[api/recommend] Upstream AI error:', {
      code: formatted.code,
      statusCode: formatted.statusCode,
      message: formatted.message,
    });
    return toErrorResponse(formatted, { format: 'summary' });
  }
}
