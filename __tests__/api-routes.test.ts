/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as getAqiRoute } from '@/app/api/aqi/route';
import { POST as postChatRoute } from '@/app/api/chat/route';
import { POST as postRecommendRoute } from '@/app/api/recommend/route';
import { getFallbackAqiReading } from '@/lib/aqi';
import { DEFAULT_PROFILE } from '@/lib/constants';
import { buildFallbackPlan } from '@/lib/fallbackPlan';
import { chatAnswerCache } from '@/lib/faqMatcher';
import { resetGeminiCircuitBreaker } from '@/lib/gemini';
import { aqiRateLimiter, chatRateLimiter, recommendRateLimiter } from '@/lib/rateLimit';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => {
  const actual = jest.requireActual('@google/genai');
  return {
    ...actual,
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
  };
});

describe('AirWise API Route Handlers', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    aqiRateLimiter.reset();
    recommendRateLimiter.reset();
    chatRateLimiter.reset();
    chatAnswerCache.clear();
    resetGeminiCircuitBreaker();
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = 'test-server-secret-key';
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalApiKey;
    consoleErrorSpy.mockRestore();
  });

  describe('GET /api/aqi', () => {
    it('returns 400 on missing location parameters', async () => {
      const req = new NextRequest('http://localhost/api/aqi');
      const res = await getAqiRoute(req);
      expect(res.status).toBe(400);
    });

    it('returns live normalized AQI from mocked Open-Meteo APIs', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [
              {
                name: 'New Delhi',
                admin1: 'Delhi',
                country: 'India',
                latitude: 28.6139,
                longitude: 77.209,
              },
            ],
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            current: {
              time: '2026-11-18T08:00',
              us_aqi: 192,
              pm2_5: 112.5,
              pm10: 184.0,
              nitrogen_dioxide: 61.2,
            },
          }),
        } as Response);

      const req = new NextRequest('http://localhost/api/aqi?city=New%20Delhi');
      const res = await getAqiRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.aqi.usAqi).toBe(192);
      expect(data.aqi.pm25).toBe(112.5);
      expect(data.aqi.category.id).toBe('unhealthy');
    });

    it('returns 502 when upstream Open-Meteo fails', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as Response);

      const req = new NextRequest('http://localhost/api/aqi?lat=28.61&lon=77.20');
      const res = await getAqiRoute(req);
      expect(res.status).toBe(502);
    });
  });

  describe('POST /api/recommend', () => {
    const validBody = {
      profile: DEFAULT_PROFILE,
      aqi: {
        locationName: 'New Delhi',
        usAqi: 185,
        pm25: 102.4,
        pm10: 168.0,
        no2: 54.2,
        categoryLabel: 'Unhealthy',
      },
    };

    it('returns 400 when profile city is invalid', async () => {
      const req = new NextRequest('http://localhost/api/recommend', {
        method: 'POST',
        body: JSON.stringify({
          ...validBody,
          profile: { ...DEFAULT_PROFILE, city: '' },
        }),
      });
      const res = await postRecommendRoute(req);
      expect(res.status).toBe(400);
    });

    it('returns Zod-validated structured recommendations from mocked Gemini', async () => {
      const mockPlan = buildFallbackPlan(DEFAULT_PROFILE, getFallbackAqiReading('New Delhi'));
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockPlan),
      });

      const req = new NextRequest('http://localhost/api/recommend', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const res = await postRecommendRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.plan.headline).toBe(mockPlan.headline);
      expect(data.plan.isFallback).toBe(false);
    });

    it('returns 502 when Gemini returns malformed JSON twice', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: 'not-valid-json' })
        .mockResolvedValueOnce({ text: '{"bad": true}' });

      const req = new NextRequest('http://localhost/api/recommend', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const res = await postRecommendRoute(req);
      expect(res.status).toBe(502);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('recovers from transient 503 spike and formats exhausted 503 cleanly without raw JSON', async () => {
      const mockPlan = buildFallbackPlan(DEFAULT_PROFILE, getFallbackAqiReading('New Delhi'));
      const raw503 = JSON.stringify({
        error: {
          code: 503,
          message: 'This model is currently experiencing high demand.',
          status: 'UNAVAILABLE',
        },
      });

      mockGenerateContent
        .mockRejectedValueOnce(new Error(raw503))
        .mockResolvedValueOnce({ text: JSON.stringify(mockPlan) });

      const reqOk = new NextRequest('http://localhost/api/recommend', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const resOk = await postRecommendRoute(reqOk);
      expect(resOk.status).toBe(200);

      mockGenerateContent.mockRejectedValue(new Error(raw503));
      const reqFail = new NextRequest('http://localhost/api/recommend', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const resFail = await postRecommendRoute(reqFail);
      const dataFail = (await resFail.json()) as {
        error: string;
        errorDetail: { code: string; message: string; retryable: boolean };
      };
      expect(resFail.status).toBe(503);
      expect(dataFail.error).not.toContain('{');
      expect(dataFail.error).toContain('temporarily busy');
      expect(dataFail.errorDetail.retryable).toBe(true);
    });
  });

  describe('POST /api/chat', () => {
    const baseAqi = {
      locationName: 'New Delhi',
      usAqi: 185,
      pm25: 102.4,
      pm10: 168.0,
      no2: 54.2,
      categoryLabel: 'Unhealthy',
    };

    it('returns typed error JSON with 400 when messages array is empty', async () => {
      const req = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          profile: DEFAULT_PROFILE,
          aqi: baseAqi,
          messages: [],
        }),
      });
      const res = await postChatRoute(req);
      const data = (await res.json()) as {
        error: { code: string; message: string; retryable: boolean };
      };
      expect(res.status).toBe(400);
      expect(data.error.code).toBe('INVALID_REQUEST');
      expect(data.error.retryable).toBe(false);
    });

    it('serves FAQ hit immediately with zero Gemini API calls', async () => {
      const req = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          profile: DEFAULT_PROFILE,
          aqi: baseAqi,
          messages: [{ role: 'user', content: 'How do I make a DIY box fan HEPA purifier?' }],
        }),
      });
      const res = await postChatRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.source).toBe('faq');
      expect(data.faqId).toBe('faq-diy-purifier');
      expect(data.reply).toContain('New Delhi');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('calls Gemini for novel questions and serves subsequent identical queries from cache', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Place outdoor sensors on shaded balconies away from dryer vents.',
      });

      const novelPayload = {
        profile: DEFAULT_PROFILE,
        aqi: baseAqi,
        messages: [
          {
            role: 'user',
            content: 'Where should I mount an outdoor laser nephelometer on my balcony?',
          },
        ],
      };

      const resFirst = await postChatRoute(
        new NextRequest('http://localhost/api/chat', {
          method: 'POST',
          body: JSON.stringify(novelPayload),
        })
      );
      const firstData = await resFirst.json();

      expect(resFirst.status).toBe(200);
      expect(firstData.source).toBe('gemini');
      expect(firstData.reply).toContain('shaded balconies');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      const resSecond = await postChatRoute(
        new NextRequest('http://localhost/api/chat', {
          method: 'POST',
          body: JSON.stringify(novelPayload),
        })
      );
      const secondData = await resSecond.json();

      expect(resSecond.status).toBe(200);
      expect(secondData.source).toBe('cache');
      expect(secondData.reply).toBe(firstData.reply);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('returns HTTP 200 fallback guidance with source: fallback when Gemini returns 503', async () => {
      const raw503 = JSON.stringify({
        error: {
          code: 503,
          message: 'Upstream model overloaded.',
          status: 'UNAVAILABLE',
        },
      });
      mockGenerateContent.mockRejectedValue(new Error(raw503));

      const req = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          profile: DEFAULT_PROFILE,
          aqi: baseAqi,
          messages: [
            {
              role: 'user',
              content: 'Does apartment corridor pressure affect hallway infiltration?',
            },
          ],
        }),
      });

      const res = await postChatRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.source).toBe('fallback');
      expect(data.notice).toContain('Our AI is busy');
      expect(data.reply).toContain('Offline guidance');
      expect(data.reply).not.toContain('UNAVAILABLE');
      expect(data.reply).not.toContain('{');
    });
  });
});
