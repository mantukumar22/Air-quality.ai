import { NextRequest, NextResponse } from 'next/server';
import { fetchOpenMeteoAqi } from '@/lib/aqi';
import { createApiErrorBody } from '@/lib/gemini';
import { aqiRateLimiter, getClientIp } from '@/lib/rateLimit';
import { aqiQuerySchema } from '@/lib/schemas';

/**
 * GET /api/aqi?city=Delhi OR /api/aqi?lat=28.61&lon=77.20
 * Fetches live US AQI, PM2.5, PM10, and NO2 from Open-Meteo with 15-min caching.
 */
export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rate = aqiRateLimiter.check(clientIp);

  if (!rate.allowed) {
    return NextResponse.json(
      createApiErrorBody(
        'RATE_LIMITED',
        'Too many air-quality lookups. Please wait a minute and try again.',
        true
      ),
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rate.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawCity = searchParams.get('city');
  const rawLat = searchParams.get('lat');
  const rawLon = searchParams.get('lon');

  const parsed = aqiQuerySchema.safeParse({
    city: rawCity ?? undefined,
    lat: rawLat !== null ? rawLat : undefined,
    lon: rawLon !== null ? rawLon : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      createApiErrorBody(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid location query parameters.',
        false
      ),
      { status: 400 }
    );
  }

  try {
    const aqi = await fetchOpenMeteoAqi(parsed.data);
    return NextResponse.json(
      { aqi },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : '';
    const isNotFound = rawMsg.toLowerCase().includes('not found');
    console.error('[AirWise][/api/aqi] Lookup failed:', {
      status: isNotFound ? 404 : 502,
      detail: rawMsg || 'Unknown AQI lookup error',
    });

    return NextResponse.json(
      createApiErrorBody(
        isNotFound ? 'LOCATION_NOT_FOUND' : 'AQI_UPSTREAM_ERROR',
        isNotFound
          ? 'Location not found. Please check the city spelling or try nearby coordinates.'
          : 'Unable to reach the live air quality service right now.',
        !isNotFound
      ),
      { status: isNotFound ? 404 : 502 }
    );
  }
}
