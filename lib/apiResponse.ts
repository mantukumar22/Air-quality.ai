/**
 * @fileoverview Server-only HTTP response serializer translating `AppError` instances
 * into consistent Next.js JSON responses for API route handlers.
 */

import { NextResponse } from 'next/server';
import { AppError, buildErrorPayload, type ErrorResponseFormat } from '@/lib/errors';

export interface ToErrorResponseOptions {
  format?: ErrorResponseFormat;
}

/**
 * Converts an unknown thrown value or `AppError` into a consistent JSON `NextResponse`.
 * Never leaks stack traces, API keys, or unparsed upstream JSON to callers.
 *
 * @param err - Caught error value from a route handler.
 * @param options - Optional response shape (`'detail'` or `'summary'`).
 * @returns Sanitized JSON `NextResponse` with appropriate HTTP status and headers.
 */
export function toErrorResponse(err: unknown, options: ToErrorResponseOptions = {}): NextResponse {
  const appError =
    err instanceof AppError
      ? err
      : new AppError('An unexpected server error occurred.', 500, false, 'UPSTREAM_ERROR');

  const body = buildErrorPayload(appError, options.format);
  const init: ResponseInit = {
    status: appError.statusCode,
    ...(appError.headers ? { headers: appError.headers } : {}),
  };

  return NextResponse.json(body, init);
}
