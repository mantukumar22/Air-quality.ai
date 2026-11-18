'use client';

import { useCallback, useEffect, useState } from 'react';
import { getFallbackAqiReading } from '@/lib/aqi';
import { DEFAULT_PROFILE, STORAGE_KEYS } from '@/lib/constants';
import type { AqiReading } from '@/types/airwise';

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

  const fetchByCity = useCallback(async (city: string): Promise<AqiReading | null> => {
    const trimmed = city.trim();
    if (trimmed.length < 2) {
      setError('Please enter at least 2 characters for a city or neighborhood.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/aqi?city=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as { aqi?: AqiReading; error?: string };

      if (!res.ok || !data.aqi) {
        throw new Error(data.error || 'Could not load live air quality for that location.');
      }

      setAqi(data.aqi);
      persistCachedAqi(data.aqi);
      return data.aqi;
    } catch (err) {
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
      setIsLoading(false);
    }
  }, []);

  const fetchByGeolocation = useCallback(async (): Promise<AqiReading | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Browser geolocation is not supported in this environment.');
      return null;
    }

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
        )}`
      );
      const data = (await res.json()) as { aqi?: AqiReading; error?: string };

      if (!res.ok || !data.aqi) {
        throw new Error(data.error || 'Unable to load air quality for your coordinates.');
      }

      setAqi(data.aqi);
      persistCachedAqi(data.aqi);
      return data.aqi;
    } catch (err) {
      const geoMessage =
        err instanceof Error ? err.message : 'Location permission was declined or timed out.';
      setError(`${geoMessage} You can enter your city manually below.`);
      return null;
    } finally {
      setIsLocating(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const trimmed = initialCity.trim();
    if (trimmed.length < 2) return;

    fetch(`/api/aqi?city=${encodeURIComponent(trimmed)}`)
      .then(async (res) => {
        const data = (await res.json()) as { aqi?: AqiReading; error?: string };
        if (!res.ok || !data.aqi) {
          throw new Error(data.error || 'Could not load live air quality.');
        }
        return data.aqi;
      })
      .then((reading) => {
        if (cancelled) return;
        setAqi(reading);
        persistCachedAqi(reading);
        setError(null);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
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
      cancelled = true;
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
