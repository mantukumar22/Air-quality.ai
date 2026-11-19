import type { AqiCategoryId, AqiCategoryMeta, UserProfile } from '@/types/airwise';

/** Primary Gemini model alias defined by platform guidance. */
export const GEMINI_MODEL = 'gemini-4-hydrogen';

/** Lighter fallback model used when primary model is overloaded or rate limited. */
export const GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';

/** Ordered model fallback chain for resilient Gemini calls. */
export const GEMINI_MODEL_CHAIN = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL] as const;

/** Retry, timeout, exponential backoff + jitter, and circuit-breaker parameters. */
export const GEMINI_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelaysMs: [500, 1000, 2000] as const,
  jitterMaxMs: 250,
  timeoutMs: 10_000,
  circuitFailureThreshold: 3,
  circuitOpenDurationMs: 60_000,
} as const;

/** Bounded in-memory cache settings for chat answers. */
export const CHAT_CACHE_CONFIG = {
  maxEntries: 120,
  ttlMs: 900_000,
} as const;

/** Revalidation interval for Open-Meteo AQI fetches (~15 minutes). */
export const AQI_REVALIDATE_SECONDS = 900;

/** Upstream API endpoints (Open-Meteo requires no API key). */
export const OPEN_METEO_AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
export const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Per-IP sliding window rate limits for API route handlers. */
export const RATE_LIMITS = {
  aqi: { limit: 40, windowMs: 60_000 },
  recommend: { limit: 15, windowMs: 60_000 },
  chat: { limit: 30, windowMs: 60_000 },
} as const;

/** Input clamping constants for security and prompt defense. */
export const INPUT_LIMITS = {
  cityMaxLength: 100,
  chatMessageMaxLength: 600,
  chatHistoryMaxItems: 10,
} as const;

/** Client-side persistence keys (browser only, never server-side). */
export const STORAGE_KEYS = {
  checklist: 'airwise_checklist_v1',
  theme: 'airwise_theme_v1',
  cachedAqi: 'airwise_cached_aqi_v1',
  cachedPlan: 'airwise_cached_plan_v1',
} as const;

/** Default initial household profile for first-visit usability. */
export const DEFAULT_PROFILE: UserProfile = {
  city: 'New Delhi',
  householdGroups: ['kids'],
  commuteMode: 'public_transit',
  homeType: 'apartment',
  ventilation: 'natural_windows',
  heatingSource: 'electric',
  cookingFuel: 'lpg_gas',
  budget: 'low',
};

/** Default fallback baseline AQI metrics when upstream service is unreachable. */
export const FALLBACK_AQI_VALUES = {
  usAqi: 185,
  pm25: 102.4,
  pm10: 168.0,
  no2: 54.2,
  latitude: 28.6139,
  longitude: 77.209,
  observedAt: '2026-01-15T08:00:00.000Z',
} as const;

/** Standard medical & estimate disclaimer copy. */
export const MEDICAL_DISCLAIMER =
  'AirWise provides informational environmental guidance and estimated exposure reductions, not medical advice. Consult a qualified clinician for respiratory symptoms, asthma action plans, or health emergencies.';

/** Color-blind-safe AQI category metadata pairing color, icon, range, and guidance. */
export const AQI_CATEGORIES: Record<AqiCategoryId, AqiCategoryMeta> = {
  good: {
    id: 'good',
    label: 'Good',
    rangeLabel: '0–50 AQI',
    icon: 'shield-check',
    healthGuidance:
      'Air quality is satisfactory. Ideal window for cross-ventilating rooms and outdoor family activity.',
    winterSmogNote: 'Low particulate load; keep indoor humidity near 40–50% to prevent dampness.',
    textClass: 'text-emerald-800 dark:text-emerald-300',
    surfaceClass: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    barColorHex: '#15803D',
  },
  moderate: {
    id: 'moderate',
    label: 'Moderate',
    rangeLabel: '51–100 AQI',
    icon: 'wind',
    healthGuidance:
      'Acceptable for most people; sensitive individuals with asthma should monitor symptoms during vigorous outdoor exercise.',
    winterSmogNote:
      'Cool evenings can trap exhaust near street level. Ventilate briefly mid-afternoon when dispersion peaks.',
    textClass: 'text-amber-800 dark:text-amber-300',
    surfaceClass: 'bg-amber-50 dark:bg-amber-950/50',
    borderClass: 'border-amber-200 dark:border-amber-800',
    barColorHex: '#B45309',
  },
  sensitive: {
    id: 'sensitive',
    label: 'Unhealthy for Sensitive Groups',
    rangeLabel: '101–150 AQI',
    icon: 'alert-triangle',
    healthGuidance:
      'Children, older adults, and people with respiratory or heart conditions should shorten outdoor exertion.',
    winterSmogNote:
      'Morning temperature inversions often hold PM2.5 close to the ground; shift errands to early afternoon.',
    textClass: 'text-orange-800 dark:text-orange-300',
    surfaceClass: 'bg-orange-50 dark:bg-orange-950/50',
    borderClass: 'border-orange-200 dark:border-orange-800',
    barColorHex: '#C2410C',
  },
  unhealthy: {
    id: 'unhealthy',
    label: 'Unhealthy',
    rangeLabel: '151–200 AQI',
    icon: 'alert-octagon',
    healthGuidance:
      'Everyone may begin to experience irritation; wear a well-fitted N95/KN95 outdoors and keep indoor air filtered.',
    winterSmogNote:
      'Severe winter smog traps traffic, heating, and biomass smoke under low wind. Seal window drafts and avoid open burning.',
    textClass: 'text-red-800 dark:text-red-300',
    surfaceClass: 'bg-red-50 dark:bg-red-950/50',
    borderClass: 'border-red-200 dark:border-red-800',
    barColorHex: '#B91C1C',
  },
  very_unhealthy: {
    id: 'very_unhealthy',
    label: 'Very Unhealthy',
    rangeLabel: '201–300 AQI',
    icon: 'flame',
    healthGuidance:
      'Health alert: move all exercise indoors, run HEPA or DIY box-fan filtration continuously, and use N95 masks outside.',
    winterSmogNote:
      'Persistent inversion layer and regional smoke episodes elevate fine particulates indoors through gaps.',
    textClass: 'text-purple-800 dark:text-purple-300',
    surfaceClass: 'bg-purple-50 dark:bg-purple-950/50',
    borderClass: 'border-purple-200 dark:border-purple-800',
    barColorHex: '#7E22CE',
  },
  hazardous: {
    id: 'hazardous',
    label: 'Hazardous',
    rangeLabel: '301+ AQI',
    icon: 'siren',
    healthGuidance:
      'Emergency conditions: stay indoors in a clean-air room, keep doors/windows sealed, and check on vulnerable neighbors.',
    winterSmogNote:
      'Extreme smog accumulation. Eliminate indoor combustion (candles, incense, unvented stoves) immediately.',
    textClass: 'text-rose-900 dark:text-rose-300',
    surfaceClass: 'bg-rose-50 dark:bg-rose-950/50',
    borderClass: 'border-rose-300 dark:border-rose-800',
    barColorHex: '#881337',
  },
};
