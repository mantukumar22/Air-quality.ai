/**
 * @fileoverview Resilient conversational assistant route handler (`POST /api/chat`)
 * layered across pre-stored FAQs, in-memory TTL cache, Gemini retry/fallback, and offline guide.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/apiResponse';
import { BUSY_AI_NOTICE, INPUT_LIMITS } from '@/lib/constants';
import { AppError, formatUpstreamAiError } from '@/lib/errors';
import {
  buildChatCacheKey,
  buildOfflineFallbackAnswer,
  chatAnswerCache,
  matchFaqQuestion,
  personalizeFaqAnswer,
} from '@/lib/faqMatcher';
import { generateGroundedChat } from '@/lib/gemini';
import { chatRateLimiter, getClientIp, getRetryAfterSeconds } from '@/lib/rateLimit';
import { sanitizeText } from '@/lib/sanitize';
import { chatRequestSchema } from '@/lib/schemas';
import type { ChatApiResponse } from '@/types/airwise';

/**
 * Handles `POST /api/chat` with tiered instant FAQ matching, cache hits,
 * resilient Gemini invocation, and HTTP 200 offline fallback guidance on outages.
 *
 * @param request - Incoming Next.js POST request containing profile, AQI context, and messages.
 * @returns JSON `ChatApiResponse` discriminated union or standardized error response on 4xx.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rate = chatRateLimiter.check(getClientIp(request));
  if (!rate.allowed) {
    return toErrorResponse(
      new AppError(
        'Too many chat messages. Please pause briefly before sending another question.',
        429,
        true,
        'RATE_LIMITED',
        { 'Retry-After': getRetryAfterSeconds(rate.resetAt) }
      )
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return toErrorResponse(new AppError('Invalid JSON request body.', 400, false, 'INVALID_JSON'));
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return toErrorResponse(
      new AppError(
        parsed.error.issues[0]?.message ?? 'Invalid chat payload.',
        400,
        false,
        'INVALID_REQUEST'
      )
    );
  }

  const { profile, aqi, messages } = parsed.data;
  const latestUserMessage =
    [...messages].reverse().find((m) => m.role === 'user')?.content ??
    messages[messages.length - 1]?.content ??
    '';
  const safeQuestion = sanitizeText(latestUserMessage, INPUT_LIMITS.chatMessageMaxLength);

  if (!safeQuestion) {
    return toErrorResponse(
      new AppError('Please enter a valid air-quality question.', 400, false, 'EMPTY_MESSAGE')
    );
  }

  // 1. Pre-stored FAQ match (zero API calls)
  const faqMatch = matchFaqQuestion(safeQuestion);
  if (faqMatch) {
    const payload: ChatApiResponse = {
      source: 'faq',
      reply: personalizeFaqAnswer(faqMatch.entry, profile, aqi),
      faqId: faqMatch.entry.id,
      impact: faqMatch.entry.impact,
    };
    return NextResponse.json(payload, { status: 200 });
  }

  // 2. Bounded in-memory cache hit
  const cacheKey = buildChatCacheKey(safeQuestion, aqi.usAqi, profile);
  const cachedReply = chatAnswerCache.get(cacheKey);
  if (cachedReply) {
    const payload: ChatApiResponse = {
      source: 'cache',
      reply: cachedReply,
    };
    return NextResponse.json(payload, { status: 200 });
  }

  // 3. Resilient Gemini call -> cache -> offline guide fallback on any upstream error
  try {
    const reply = await generateGroundedChat({ profile, aqi, messages });
    chatAnswerCache.set(cacheKey, reply);
    const payload: ChatApiResponse = {
      source: 'gemini',
      reply,
    };
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const formatted = formatUpstreamAiError(err);
    // Log diagnostics server-side only; never expose raw upstream payloads to browsers
    console.error('[api/chat] Gemini fallback activated:', {
      code: formatted.code,
      statusCode: formatted.statusCode,
      message: formatted.message,
    });

    const payload: ChatApiResponse = {
      source: 'fallback',
      reply: buildOfflineFallbackAnswer(safeQuestion, profile, aqi),
      notice: BUSY_AI_NOTICE,
    };
    return NextResponse.json(payload, { status: 200 });
  }
}
