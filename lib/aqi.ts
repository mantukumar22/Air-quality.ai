/**
 * @fileoverview Pure lookup and calculation helpers for US AQI categories,
 * Open-Meteo geocoding & pollutant telemetry, and deterministic offline baselines.
 */

import {
  AQI_CATEGORIES,
  AQI_CATEGORY_THRESHOLDS,
  AQI_REVALIDATE_SECONDS,
  FALLBACK_AQI_VALUES,
  INPUT_LIMITS,
  OPEN_METEO_AIR_QUALITY_URL,
  OPEN_METEO_GEOCODING_URL,
  UI_TIMING_MS,
  US_EPA_PM25_BREAKPOINTS,
} from '@/lib/constants';
import { AppError } from '@/lib/errors';
import { sanitizeText } from '@/lib/sanitize';
import type { AqiCategoryId, AqiCategoryMeta, AqiReading } from '@/types/airwise';

interface OpenMeteoGeoResult {
  results?: Array<{
    name?: string;
    country?: string;
    admin1?: string;
    latitude?: number;
    longitude?: number;
  }>;
}

interface OpenMeteoAirQualityResponse {
  current?: {
    time?: string;
    us_aqi?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
    nitrogen_dioxide?: number | null;
  };
}

/**
 * Maps a numeric US AQI value to its standardized category metadata using ordered thresholds.
 *
 * @param aqi - Numeric US AQI index value.
 * @returns Category metadata (label, color-blind-safe icon, range, guidance).
 */
export function getAqiCategory(aqi: number): AqiCategoryMeta {
  const safeAqi = Number.isFinite(aqi) ? Math.max(0, Math.round(aqi)) : 0;
  const matched = AQI_CATEGORY_THRESHOLDS.find(([upperBound]) => safeAqi <= upperBound);
  const categoryId: AqiCategoryId = matched ? matched[1] : 'hazardous';
  return AQI_CATEGORIES[categoryId];
}

/**
 * Computes approximate US EPA AQI from PM2.5 (µg/m³) when direct AQI is absent.
 *
 * @param pm25 - Fine particulate concentration in µg/m³.
 * @returns Rounded US EPA AQI value clamped to 500.
 */
export function calculateUsAqiFromPm25(pm25: number): number {
  const concentration = Math.max(0, Math.floor(pm25 * 10) / 10);

  for (const [cLow, cHigh, iLow, iHigh] of US_EPA_PM25_BREAKPOINTS) {
    if (concentration <= cHigh) {
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (concentration - cLow) + iLow);
    }
  }
  return 500;
}

/**
 * Returns a deterministic winter-smog fallback AQI reading when upstream APIs fail.
 *
 * @param cityName - Optional display city name for offline fallback labeling.
 * @returns Offline baseline `AqiReading` marked `isFallback: true`.
 */
export function getFallbackAqiReading(cityName = 'Your Area'): AqiReading {
  const cleanCity = sanitizeText(cityName, 80) || 'Your Area';
  return {
    locationName: `${cleanCity} (Offline Baseline)`,
    latitude: FALLBACK_AQI_VALUES.latitude,
    longitude: FALLBACK_AQI_VALUES.longitude,
    usAqi: FALLBACK_AQI_VALUES.usAqi,
    pm25: FALLBACK_AQI_VALUES.pm25,
    pm10: FALLBACK_AQI_VALUES.pm10,
    no2: FALLBACK_AQI_VALUES.no2,
    observedAt: FALLBACK_AQI_VALUES.observedAt,
    category: getAqiCategory(FALLBACK_AQI_VALUES.usAqi),
    isFallback: true,
    source: 'Cached Winter Smog Baseline',
  };
}

function getTimeoutSignal(): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(UI_TIMING_MS.aqiFetchTimeoutMs)
    : undefined;
}

/**
 * Resolves a city name to geographic coordinates via Open-Meteo Geocoding API.
 *
 * @param city - City or neighborhood query string.
 * @returns Resolved display name and coordinates.
 * @throws {AppError} When geocoding fails or no location matches.
 */
