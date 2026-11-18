import {
  AQI_CATEGORIES,
  AQI_REVALIDATE_SECONDS,
  FALLBACK_AQI_VALUES,
  OPEN_METEO_AIR_QUALITY_URL,
  OPEN_METEO_GEOCODING_URL,
} from '@/lib/constants';
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
 * Maps a numeric US AQI value to its standardized category metadata.
 */
export function getAqiCategory(aqi: number): AqiCategoryMeta {
  const safeAqi = Number.isFinite(aqi) ? Math.max(0, Math.round(aqi)) : 0;
  let id: AqiCategoryId = 'good';

  if (safeAqi <= 50) {
    id = 'good';
  } else if (safeAqi <= 100) {
    id = 'moderate';
  } else if (safeAqi <= 150) {
    id = 'sensitive';
  } else if (safeAqi <= 200) {
    id = 'unhealthy';
  } else if (safeAqi <= 300) {
    id = 'very_unhealthy';
  } else {
    id = 'hazardous';
  }

  return AQI_CATEGORIES[id];
}

/**
 * Computes approximate US EPA AQI from PM2.5 (µg/m³) when direct AQI is missing.
 */
export function calculateUsAqiFromPm25(pm25: number): number {
  const c = Math.max(0, Math.floor(pm25 * 10) / 10);
  const breakpoints: Array<[number, number, number, number]> = [
    [0.0, 9.0, 0, 50],
    [9.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 125.4, 151, 200],
    [125.5, 225.4, 201, 300],
    [225.5, 500.4, 301, 500],
  ];

  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (c <= cHigh) {
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow);
    }
  }
  return 500;
}

/**
 * Returns a deterministic winter-smog fallback AQI reading when upstream APIs fail.
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
    observedAt: new Date().toISOString(),
    category: getAqiCategory(FALLBACK_AQI_VALUES.usAqi),
    isFallback: true,
    source: 'Cached Winter Smog Baseline',
  };
}

/**
 * Resolves a city name to coordinates using Open-Meteo Geocoding API.
 */
export async function geocodeCity(
  city: string
): Promise<{ name: string; latitude: number; longitude: number }> {
  const cleanCity = sanitizeText(city, 100);
  const url = `${OPEN_METEO_GEOCODING_URL}?name=${encodeURIComponent(cleanCity)}&count=1&language=en&format=json`;

  const response = await fetch(url, {
    next: { revalidate: AQI_REVALIDATE_SECONDS },
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Geocoding service responded with status ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoGeoResult;
  const first = data.results?.[0];

  if (
    !first ||
    typeof first.latitude !== 'number' ||
    typeof first.longitude !== 'number'
  ) {
    throw new Error(`Location "${cleanCity}" was not found. Try a nearby major city.`);
  }

  const labelParts = [first.name, first.admin1, first.country].filter(Boolean);
  return {
    name: labelParts.slice(0, 2).join(', ') || cleanCity,
    latitude: first.latitude,
    longitude: first.longitude,
  };
}

/**
 * Fetches live AQI, PM2.5, PM10, and NO2 from Open-Meteo Air Quality API
 * with 15-minute Next.js fetch caching.
 */
export async function fetchOpenMeteoAqi(params: {
  city?: string;
  lat?: number;
  lon?: number;
}): Promise<AqiReading> {
  let locationName = params.city ? sanitizeText(params.city, 100) : 'Current Location';
  let latitude = params.lat;
  let longitude = params.lon;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    if (!params.city) {
      throw new Error('City or coordinates are required to fetch air quality.');
    }
    const geo = await geocodeCity(params.city);
    locationName = geo.name;
    latitude = geo.latitude;
    longitude = geo.longitude;
  }

  const airUrl =
    `${OPEN_METEO_AIR_QUALITY_URL}?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}` +
    `&current=us_aqi,pm10,pm2_5,nitrogen_dioxide&timezone=auto`;

  const response = await fetch(airUrl, {
    next: { revalidate: AQI_REVALIDATE_SECONDS },
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo Air Quality API returned status ${response.status}`);
  }

  const payload = (await response.json()) as OpenMeteoAirQualityResponse;
  const current = payload.current;

  if (!current) {
    throw new Error('Open-Meteo returned empty air quality measurements.');
  }

  const pm25 = typeof current.pm2_5 === 'number' ? Number(current.pm2_5.toFixed(1)) : 0;
  const pm10 = typeof current.pm10 === 'number' ? Number(current.pm10.toFixed(1)) : 0;
  const no2 =
    typeof current.nitrogen_dioxide === 'number'
      ? Number(current.nitrogen_dioxide.toFixed(1))
      : 0;

  const rawAqi =
    typeof current.us_aqi === 'number'
      ? Math.round(current.us_aqi)
      : calculateUsAqiFromPm25(pm25);

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
