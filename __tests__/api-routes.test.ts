/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as getAqiRoute } from '@/app/api/aqi/route';
import { POST as postRecommendRoute } from '@/app/api/recommend/route';
import { POST as postChatRoute } from '@/app/api/chat/route';
import { getFallbackAqiReading } from '@/lib/aqi';
import { DEFAULT_PROFILE } from '@/lib/constants';
import { buildFallbackPlan } from '@/lib/fallbackPlan';
import { aqiRateLimiter, chatRateLimiter, recommendRateLimiter } from '@/lib/rateLimit';

const mockGenerateContent = jest.fn();
const mockGenerateContentStream = jest.fn();

jest.mock('@google/genai', () => {
  const actual = jest.requireActual('@google/genai');
  return {
    ...actual,
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
      },
    })),
  };
});

describe('AirWise API Route Handlers', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    aqiRateLimiter.reset();
    recommendRateLimiter.reset();
    chatRateLimiter.reset();
    mockGenerateContent.mockReset();
    mockGenerateContentStream.mockReset();
    process.env.GEMINI_API_KEY = 'test-server-secret-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalApiKey;
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
  });

  describe('POST /api/chat', () => {
    const chatBody = {
      profile: DEFAULT_PROFILE,
      aqi: {
        locationName: 'New Delhi',
        usAqi: 185,
        pm25: 102.4,
        pm10: 168.0,
        no2: 54.2,
        categoryLabel: 'Unhealthy',
      },
      messages: [{ role: 'user', content: 'When should I open windows today?' }],
    };

    it('returns 400 when messages array is empty', async () => {
      const req = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ ...chatBody, messages: [] }),
      });
      const res = await postChatRoute(req);
      expect(res.status).toBe(400);
    });

    it('streams grounded text chunks from mocked Gemini', async () => {
      async function* mockChunks() {
        yield { text: 'Open windows briefly ' };
        yield { text: 'between 1:30 PM and 3:00 PM.' };
      }
      mockGenerateContentStream.mockResolvedValueOnce(mockChunks());

      const req = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify(chatBody),
      });
      const res = await postChatRoute(req);

      expect(res.status).toBe(200);
      const streamedText = await res.text();
      expect(streamedText).toBe('Open windows briefly between 1:30 PM and 3:00 PM.');
    });
  });
});
