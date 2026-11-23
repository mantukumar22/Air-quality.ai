/**
 * @fileoverview Server-only `@google/genai` client wrapper implementing resilient
 * retries, exponential backoff + jitter, per-attempt AbortController timeouts,
 * automatic model fallback, circuit breaker protection, and Zod validation.
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  GeminiCircuitBreaker,
  geminiCircuitBreaker,
  getGeminiCircuitState,
  resetGeminiCircuitBreaker,
} from '@/lib/circuitBreaker';
import {
  GEMINI_MODEL,
  GEMINI_MODEL_CHAIN,
  GEMINI_RETRY_CONFIG,
  GEMINI_USER_AGENT,
  INPUT_LIMITS,
  MEDICAL_DISCLAIMER,
} from '@/lib/constants';
import { getServerEnv, hasGeminiApiKey } from '@/lib/env';
import { AppError, GeminiServiceError, formatUpstreamAiError } from '@/lib/errors';
import {
  CHAT_SYSTEM_INSTRUCTION,
  GEMINI_RECOMMENDATION_RESPONSE_SCHEMA,
  RECOMMENDATION_SYSTEM_INSTRUCTION,
  buildChatUserPrompt,
  buildRecommendationUserPrompt,
} from '@/lib/prompts';
import { sanitizeText } from '@/lib/sanitize';
import { recommendationPlanSchema } from '@/lib/schemas';
import type {
  AqiContextInput,
  ChatMessage,
  RecommendationPlan,
  UserProfile,
} from '@/types/airwise';

export {
  GeminiCircuitBreaker,
  GeminiServiceError,
  formatUpstreamAiError as formatGeminiApiError,
  geminiCircuitBreaker,
  getGeminiCircuitState,
  resetGeminiCircuitBreaker,
};

const REAL_SET_TIMEOUT = globalThis.setTimeout;

/**
 * Returns `true` when an HTTP status code represents a transient overload or network spike.
 *
 * @param status - Optional HTTP status code from upstream response.
 * @returns Whether the request should be retried with backoff.
 */
export function isRetryableStatusCode(status: number | undefined): boolean {
  return typeof status === 'number' && GEMINI_RETRY_CONFIG.retryableHttpStatuses.has(status);
}

async function defaultSleepMs(ms: number): Promise<void> {
  const isFakeTimersActive = globalThis.setTimeout !== REAL_SET_TIMEOUT;
  if (process.env.NODE_ENV === 'test' && !isFakeTimersActive) {
    return;
  }
  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function runWithTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = globalThis.setTimeout(() => {
      controller.abort();
      reject(
        new AppError('The AI request timed out under load. Please try again.', 504, true, 'TIMEOUT')
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([task(controller.signal), timeoutPromise]);
  } finally {
    if (timer !== null) {
      globalThis.clearTimeout(timer);
    }
  }
}

function selectModelForAttempt(
  models: readonly string[],
  attempt: number,
  maxRetries: number,
  forceFallback: boolean
): string {
  const useFallback = models.length > 1 && (forceFallback || attempt >= maxRetries);
  const candidate = useFallback ? models[models.length - 1] : models[0];
  return candidate ?? GEMINI_MODEL;
}

export interface CallGeminiRetryOptions {
  models?: readonly string[];
  maxRetries?: number;
  baseDelaysMs?: readonly number[];
  jitterMaxMs?: number;
  timeoutMs?: number;
  circuitBreaker?: GeminiCircuitBreaker;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
}

/**
 * Executes an async Gemini call with circuit-breaker gating, per-attempt timeouts,
 * exponential backoff + jitter retries, and automatic fallback model selection.
 *
 * @param task - Async operation receiving `(model, signal, attempt)`.
 * @param options - Optional overrides for retry delays, timeout, circuit breaker, or clocks.
 * @returns Resolved task result on success.
 * @throws {AppError} Sanitized `AppError` when circuit is open or retries are exhausted.
 */
export async function callGeminiWithRetry<T>(
  task: (model: string, signal: AbortSignal, attempt: number) => Promise<T>,
  options: CallGeminiRetryOptions = {}
): Promise<T> {
  const models = options.models ?? GEMINI_MODEL_CHAIN;
  const maxRetries = options.maxRetries ?? GEMINI_RETRY_CONFIG.maxRetries;
  const baseDelaysMs = options.baseDelaysMs ?? GEMINI_RETRY_CONFIG.baseDelaysMs;
  const jitterMaxMs = options.jitterMaxMs ?? GEMINI_RETRY_CONFIG.jitterMaxMs;
  const timeoutMs = options.timeoutMs ?? GEMINI_RETRY_CONFIG.timeoutMs;
  const circuit = options.circuitBreaker ?? geminiCircuitBreaker;
  const sleep = options.sleep ?? defaultSleepMs;
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? Math.random;

  if (!circuit.canExecute(now())) {
    throw new AppError(
      'AI assistant is cooling down briefly after repeated errors. Showing quick guide advice instead.',
      503,
      true,
      'CIRCUIT_OPEN'
    );
  }

  let lastError: AppError | null = null;
  let forceFallbackModel = false;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const selectedModel = selectModelForAttempt(models, attempt, maxRetries, forceFallbackModel);

    try {
      const result = await runWithTimeout(
        (signal) => task(selectedModel, signal, attempt),
        timeoutMs
      );
      circuit.recordSuccess();
      return result;
    } catch (err) {
      const formatted = formatUpstreamAiError(err);
      lastError = formatted;
      if (formatted.code === 'MODEL_NOT_FOUND' && models.length > 1) {
        forceFallbackModel = true;
      }

      if (!formatted.retryable || attempt >= maxRetries) {
        if (formatted.retryable || formatted.statusCode >= 500) {
          circuit.recordFailure(now());
        }
        throw formatted;
      }

      const baseDelay = baseDelaysMs[Math.min(attempt, baseDelaysMs.length - 1)] ?? 2000;
      const jitter = jitterMaxMs > 0 ? Math.floor(random() * jitterMaxMs) : 0;
      await sleep(baseDelay + jitter);
    }
  }

  circuit.recordFailure(now());
  throw (
    lastError ??
    new AppError('Unable to reach AI service right now.', 503, true, 'SERVICE_UNAVAILABLE')
  );
}

/**
 * Instantiates the server-side `@google/genai` SDK client with required telemetry header.
 *
 * @returns Configured `GoogleGenAI` client instance.
 * @throws {AppError} When `GEMINI_API_KEY` is missing or still set to the placeholder value.
 */
export function createGeminiClient(): GoogleGenAI {
  const { GEMINI_API_KEY } = getServerEnv();
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
    throw new AppError(
      'AI assistant is not configured on this server.',
      503,
      false,
      'CONFIG_MISSING'
    );
  }

  return new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: { 'User-Agent': GEMINI_USER_AGENT },
    },
  });
}

