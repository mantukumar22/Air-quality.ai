/**
 * @fileoverview Runtime-agnostic error model (`AppError`), sanitized error payload
 * builder, and upstream Gemini error normalizer.
 */

import type { ApiErrorDetail, AppErrorCode } from '@/types/airwise';

/**
 * Typed application error carrying a safe client-facing message, HTTP status,
 * retryability hint, and optional response headers (e.g., `Retry-After`).
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly code: AppErrorCode;
  readonly headers?: Record<string, string> | undefined;

  constructor(
    message: string,
    statusCode = 502,
    retryable = false,
    code: AppErrorCode = 'UPSTREAM_ERROR',
    headers?: Record<string, string>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.code = code;
    this.headers = headers;
  }

  /**
   * Serializes this error into the sanitized public `ApiErrorDetail` shape.
   *
   * @returns Client-safe error metadata object.
   */
  toDetail(): ApiErrorDetail {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    };
  }
}

/** Backwards-compatible alias for upstream Gemini service error handling. */
export const GeminiServiceError = AppError;

export type ErrorResponseFormat = 'detail' | 'summary';

/**
 * Builds the JSON response body for an `AppError` in `'detail'` or `'summary'` shape.
 *
 * @param appError - Normalized application error instance.
 * @param format - Payload format (`'detail'` nests under `error`; `'summary'` flattens `error` string + `errorDetail`).
 * @returns Sanitized JSON-serializable response payload.
 */
export function buildErrorPayload(
  appError: AppError,
  format: ErrorResponseFormat = 'detail'
): { error: ApiErrorDetail } | { error: string; errorDetail: ApiErrorDetail } {
  const detail = appError.toDetail();
  return format === 'summary' ? { error: detail.message, errorDetail: detail } : { error: detail };
}

interface NestedErrorInfo {
  code: number | undefined;
  status: string | undefined;
  message: string;
}

function readTopLevelStatusCode(err: object): number | undefined {
  if ('statusCode' in err && typeof err.statusCode === 'number') {
    return err.statusCode;
  }
  if ('status' in err && typeof err.status === 'number') {
    return err.status;
  }
  if ('code' in err && typeof err.code === 'number') {
    return err.code;
  }
  return undefined;
}

function readInitialErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message.trim();
  }
  if (typeof err === 'string') {
    return err.trim();
  }
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message.trim();
  }
  return 'Unable to reach AI service right now.';
}

function extractNestedErrorInfo(err: unknown): NestedErrorInfo {
  let detectedCode = err && typeof err === 'object' ? readTopLevelStatusCode(err) : undefined;
  let detectedStatus: string | undefined;
  let current = readInitialErrorMessage(err);

  for (let depth = 0; depth < 3; depth += 1) {
    if (!current.startsWith('{')) break;
    try {
      const parsed: unknown = JSON.parse(current);
      if (!parsed || typeof parsed !== 'object') break;
      const candidate =
        'error' in parsed && parsed.error && typeof parsed.error === 'object'
          ? parsed.error
          : parsed;
      if ('code' in candidate && typeof candidate.code === 'number') {
        detectedCode = candidate.code;
      }
      if ('status' in candidate && typeof candidate.status === 'string') {
        detectedStatus = candidate.status;
      }
      if (
        'message' in candidate &&
        typeof candidate.message === 'string' &&
        candidate.message.trim()
      ) {
        current = candidate.message.trim();
        continue;
      }
      break;
    } catch {
      // Non-JSON upstream error string; preserve sanitized message
      break;
    }
  }

  if (detectedCode === undefined) {
    const statusMatch = current.match(/\b(400|403|404|429|500|502|503|504)\b/);
    if (statusMatch?.[1]) {
      detectedCode = Number(statusMatch[1]);
    }
  }

  return { code: detectedCode, status: detectedStatus, message: current };
}

/**
 * Normalizes SDK, HTTP, and timeout errors from `@google/genai` into sanitized `AppError`
 * instances without exposing raw upstream payloads or secrets.
 *
 * @param err - Raw error thrown by `@google/genai` or `fetch`.
 * @returns Sanitized `AppError` with mapped status code and retryability flag.
 */
export function formatUpstreamAiError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  const rawText = err instanceof Error ? err.message : String(err ?? '');
  const { code, status, message } = extractNestedErrorInfo(err);
  const lower = `${status ?? ''} ${message}`.toLowerCase();

  if (rawText.includes('GEMINI_API_KEY')) {
    return new AppError(
      'AI assistant is not configured on this server.',
      503,
      false,
      'CONFIG_MISSING'
    );
  }

  if (
    code === 403 ||
    code === 400 ||
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied')
  ) {
    return new AppError(
      'AI service credentials could not be verified. Serving guide answers instead.',
      503,
      false,
      'AUTH_ERROR'
    );
  }

  if (code === 404 || lower.includes('not_found')) {
    return new AppError(
      'Requested AI model is unavailable right now. Falling back to guide guidance.',
      503,
      true,
      'MODEL_NOT_FOUND'
    );
  }

  if (code === 429 || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return new AppError(
      'AI request quota reached temporarily. Please wait a moment and try again.',
      429,
      true,
      'RATE_LIMITED'
    );
  }

  if (
    err instanceof Error &&
    (err.name === 'AbortError' || lower.includes('timed out') || lower.includes('aborted'))
  ) {
    return new AppError(
      'The AI request timed out under load. Please try again.',
      504,
      true,
      'TIMEOUT'
    );
  }

  if (
    code === 503 ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded')
  ) {
    return new AppError(
      'The AI service is temporarily busy due to high demand. Please retry in a few seconds.',
      503,
      true,
      'SERVICE_UNAVAILABLE'
    );
  }

  if (code === 500 || code === 502 || code === 504 || lower.includes('bad gateway')) {
    return new AppError(
      'The AI service experienced a temporary upstream error. Please try again.',
      code ?? 502,
      true,
      'UPSTREAM_TRANSIENT'
    );
  }

  if (
    lower.includes('fetch failed') ||
    lower.includes('network') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout')
  ) {
    return new AppError(
      'Unable to reach the AI service due to a temporary network issue.',
      503,
      true,
      'NETWORK_ERROR'
    );
  }

  return new AppError(
    'AI service returned an unexpected error. Serving quick guide guidance instead.',
    502,
    false,
    'UPSTREAM_ERROR'
  );
}