export async function geocodeCity(
  city: string
): Promise<{ name: string; latitude: number; longitude: number }> {
  const cleanCity = sanitizeText(city, INPUT_LIMITS.cityMaxLength);
  const url = `${OPEN_METEO_GEOCODING_URL}?name=${encodeURIComponent(cleanCity)}&count=1&language=en&format=json`;
  const signal = getTimeoutSignal();

  const response = await fetch(url, {
    next: { revalidate: AQI_REVALIDATE_SECONDS },
    headers: { Accept: 'application/json' },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new AppError(
      `Geocoding service responded with status ${response.status}`,
      502,
      true,
      'AQI_UPSTREAM_ERROR'
    );
  }

  const data = (await response.json()) as OpenMeteoGeoResult;
  const first = data.results?.[0];

  if (!first || typeof first.latitude !== 'number' || typeof first.longitude !== 'number') {
    throw new AppError(
      `Location not found. Please check the city spelling or try nearby coordinates.`,
      404,
      false,
      'LOCATION_NOT_FOUND'
    );
  }

  const labelParts = [first.name, first.admin1, first.country].filter(Boolean);
  return {
    name: labelParts.slice(0, 2).join(', ') || cleanCity,
    latitude: first.latitude,
    longitude: first.longitude,
  };
}

/**
 * Fetches live US AQI, PM2.5, PM10, and NO2 from Open-Meteo Air Quality API
 * with 15-minute Next.js fetch caching.
 *
 * @param params - City name or numeric latitude/longitude coordinates.
 * @returns Normalized `AqiReading` telemetry object.
 * @throws {AppError} On invalid location parameters or upstream service failures.
 */
export async function fetchOpenMeteoAqi(params: {
  city?: string | undefined;
  lat?: number | undefined;
  lon?: number | undefined;
}): Promise<AqiReading> {
  let locationName = params.city
    ? sanitizeText(params.city, INPUT_LIMITS.cityMaxLength)
    : 'Current Location';
  let latitude = params.lat;
  let longitude = params.lon;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    if (!params.city) {
      throw new AppError(
        'City or coordinates are required to fetch air quality.',
        400,
        false,
        'VALIDATION_ERROR'
      );
    }
    const geo = await geocodeCity(params.city);
    locationName = geo.name;
    latitude = geo.latitude;
    longitude = geo.longitude;
  }

  const airUrl =
    `${OPEN_METEO_AIR_QUALITY_URL}?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}` +
    `&current=us_aqi,pm10,pm2_5,nitrogen_dioxide&timezone=auto`;
  const signal = getTimeoutSignal();

  const response = await fetch(airUrl, {
    next: { revalidate: AQI_REVALIDATE_SECONDS },
    headers: { Accept: 'application/json' },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new AppError(
      'Unable to reach the live air quality service right now.',
      502,
      true,
      'AQI_UPSTREAM_ERROR'
    );
  }

  const payload = (await response.json()) as OpenMeteoAirQualityResponse;
  const current = payload.current;

  if (!current) {
    throw new AppError(
      'Unable to reach the live air quality service right now.',
      502,
      true,
      'AQI_UPSTREAM_ERROR'
    );
  }

  const pm25 = typeof current.pm2_5 === 'number' ? Number(current.pm2_5.toFixed(1)) : 0;
  const pm10 = typeof current.pm10 === 'number' ? Number(current.pm10.toFixed(1)) : 0;
  const no2 =
    typeof current.nitrogen_dioxide === 'number' ? Number(current.nitrogen_dioxide.toFixed(1)) : 0;
  const rawAqi =
    typeof current.us_aqi === 'number' ? Math.round(current.us_aqi) : calculateUsAqiFromPm25(pm25);

  return {
    locationName,
    latitude,
    longitude,
    usAqi: rawAqi,
    pm25,
    pm10,
    no2,
    observedAt: current.time || new Date().toISOString(),
    category: getAqiCategory(rawAqi),
    isFallback: false,
    source: 'Open-Meteo Air Quality API',
  };
}
