/**
 * @fileoverview Custom hook requesting Gemini-powered household air-quality plans
 * with localStorage caching and deterministic offline fallback on API outages.
 */

'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { extractErrorMessage, toAqiContextInput } from '@/lib/apiClient';
import { STORAGE_KEYS } from '@/lib/constants';
import { buildFallbackPlan } from '@/lib/fallbackPlan';
import type { ApiErrorDetail, AqiReading, RecommendationPlan, UserProfile } from '@/types/airwise';

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
    // Non-fatal: browser privacy settings may restrict localStorage
    return null;
  }
}

function getCachedPlanServerSnapshot(): string | null {
  return null;
}

/**
 * Manages tailored household action plans with SSR-safe `localStorage` synchronization
 * and graceful fallback to `buildFallbackPlan` if `/api/recommend` fails.
 *
 * @param initialProfile - Initial household profile used for the default baseline plan.
 * @param initialAqi - Initial AQI snapshot used for the default baseline plan.
 * @returns Active plan, loading status, error notice, and `generatePlan` trigger.
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
            aqi: toAqiContextInput(aqi),
          }),
        });

        const data = (await response.json().catch(() => ({}))) as {
          plan?: RecommendationPlan;
          error?: string | ApiErrorDetail;
        };

        if (!response.ok || !data.plan) {
          throw new Error(
            extractErrorMessage(data.error, 'AI recommendation service returned an error.')
          );
        }

        setLivePlan(data.plan);
        try {
          window.localStorage.setItem(STORAGE_KEYS.cachedPlan, JSON.stringify(data.plan));
          window.dispatchEvent(new Event(PLAN_CHANGE_EVENT));
        } catch {
          // Non-fatal: ignore storage quota exceeded errors
        }
        return data.plan;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to reach AI recommendations right now.';
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
