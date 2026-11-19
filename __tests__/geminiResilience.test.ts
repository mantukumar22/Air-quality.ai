/**
 * @jest-environment node
 */
import { GEMINI_FALLBACK_MODEL, GEMINI_MODEL } from '@/lib/constants';
import { callGeminiWithRetry, GeminiCircuitBreaker, GeminiServiceError } from '@/lib/gemini';

describe('callGeminiWithRetry & Circuit Breaker Resilience', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('succeeds after two 503 responses using exponential backoff', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ text: 'Recovered answer' }),
      } as Response);

    global.fetch = fetchMock;
    const breaker = new GeminiCircuitBreaker(3, 60_000);

    const promise = callGeminiWithRetry(
      (model, signal) => fetch(`https://example.invalid/models/${model}`, { signal }),
      { circuitBreaker: breaker, maxJitterMs: 0 }
    );

    await jest.advanceTimersByTimeAsync(500);
    await jest.advanceTimersByTimeAsync(1000);

    const response = await promise;
    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `https://example.invalid/models/${GEMINI_MODEL}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(breaker.getState().consecutiveFailures).toBe(0);
  });

  it('switches to the lighter fallback model when primary model exhausts retries', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ text: 'Fallback model answer' }),
      } as Response);

    global.fetch = fetchMock;
    const breaker = new GeminiCircuitBreaker(3, 60_000);

    const promise = callGeminiWithRetry(
      (model, signal) => fetch(`https://example.invalid/models/${model}`, { signal }),
      { circuitBreaker: breaker, maxJitterMs: 0 }
    );

    await jest.advanceTimersByTimeAsync(500);
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    const response = await promise;
    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `https://example.invalid/models/${GEMINI_FALLBACK_MODEL}`,
      expect.any(Object)
    );
  });

  it('gives up after max retries when both primary and fallback models return 503', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 503 } as Response);
    global.fetch = fetchMock;
    const breaker = new GeminiCircuitBreaker(3, 60_000);

    const promise = callGeminiWithRetry(
      (model, signal) => fetch(`https://example.invalid/models/${model}`, { signal }),
      { circuitBreaker: breaker, maxJitterMs: 0 }
    );

    const rejection = expect(promise).rejects.toMatchObject({
      name: 'GeminiServiceError',
      statusCode: 503,
      retryable: true,
    });

    await jest.advanceTimersByTimeAsync(500);
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);
    await jest.advanceTimersByTimeAsync(500);

    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(breaker.getState().consecutiveFailures).toBe(1);
  });

  it('opens the circuit breaker after 3 consecutive failures and closes after 60 seconds', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 503 } as Response);
    global.fetch = fetchMock;
    const breaker = new GeminiCircuitBreaker(3, 60_000);

    const runFailingCall = () =>
      callGeminiWithRetry(
        (model, signal) => fetch(`https://example.invalid/models/${model}`, { signal }),
        {
          circuitBreaker: breaker,
          models: [GEMINI_MODEL],
          maxRetries: 0,
          maxJitterMs: 0,
        }
      );

    await expect(runFailingCall()).rejects.toBeInstanceOf(GeminiServiceError);
    await expect(runFailingCall()).rejects.toBeInstanceOf(GeminiServiceError);
    await expect(runFailingCall()).rejects.toBeInstanceOf(GeminiServiceError);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(breaker.isOpen()).toBe(true);

    await expect(runFailingCall()).rejects.toMatchObject({
      code: 'CIRCUIT_OPEN',
      statusCode: 503,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    jest.advanceTimersByTime(60_000);
    expect(breaker.isOpen()).toBe(false);

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    const res = await runFailingCall();
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(breaker.getState().consecutiveFailures).toBe(0);
  });

  it('aborts hung requests after the 10s AbortController timeout', async () => {
    const fetchMock = jest.fn().mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const abortErr = new Error('The operation was aborted.');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        })
    );
    global.fetch = fetchMock;
    const breaker = new GeminiCircuitBreaker(3, 60_000);

    const promise = callGeminiWithRetry(
      (model, signal) => fetch(`https://example.invalid/models/${model}`, { signal }),
      {
        circuitBreaker: breaker,
        models: [GEMINI_MODEL],
        maxRetries: 0,
        timeoutMs: 10_000,
      }
    );

    const rejection = expect(promise).rejects.toMatchObject({
      code: 'TIMEOUT',
      statusCode: 504,
      retryable: true,
    });

    await jest.advanceTimersByTimeAsync(10_000);
    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
