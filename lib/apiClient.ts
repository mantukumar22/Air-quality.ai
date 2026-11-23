/**
 * @fileoverview Browser-safe API payload extraction utilities shared by client hooks.
 */

import type { ApiErrorDetail, AqiContextInput, AqiReading } from '@/types/airwise';

/**
 * Extracts a human-readable error message from a server JSON error field
 * supporting both string and structured `ApiErrorDetail` responses.
 *
 * @param error - Server error field (`string`, `ApiErrorDetail`, or `undefined`).
 * @param fallback - Default copy used when no non-empty error text is present.
 * @returns Normalized display error string.
 */
export function extractErrorMessage(
  error: string | ApiErrorDetail | undefined,
  fallback: string
): string {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  if (error && typeof error === 'object' && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return fallback;
}

/**
 * Converts a full `AqiReading` into the compact `AqiContextInput` snapshot expected
 * by `/api/recommend` and `/api/chat`.
 *
 * @param aqi - Full telemetry reading from Open-Meteo or fallback baseline.
 * @returns Compact AQI payload for prompt grounding.
 */
export function toAqiContextInput(aqi: AqiReading): AqiContextInput {
  return {
    locationName: aqi.locationName,
    usAqi: aqi.usAqi,
    pm25: aqi.pm25,
    pm10: aqi.pm10,
    no2: aqi.no2,
    categoryLabel: aqi.category.label,
  };
}
