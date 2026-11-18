import { NextRequest, NextResponse } from 'next/server';
import { formatGeminiApiError, streamGroundedChat } from '@/lib/gemini';
import { chatRateLimiter, getClientIp } from '@/lib/rateLimit';
import { chatRequestSchema } from '@/lib/schemas';

/**
 * POST /api/chat
 * Streams conversational air-quality guidance grounded in the user's profile and live AQI.
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rate = chatRateLimiter.check(clientIp);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many chat messages. Please pause briefly before sending another question.' },
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

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Invalid chat payload.',
      },
      { status: 400 }
    );
  }

  try {
    const geminiStream = await streamGroundedChat(parsed.data);
    const encoder = new TextEncoder();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of geminiStream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (streamErr) {
          const formatted = formatGeminiApiError(streamErr);
          controller.error(new Error(formatted.message));
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    const formatted = formatGeminiApiError(err);
    return NextResponse.json({ error: formatted.message }, { status: formatted.statusCode });
  }
}
