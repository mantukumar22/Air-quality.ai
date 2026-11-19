'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getFallbackAqiReading } from '@/lib/aqi';
import { DEFAULT_PROFILE, STORAGE_KEYS } from '@/lib/constants';
import type { ApiErrorDetail, AqiReading } from '@/types/airwise';

function extractErrorMessage(error: string | ApiErrorDetail | undefined, fallback: string): string {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object' && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

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
    return null;
  }
}

function persistCachedAqi(reading: AqiReading): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.cachedAqi, JSON.stringify(reading));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Custom hook for fetching, caching, and gracefully falling back on live Open-Meteo AQI data.
 */
export function useAqi(initialCity = DEFAULT_PROFILE.city): UseAqiResult {
  const [aqi, setAqi] = useState<AqiReading>(() => getFallbackAqiReading(initialCity));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchByCity = useCallback(async (city: string): Promise<AqiReading | null> => {
    const trimmed = city.trim();
    if (trimmed.length < 2) {
      setError('Please enter at least 2 characters for a city or neighborhood.');
      return null;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/aqi?city=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        aqi?: AqiReading;
        error?: string | ApiErrorDetail;
      };

      if (!res.ok || !data.aqi) {
        throw new Error(
          extractErrorMessage(data.error, 'Could not load live air quality for that location.')
        );
      }

      setAqi(data.aqi);
      persistCachedAqi(data.aqi);
      return data.aqi;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to reach live AQI data. Showing cached winter smog baseline.';
      setError(`${message} Showing fallback baseline guidance.`);

      const cached = readCachedAqi();
      const fallback = cached ? { ...cached, isFallback: true } : getFallbackAqiReading(trimmed);
      setAqi(fallback);
      return fallback;
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

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
          timeout: 8000,
          maximumAge: 300_000,
        });
      });

      const { latitude, longitude } = position.coords;
      setIsLoading(true);

      const res = await fetch(
        `/api/aqi?lat=${encodeURIComponent(latitude.toFixed(4))}&lon=${encodeURIComponent(
          longitude.toFixed(4)
        )}`,
        { signal: controller.signal }
      );
      const data = (await res.json().catch(() => ({}))) as {
        aqi?: AqiReading;
        error?: string | ApiErrorDetail;
      };

      if (!res.ok || !data.aqi) {
        throw new Error(
          extractErrorMessage(data.error, 'Unable to load air quality for your coordinates.')
        );
      }

      setAqi(data.aqi);
      persistCachedAqi(data.aqi);
      return data.aqi;
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
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    abortRef.current = controller;

    fetch(`/api/aqi?city=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          aqi?: AqiReading;
          error?: string | ApiErrorDetail;
        };
        if (!res.ok || !data.aqi) {
          throw new Error(extractErrorMessage(data.error, 'Could not load live air quality.'));
        }
        return data.aqi;
      })
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
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to reach live AQI data. Showing cached winter smog baseline.';
        setError(`${message} Showing fallback baseline guidance.`);
        const cached = readCachedAqi();
        setAqi(cached ? { ...cached, isFallback: true } : getFallbackAqiReading(trimmed));
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [initialCity]);

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