function parseRecommendationJson(rawJson: string): RecommendationPlan | AppError {
  if (!rawJson) {
    return new AppError(
      'AI returned an empty recommendation payload.',
      502,
      false,
      'EMPTY_RESPONSE'
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawJson);
  } catch {
    return new AppError('AI returned malformed recommendation JSON.', 502, false, 'MALFORMED_JSON');
  }

  const validated = recommendationPlanSchema.safeParse(parsedJson);
  if (!validated.success) {
    const issue = validated.error.issues[0]?.message ?? 'schema mismatch';
    return new AppError(
      `Recommendation validation failed: ${issue}`,
      502,
      false,
      'SCHEMA_MISMATCH'
    );
  }

  return {
    ...validated.data,
    disclaimer: validated.data.disclaimer || MEDICAL_DISCLAIMER,
    generatedAt: new Date().toISOString(),
    isFallback: false,
  };
}

/**
 * Generates structured air-quality recommendations via Gemini using `responseSchema`,
 * resilient retries, fallback model chain, circuit breaker, and strict Zod output validation.
 *
 * @param profile - Sanitized household profile.
 * @param aqi - Current local AQI snapshot.
 * @returns Validated `RecommendationPlan` ready for UI rendering.
 * @throws {AppError} On configuration issues, repeated malformed JSON, or upstream outages.
 */
export async function generateTailoredRecommendations(
  profile: UserProfile,
  aqi: AqiContextInput
): Promise<RecommendationPlan> {
  if (!hasGeminiApiKey()) {
    throw new AppError(
      'AI assistant is not configured on this server.',
      503,
      false,
      'CONFIG_MISSING'
    );
  }

  const ai = createGeminiClient();
  const userPrompt = buildRecommendationUserPrompt(profile, aqi);
  let lastSchemaError: AppError | null = null;

  for (let attempt = 1; attempt <= GEMINI_RETRY_CONFIG.schemaMaxAttempts; attempt += 1) {
    const response = await callGeminiWithRetry((model, abortSignal) =>
      ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: RECOMMENDATION_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_RECOMMENDATION_RESPONSE_SCHEMA,
          ...(model === GEMINI_MODEL
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
          abortSignal,
        },
      })
    );

    const parsedOrError = parseRecommendationJson((response.text ?? '').trim());
    if (!(parsedOrError instanceof AppError)) {
      return parsedOrError;
    }
    lastSchemaError = parsedOrError;
  }

  throw (
    lastSchemaError ??
    new AppError('Unable to generate recommendations.', 502, false, 'UPSTREAM_ERROR')
  );
}

/**
 * Generates a grounded, sanitized conversational response via resilient retry + fallback chain.
 *
 * @param params - Household profile, live AQI snapshot, and chat message history.
 * @returns Sanitized plain-text assistant response.
 * @throws {AppError} When API key is missing, response is empty, or upstream calls fail.
 */
export async function generateGroundedChat(params: {
  profile: UserProfile;
  aqi: AqiContextInput;
  messages: Array<Pick<ChatMessage, 'role' | 'content'>>;
}): Promise<string> {
  if (!hasGeminiApiKey()) {
    throw new AppError(
      'AI assistant is not configured on this server.',
      503,
      false,
      'CONFIG_MISSING'
    );
  }

  const ai = createGeminiClient();
  const prompt = buildChatUserPrompt(params.profile, params.aqi, params.messages);

  const response = await callGeminiWithRetry((model, abortSignal) =>
    ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: CHAT_SYSTEM_INSTRUCTION,
        ...(model === GEMINI_MODEL ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        abortSignal,
      },
    })
  );

  const reply = sanitizeText(response.text ?? '', INPUT_LIMITS.geminiReplyMaxLength, true);
  if (!reply) {
    throw new AppError('AI assistant returned an empty response.', 502, true, 'EMPTY_RESPONSE');
  }

  return reply;
}
