/**
 * @fileoverview Live AQI API route handler (`GET /api/aqi`) proxying Open-Meteo
 * geocoding and pollutant measurements with rate limiting and edge caching.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/apiResponse';
import { fetchOpenMeteoAqi } from '@/lib/aqi';
import { AQI_CACHE_CONTROL_HEADER } from '@/lib/constants';
import { AppError } from '@/lib/errors';
import { aqiRateLimiter, getClientIp, getRetryAfterSeconds } from '@/lib/rateLimit';
import { aqiQuerySchema } from '@/lib/schemas';

/**
 * Handles `GET /api/aqi?city=...` or `GET /api/aqi?lat=...&lon=...`.
 *
 * @param request - Incoming Next.js GET request.
 * @returns JSON `{ aqi }` on success or a standardized error response.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const rate = aqiRateLimiter.check(getClientIp(request));
  if (!rate.allowed) {
    return toErrorResponse(
      new AppError(
        'Too many air-quality lookups. Please wait a minute and try again.',
        429,
        true,
        'RATE_LIMITED',
        { 'Retry-After': getRetryAfterSeconds(rate.resetAt) }
      )
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = aqiQuerySchema.safeParse({
    city: searchParams.get('city') ?? undefined,
    lat: searchParams.get('lat') ?? undefined,
    lon: searchParams.get('lon') ?? undefined,
  });

  if (!parsed.success) {
    return toErrorResponse(
      new AppError(
        parsed.error.issues[0]?.message ?? 'Invalid location query parameters.',
        400,
        false,
        'VALIDATION_ERROR'
      )
    );
  }

  try {
    const aqi = await fetchOpenMeteoAqi(parsed.data);
    return NextResponse.json(
      { aqi },
      {
        status: 200,
        headers: { 'Cache-Control': AQI_CACHE_CONTROL_HEADER },
      }
    );
  } catch (err) {
    const appError =
      err instanceof AppError
        ? err
        : new AppError(
            'Unable to reach the live air quality service right now.',
            502,
            true,
            'AQI_UPSTREAM_ERROR'
          );

    console.error('[AirWise][/api/aqi] Lookup failed:', {
      status: appError.statusCode,
      code: appError.code,
      detail: err instanceof Error ? err.message : 'Unknown AQI lookup error',
    });

    return toErrorResponse(appError);
  }
}
