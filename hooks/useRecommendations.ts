'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';
import { buildFallbackPlan } from '@/lib/fallbackPlan';
import type { AqiReading, RecommendationPlan, UserProfile } from '@/types/airwise';

export interface UseRecommendationsResult {
  plan: RecommendationPlan | null;
  isGenerating: boolean;
  error: string | null;
  generatePlan: (profile: UserProfile, aqi: AqiReading) => Promise<RecommendationPlan>;
  clearError: () => void;
}

const PLAN_CHANGE_EVENT = 'airwise-plan-change';

function subscribeCachedPlan(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(PLAN_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(PLAN_CHANGE_EVENT, callback);
  };
}

function getCachedPlanSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.cachedPlan);
  } catch {
    return null;
  }
}

function getCachedPlanServerSnapshot(): string | null {
  return null;
}

/**
 * Custom hook to request Gemini-powered structured air-quality plans
 * with localStorage caching and graceful deterministic fallback on API failure.
 */
export function useRecommendations(
  initialProfile: UserProfile,
  initialAqi: AqiReading
): UseRecommendationsResult {
  const [livePlan, setLivePlan] = useState<RecommendationPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cachedRaw = useSyncExternalStore(
    subscribeCachedPlan,
    getCachedPlanSnapshot,
    getCachedPlanServerSnapshot
  );

  const defaultPlan = useMemo(
    () => buildFallbackPlan(initialProfile, initialAqi),
    [initialProfile, initialAqi]
  );

  const cachedPlan = useMemo(() => {
    if (!cachedRaw) return null;
    try {
      const parsed = JSON.parse(cachedRaw) as RecommendationPlan;
      if (parsed && parsed.dailyRoutine && parsed.indoorHacks) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, [cachedRaw]);

  const plan = livePlan ?? cachedPlan ?? defaultPlan;

  const generatePlan = useCallback(
    async (profile: UserProfile, aqi: AqiReading): Promise<RecommendationPlan> => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile,
            aqi: {
              locationName: aqi.locationName,
              usAqi: aqi.usAqi,
              pm25: aqi.pm25,
              pm10: aqi.pm10,
              no2: aqi.no2,
              categoryLabel: aqi.category.label,
            },
          }),
        });

        const data = (await response.json()) as {
          plan?: RecommendationPlan;
          error?: string;
        };

        if (!response.ok || !data.plan) {
          throw new Error(data.error || 'AI recommendation service returned an error.');
        }

        setLivePlan(data.plan);
        try {
          window.localStorage.setItem(STORAGE_KEYS.cachedPlan, JSON.stringify(data.plan));
          window.dispatchEvent(new Event(PLAN_CHANGE_EVENT));
        } catch {
          // Ignore storage quota errors
        }
        return data.plan;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to reach AI recommendations right now.';
        setError(
          `${message} Showing tailored offline winter-smog guidance so your household still has an actionable plan.`
        );
        const fallback = buildFallbackPlan(profile, aqi);
        setLivePlan(fallback);
        return fallback;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    plan,
    isGenerating,
    error,
    generatePlan,
    clearError,
  };
}
