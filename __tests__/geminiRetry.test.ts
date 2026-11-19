/**
 * @jest-environment node
 */
import { GEMINI_FALLBACK_MODEL, GEMINI_MODEL } from '@/lib/constants';
import {
  callGeminiWithRetry,
  GeminiCircuitBreaker,
  GeminiServiceError,
  resetGeminiCircuitBreaker,
} from '@/lib/gemini';

describe('callGeminiWithRetry & Circuit Breaker', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    resetGeminiCircuitBreaker();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('succeeds after two 503 responses with exponential backoff + jitter', async () => {
    const sleepCalls: number[] = [];
    const mockedFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Clean air response' }),
      } as Response);
    global.fetch = mockedFetch;

    const promise = callGeminiWithRetry(
      async (model, signal) => {
        const res = await fetch(`https://example.test/models/${model}`, { signal });
        if (!res.ok) {
          throw new GeminiServiceError('Overloaded', res.status, true, 'SERVICE_UNAVAILABLE');
        }
        return (await res.json()) as { text: string };
      },
      {
        random: () => 0.4, // 0.4 * 250 = 100ms jitter
        sleep: async (ms) => {
          sleepCalls.push(ms);
          await new Promise<void>((resolve) => setTimeout(resolve, ms));
        },
      }
    );

    await jest.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result.text).toBe('Clean air response');
    expect(mockedFetch).toHaveBeenCalledTimes(3);
    expect(sleepCalls).toEqual([600, 1100]); // 500 + 100ms jitter, 1000 + 100ms jitter
    expect(mockedFetch.mock.calls[0]?.[0]).toContain(GEMINI_MODEL);
  });

  it('switches to fallback model on persistent 503s and succeeds', async () => {
    const seenModels: string[] = [];
    const mockedFetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.includes(GEMINI_MODEL)) {
        return { ok: false, status: 503 } as Response;
      }
      return {
        ok: true,
        json: async () => ({ text: 'Fallback model succeeded' }),
      } as Response;
    });
    global.fetch = mockedFetch;

    const promise = callGeminiWithRetry(
      async (model, signal) => {
        seenModels.push(model);
        const res = await fetch(`https://example.test/models/${model}`, { signal });
        if (!res.ok) {
          throw new GeminiServiceError('Model busy', res.status, true, 'SERVICE_UNAVAILABLE');
        }
        return (await res.json()) as { text: string };
      },
      { random: () => 0 }
    );

    await jest.advanceTimersByTimeAsync(4000);
    const result = await promise;

    expect(result.text).toBe('Fallback model succeeded');
    expect(seenModels).toEqual([GEMINI_MODEL, GEMINI_MODEL, GEMINI_MODEL, GEMINI_FALLBACK_MODEL]);
  });

  it('gives up cleanly after max retries (1 initial + 3 retries)', async () => {
    const mockedFetch = jest.fn().mockResolvedValue({ ok: false, status: 503 } as Response);
    global.fetch = mockedFetch;

    const promise = callGeminiWithRetry(
      async (model, signal) => {
        const res = await fetch(`https://example.test/models/${model}`, { signal });
        if (!res.ok) {
          throw new GeminiServiceError(
            'The AI service is temporarily busy due to high demand.',
            res.status,
            true,
            'SERVICE_UNAVAILABLE'
          );
        }
        return res;
      },
      { random: () => 0 }
    );

    const assertion = expect(promise).rejects.toThrow(/temporarily busy/i);
    await jest.advanceTimersByTimeAsync(5000);
    await assertion;

    expect(mockedFetch).toHaveBeenCalledTimes(4);
  });

  it('aborts hung requests after the 10s AbortController timeout', async () => {
    const mockedFetch = jest.fn().mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const abortErr = new Error('The operation was aborted.');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        })
    );
    global.fetch = mockedFetch;

    const promise = callGeminiWithRetry(
      (model, signal) => fetch(`https://example.test/models/${model}`, { signal }),
      {
        maxRetries: 0,
        timeoutMs: 10_000,
      }
    );

    const assertion = expect(promise).rejects.toMatchObject({
      statusCode: 504,
      code: 'TIMEOUT',
    });

    await jest.advanceTimersByTimeAsync(10_050);
    await assertion;
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('opens circuit breaker after 3 consecutive failures and closes after 60 seconds', async () => {
    const breaker = new GeminiCircuitBreaker(3, 60_000);
    let nowMs = 1_000_000;
    const mockedFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 502 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Recovered after cooldown' }),
      } as Response);
    global.fetch = mockedFetch;

    const invoke = () =>
      callGeminiWithRetry(
        async (model, signal) => {
          const res = await fetch(`https://example.test/models/${model}`, { signal });
          if (!res.ok) {
            throw new GeminiServiceError(
              'Transient error',
              res.status,
              true,
              'SERVICE_UNAVAILABLE'
            );
          }
          return (await res.json()) as { text: string };
        },
        {
          maxRetries: 0,
          circuitBreaker: breaker,
          now: () => nowMs,
        }
      );

    // Three consecutive failures trip the breaker
    await expect(invoke()).rejects.toBeInstanceOf(GeminiServiceError);
    await expect(invoke()).rejects.toBeInstanceOf(GeminiServiceError);
    await expect(invoke()).rejects.toBeInstanceOf(GeminiServiceError);
    expect(breaker.isOpen(nowMs)).toBe(true);
    expect(mockedFetch).toHaveBeenCalledTimes(3);

    // Inside the 60s cooldown, fetch must NOT be called
    nowMs += 30_000;
    await expect(invoke()).rejects.toMatchObject({ code: 'CIRCUIT_OPEN' });
    expect(mockedFetch).toHaveBeenCalledTimes(3);

    // After 60s elapse, half-open probe executes, succeeds, and closes the breaker
    nowMs += 30_001;
    const recovered = await invoke();
    expect(recovered.text).toBe('Recovered after cooldown');
    expect(mockedFetch).toHaveBeenCalledTimes(4);
    expect(breaker.isOpen(nowMs)).toBe(false);
    expect(breaker.getState(nowMs).consecutiveFailures).toBe(0);
  });
});
