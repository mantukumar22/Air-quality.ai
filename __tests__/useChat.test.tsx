import { act, renderHook, waitFor } from '@testing-library/react';
import { useChat } from '@/hooks/useChat';
import { getFallbackAqiReading } from '@/lib/aqi';
import { DEFAULT_PROFILE } from '@/lib/constants';
import { FAQ_ENTRIES } from '@/lib/faq';

describe('useChat hook', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.sessionStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('answers matching FAQ questions locally with zero network requests', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;
    const aqi = getFallbackAqiReading('New Delhi');

    const { result } = renderHook(() => useChat(DEFAULT_PROFILE, aqi));

    await act(async () => {
      await result.current.sendMessage('How do I make a DIY air purifier with a box fan?');
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]?.source).toBe('faq');
    expect(result.current.messages[1]?.content).toContain('not medical advice');
  });

  it('caches custom Gemini answers and supports liveOnly retries after fallback', async () => {
    const fetchSpy = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Busy right now', retryable: true },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: 'Fresh live guidance for balcony sensor placement.',
          source: 'gemini',
        }),
      } as Response);
    global.fetch = fetchSpy;
    const aqi = getFallbackAqiReading('Lahore');
    const customQuestion =
      'How does optical laser nephelometer Mie scattering drift above 85 percent humidity?';

    const { result } = renderHook(() => useChat(DEFAULT_PROFILE, aqi));

    await act(async () => {
      await result.current.sendMessage(customQuestion);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.notice?.retryQuestion).toBe(customQuestion);
    expect(result.current.messages[1]?.source).toBe('fallback');

    await act(async () => {
      await result.current.sendMessage(customQuestion, { sourceStrategy: 'liveOnly' });
    });

    await waitFor(() => {
      expect(result.current.messages.at(-1)?.source).toBe('gemini');
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Repeating the same custom question hits the client session cache with zero extra fetches
    await act(async () => {
      await result.current.sendMessage(customQuestion);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.current.messages.at(-1)?.source).toBe('cache');
  });

  it('appends instant FAQ messages when selectSuggestion is triggered', () => {
    const aqi = getFallbackAqiReading('New Delhi');
    const firstFaq = FAQ_ENTRIES[0];
    expect(firstFaq).toBeDefined();
    if (!firstFaq) throw new Error('Expected FAQ entry');

    const { result } = renderHook(() => useChat(DEFAULT_PROFILE, aqi));

    act(() => {
      result.current.selectSuggestion(firstFaq, 'Personalized test reply (not medical advice).');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]?.source).toBe('faq');
    expect(result.current.messages[1]?.content).toContain('Personalized test reply');
  });
});
