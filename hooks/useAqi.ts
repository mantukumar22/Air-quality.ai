/**
 * @fileoverview Custom hook for fetching, caching, and gracefully falling back on
 * live Open-Meteo AQI data by city query or browser geolocation.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { extractErrorMessage } from '@/lib/apiClient';
import { getFallbackAqiReading } from '@/lib/aqi';
import { DEFAULT_PROFILE, INPUT_LIMITS, STORAGE_KEYS, UI_TIMING_MS } from '@/lib/constants';
import type { ApiErrorDetail, AqiReading } from '@/types/airwise';

export interface UseAqiResult {
  aqi: AqiReading;
  isLoading: boolean;
  isLocating: boolean;
  error: string | null;
  fetchByCity: (city: string) => Promise<AqiReading | null>;
  fetchByGeolocation: () => Promise<AqiReading | null>;
  clearError: () => void;
}

function readCachedAqi(): AqiReading | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.cachedAqi);
    if (!raw) return null;
    return JSON.parse(raw) as AqiReading;
  } catch {
    // Non-fatal: storage unavailable or invalid cached JSON
    return null;
  }
}

function persistCachedAqi(reading: AqiReading): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.cachedAqi, JSON.stringify(reading));
  } catch {
    // Non-fatal: ignore storage quota exceeded errors
  }
}

async function fetchAqiEndpoint(
  url: string,
  signal: AbortSignal,
  fallbackError: string
): Promise<AqiReading> {
  const res = await fetch(url, { signal });
  const data = (await res.json().catch(() => ({}))) as {
    aqi?: AqiReading;
    error?: string | ApiErrorDetail;
  };

  if (!res.ok || !data.aqi) {
    throw new Error(extractErrorMessage(data.error, fallbackError));
  }

  return data.aqi;
}

/**
 * Manages live neighborhood AQI lookup by city or browser coordinates,
 * persisting the latest successful reading to `localStorage` for offline resilience.
 *
 * @param initialCity - Default city loaded on mount.
 * @returns Active AQI reading, loading/locating flags, error state, and lookup actions.
 */
export function useAqi(initialCity = DEFAULT_PROFILE.city): UseAqiResult {
  const [aqi, setAqi] = useState<AqiReading>(() => getFallbackAqiReading(initialCity));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const applyCityFallback = useCallback((err: unknown, cityName: string): AqiReading => {
    const message =
      err instanceof Error
        ? err.message
        : 'Unable to reach live AQI data. Showing cached winter smog baseline.';
    setError(`${message} Showing fallback baseline guidance.`);

    const cached = readCachedAqi();
    const fallback = cached ? { ...cached, isFallback: true } : getFallbackAqiReading(cityName);
    setAqi(fallback);
    return fallback;
  }, []);

  const fetchByCity = useCallback(
    async (city: string): Promise<AqiReading | null> => {
      const trimmed = city.trim();
      if (trimmed.length < INPUT_LIMITS.cityMinLength) {
        setError('Please enter at least 2 characters for a city or neighborhood.');
        return null;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const reading = await fetchAqiEndpoint(
          `/api/aqi?city=${encodeURIComponent(trimmed)}`,
          controller.signal,
          'Could not load live air quality for that location.'
        );
        setAqi(reading);
        persistCachedAqi(reading);
        return reading;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null;
        }
        return applyCityFallback(err, trimmed);
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [applyCityFallback]
  );

  const fetchByGeolocation = useCallback(async (): Promise<AqiReading | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Browser geolocation is not supported in this environment.');
      return null;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLocating(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: UI_TIMING_MS.geolocationTimeoutMs,
          maximumAge: UI_TIMING_MS.geolocationMaxAgeMs,
        });
      });

      const { latitude, longitude } = position.coords;
      setIsLoading(true);

      const url = `/api/aqi?lat=${encodeURIComponent(latitude.toFixed(4))}&lon=${encodeURIComponent(
        longitude.toFixed(4)
      )}`;
      const reading = await fetchAqiEndpoint(
        url,
        controller.signal,
        'Unable to load air quality for your coordinates.'
      );
      setAqi(reading);
      persistCachedAqi(reading);
      return reading;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      const geoMessage =
        err instanceof Error ? err.message : 'Location permission was declined or timed out.';
      setError(`${geoMessage} You can enter your city manually below.`);
      return null;
    } finally {
      setIsLocating(false);
      if (abortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const trimmed = initialCity.trim();
    if (trimmed.length < INPUT_LIMITS.cityMinLength) return;

    const controller = new AbortController();
    abortRef.current = controller;

    fetchAqiEndpoint(
      `/api/aqi?city=${encodeURIComponent(trimmed)}`,
      controller.signal,
      'Could not load live air quality.'
    )
      .then((reading) => {
        if (controller.signal.aborted) return;
        setAqi(reading);
        persistCachedAqi(reading);
        setError(null);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          return;
        }
        applyCityFallback(err, trimmed);
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [applyCityFallback, initialCity]);

  const clearError = useCallback(() => setError(null), []);

  return {
    aqi,
    isLoading,
    isLocating,
    error,
    fetchByCity,
    fetchByGeolocation,
    clearError,
  };
}
