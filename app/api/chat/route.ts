import { NextRequest, NextResponse } from 'next/server';
import {
  buildChatCacheKey,
  buildOfflineFallbackAnswer,
  chatAnswerCache,
  matchFaqQuestion,
  personalizeFaqAnswer,
} from '@/lib/faqMatcher';
import { formatGeminiApiError, generateGroundedChat } from '@/lib/gemini';
import { chatRateLimiter, getClientIp } from '@/lib/rateLimit';
import { sanitizeText } from '@/lib/sanitize';
import { chatRequestSchema } from '@/lib/schemas';
import type { ApiErrorDetail, ChatApiResponse } from '@/types/airwise';

function jsonError(detail: ApiErrorDetail, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: detail }, { status, headers });
}

/**
 * POST /api/chat
 * Fast, resilient chat endpoint following:
 * 1. Pre-stored FAQ match (instant, 0 API calls)
 * 2. In-memory TTL cache hit (instant, 0 API calls)
 * 3. Resilient Gemini generation (retries, backoff+jitter, 10s timeout, fallback model, circuit breaker)
 * 4. Offline AQI/profile guide fallback on upstream failure (HTTP 200 with source: 'fallback')
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rate = chatRateLimiter.check(clientIp);

  if (!rate.allowed) {
    return jsonError(
      {
        code: 'RATE_LIMITED',
        message: 'Too many chat messages. Please pause briefly before sending another question.',
        retryable: true,
      },
      429,
      { 'Retry-After': String(Math.ceil((rate.resetAt - Date.now()) / 1000)) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(
      {
        code: 'INVALID_JSON',
        message: 'Invalid JSON request body.',
        retryable: false,
      },
      400
    );
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      {
        code: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? 'Invalid chat payload.',
        retryable: false,
      },
      400
    );
  }

  const { profile, aqi, messages } = parsed.data;
  const latestUserMessage =
    [...messages].reverse().find((m) => m.role === 'user')?.content ??
    messages[messages.length - 1]?.content ??
    '';
  const safeQuestion = sanitizeText(latestUserMessage, 600);

  if (!safeQuestion) {
    return jsonError(
      {
        code: 'EMPTY_MESSAGE',
        message: 'Please enter a valid air-quality question.',
        retryable: false,
      },
      400
    );
  }

  // 1. Pre-stored FAQ match (zero API calls)
  const faqMatch = matchFaqQuestion(safeQuestion);
  if (faqMatch) {
    const payload: ChatApiResponse = {
      reply: personalizeFaqAnswer(faqMatch.entry, profile, aqi),
      source: 'faq',
      faqId: faqMatch.entry.id,
      impact: faqMatch.entry.impact,
    };
    return NextResponse.json(payload, { status: 200 });
  }

  // 2. Bounded in-memory cache check
  const cacheKey = buildChatCacheKey(safeQuestion, aqi.usAqi, profile);
  const cachedReply = chatAnswerCache.get(cacheKey);
  if (cachedReply) {
    const payload: ChatApiResponse = {
      reply: cachedReply,
      source: 'cache',
    };
    return NextResponse.json(payload, { status: 200 });
  }

  // 3. Resilient Gemini call -> cache -> offline fallback on any upstream error
  try {
    const reply = await generateGroundedChat({ profile, aqi, messages });
    chatAnswerCache.set(cacheKey, reply);
    const payload: ChatApiResponse = {
      reply,
      source: 'gemini',
    };
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const formatted = formatGeminiApiError(err);
    // Log diagnostics server-side only; never expose raw upstream details to the browser
    console.error('[api/chat] Gemini fallback activated:', {
      code: formatted.code,
      statusCode: formatted.statusCode,
      message: formatted.message,
    });

    const fallbackReply = buildOfflineFallbackAnswer(safeQuestion, profile, aqi);
    const payload: ChatApiResponse = {
      reply: fallbackReply,
      source: 'fallback',
      notice: "Our AI is busy, here's a quick answer from our guide.",
    };
    return NextResponse.json(payload, { status: 200 });
  }
}
