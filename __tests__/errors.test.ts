/**
 * @jest-environment node
 */

import { extractErrorMessage } from '@/lib/apiClient';
import { toErrorResponse } from '@/lib/apiResponse';
import { AppError, formatUpstreamAiError } from '@/lib/errors';

describe('Shared AppError & error normalization utilities', () => {
  it('serializes AppError into both detail and summary HTTP responses with headers', async () => {
    const rateLimited = new AppError('Too many requests', 429, true, 'RATE_LIMITED', {
      'Retry-After': '45',
    });

    const detailRes = toErrorResponse(rateLimited);
    expect(detailRes.status).toBe(429);
    expect(detailRes.headers.get('Retry-After')).toBe('45');
    const detailJson = (await detailRes.json()) as {
      error: { code: string; message: string; retryable: boolean };
    };
    expect(detailJson.error).toEqual({
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      retryable: true,
    });

    const summaryRes = toErrorResponse(rateLimited, { format: 'summary' });
    const summaryJson = (await summaryRes.json()) as {
      error: string;
      errorDetail: { code: string; retryable: boolean };
    };
    expect(summaryJson.error).toBe('Too many requests');
    expect(summaryJson.errorDetail.code).toBe('RATE_LIMITED');
  });

  it('converts unknown thrown values into sanitized 500 responses without leaking internals', async () => {
    const res = toErrorResponse(new Error('INTERNAL_SECRET_KEY=leaked'));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('UPSTREAM_ERROR');
    expect(body.error.message).not.toContain('INTERNAL_SECRET_KEY');
  });

  it('normalizes upstream Gemini JSON, timeout, quota, and key errors safely', () => {
    const missingKey = formatUpstreamAiError(new Error('GEMINI_API_KEY is missing'));
    expect(missingKey.code).toBe('CONFIG_MISSING');
    expect(missingKey.statusCode).toBe(503);

    const quotaErr = formatUpstreamAiError({
      message: JSON.stringify({
        error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota hit' },
      }),
    });
    expect(quotaErr.code).toBe('RATE_LIMITED');
    expect(quotaErr.retryable).toBe(true);

    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    const timeoutErr = formatUpstreamAiError(abortErr);
    expect(timeoutErr.code).toBe('TIMEOUT');
    expect(timeoutErr.statusCode).toBe(504);

    const unavailableErr = formatUpstreamAiError({ status: 503, message: 'Service overloaded' });
    expect(unavailableErr.code).toBe('SERVICE_UNAVAILABLE');
    expect(unavailableErr.statusCode).toBe(503);
  });

  it('extracts readable client error text from string or structured ApiErrorDetail', () => {
    expect(extractErrorMessage('City unavailable', 'Fallback')).toBe('City unavailable');
    expect(
      extractErrorMessage(
        { code: 'VALIDATION_ERROR', message: 'Invalid city', retryable: false },
        'Fallback'
      )
    ).toBe('Invalid city');
    expect(extractErrorMessage(undefined, 'Fallback')).toBe('Fallback');
  });
});
