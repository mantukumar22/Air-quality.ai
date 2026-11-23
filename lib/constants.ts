/**
 * @fileoverview Centralized constants, thresholds, model chains, storage keys,
 * and lookup tables for AirWise so domain rules remain declarative and tunable.
 */

import type {
  AqiCategoryId,
  AqiCategoryMeta,
  CommuteMode,
  CookingFuel,
  HeatingSource,
  UserProfile,
  VentilationType,
} from '@/types/airwise';

/** Primary Gemini model alias defined by platform guidance. */
export const GEMINI_MODEL = 'gemini-4-hydrogen';

/** Lighter fallback model used when primary model is overloaded or rate limited. */
export const GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';

/** Ordered model fallback chain for resilient Gemini calls. */
export const GEMINI_MODEL_CHAIN = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL] as const;

/** Custom telemetry user-agent attached to server-side Gemini HTTP requests. */
export const GEMINI_USER_AGENT = 'aistudio-build';

/** Retry, timeout, exponential backoff + jitter, and circuit-breaker parameters. */
export const GEMINI_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelaysMs: [500, 1000, 2000] as const,
  jitterMaxMs: 250,
  timeoutMs: 10_000,
  circuitFailureThreshold: 3,
  circuitOpenDurationMs: 60_000,
  schemaMaxAttempts: 2,
  retryableHttpStatuses: new Set<number>([429, 500, 502, 503, 504]),
} as const;

/** Bounded in-memory cache settings for server chat answers. */
export const CHAT_CACHE_CONFIG = {
  maxEntries: 120,
  ttlMs: 900_000,
} as const;

/** Client-side chat memory and sessionStorage cache limits. */
export const CLIENT_SESSION_CACHE_CONFIG = {
  maxMemoryEntries: 40,
  maxStorageEntries: 30,
  ttlMs: 900_000,
} as const;

/** Reduced-motion-aware typing animation cadence shared by chat and FAQ chips. */
export const TYPING_REVEAL_CONFIG = {
  chatChunkSizeChars: 36,
  chipChunkSizeChars: 28,
  intervalMs: 16,
} as const;

/** Interactive UI timers and upstream fetch timeouts (in milliseconds). */
export const UI_TIMING_MS = {
  cityDebounceMs: 650,
  copyFeedbackDurationMs: 2500,
  geolocationTimeoutMs: 8000,
  geolocationMaxAgeMs: 300_000,
  aqiFetchTimeoutMs: 8000,
} as const;

/** Revalidation interval for Open-Meteo AQI fetches (~15 minutes). */
export const AQI_REVALIDATE_SECONDS = 900;

/** Cache-Control header value for live AQI API responses. */
export const AQI_CACHE_CONTROL_HEADER = 'public, s-maxage=900, stale-while-revalidate=300';

/** Upstream API endpoints (Open-Meteo requires no API key). */
export const OPEN_METEO_AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
export const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Per-IP sliding window rate limits for API route handlers. */
export const RATE_LIMITS = {
  aqi: { limit: 40, windowMs: 60_000 },
  recommend: { limit: 15, windowMs: 60_000 },
  chat: { limit: 30, windowMs: 60_000 },
  pruneStoreThreshold: 500,
} as const;

/** Input clamping constants for security and prompt defense. */
export const INPUT_LIMITS = {
  cityMinLength: 2,
  cityDebounceMinLength: 3,
  cityMaxLength: 100,
  categoryLabelMaxLength: 60,
  chatMessageMaxLength: 600,
  chatHistoryMaxItems: 10,
  geminiReplyMaxLength: 2400,
  householdGroupsMax: 4,
} as const;

/** Client-side persistence keys (browser only, never server-side). */
export const STORAGE_KEYS = {
  checklist: 'airwise_checklist_v1',
  theme: 'airwise_theme_v1',
  cachedAqi: 'airwise_cached_aqi_v1',
  cachedPlan: 'airwise_cached_plan_v1',
  chatSessionCache: 'airwise_chat_session_cache_v1',
  chunkReloadOnce: 'airwise_chunk_reload_once',
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

/** Friendly user-facing notice when upstream AI falls back to guide guidance. */
export const BUSY_AI_NOTICE = "Our AI is busy, here's a quick answer from our guide.";

/** Ordered US AQI upper bounds mapped to category IDs. */
export const AQI_CATEGORY_THRESHOLDS: ReadonlyArray<readonly [number, AqiCategoryId]> = [
  [50, 'good'],
  [100, 'moderate'],
  [150, 'sensitive'],
  [200, 'unhealthy'],
  [300, 'very_unhealthy'],
] as const;

/** US EPA PM2.5-to-AQI breakpoints: [cLow, cHigh, iLow, iHigh]. */
export const US_EPA_PM25_BREAKPOINTS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0.0, 9.0, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 500.4, 301, 500],
] as const;

/** Lookup tables and bounds used by the pure household impact calculator and SVG charts. */
export const IMPACT_CONSTANTS = {
  minOutdoorPm25: 5,
  ventilationInfiltrationMap: {
    natural_windows: 0.65,
    exhaust_fans: 0.55,
    hepa_purifier: 0.38,
    hvac_filtered: 0.38,
  } as const satisfies Record<VentilationType, number>,
  cookingPm25PenaltyMap: {
    induction: 4,
    electric_coil: 4,
    lpg_gas: 11,
    biomass_solid: 28,
  } as const satisfies Record<CookingFuel, number>,
  commuteExposureMultiplierMap: {
    walking_cycling: 0.22,
    public_transit: 0.14,
    carpool: 0.1,
    private_car: 0.1,
    remote: 0,
  } as const satisfies Record<CommuteMode, number>,
  emissionBaseScore: 20,
  commuteEmissionScoreMap: {
    private_car: 28,
    carpool: 14,
    public_transit: 8,
    walking_cycling: 0,
    remote: 0,
  } as const satisfies Record<CommuteMode, number>,
  heatingEmissionScoreMap: {
    wood_coal: 32,
    natural_gas: 16,
    district: 10,
    electric: 6,
    none: 0,
  } as const satisfies Record<HeatingSource, number>,
  cookingEmissionScoreMap: {
    biomass_solid: 22,
    lpg_gas: 10,
    electric_coil: 4,
    induction: 0,
  } as const satisfies Record<CookingFuel, number>,
  minEmissionIndex: 10,
  maxEmissionIndex: 100,
  maxSingleActionPct: 60,
  compoundingWeight: 0.45,
  maxCombinedReductionPct: 72,
  chartMinScale: 20,
  chartMinBarWidthPct: 6,
  chartSvgBarMaxWidth: 290,
} as const;

/** Scoring and cache bucket parameters for pre-stored FAQ matching. */
export const FAQ_MATCHER_CONFIG = {
  defaultThreshold: 0.48,
  minTokenLength: 2,
  minPrefixFuzzyLength: 4,
  suggestedChipMin: 6,
  suggestedChipDefault: 7,
  suggestedChipMax: 8,
  aqiBucketSize: 25,
  highSmogAqiThreshold: 150,
  moderateSmogAqiThreshold: 100,
  phraseKeywordMinLength: 4,
  phraseExactBonus: 0.35,
  wordBonus: 0.16,
  bothTokenWeight: 1.25,
  keywordWeight: 1.0,
  questionWeight: 0.9,
  fuzzyWeight: 0.65,
  diceThreshold: 0.82,
  coverageWeight: 0.68,
  maxPhraseBonus: 0.45,
  diceWeight: 0.25,
} as const;

/** English stopwords stripped before FAQ keyword scoring and cache-key normalization. */
export const STOPWORDS = new Set<string>([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'can',
  'could',
  'do',
  'does',
  'for',
  'from',
  'have',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'please',
  'should',
  'so',
  'tell',
  'that',
  'the',
  'their',
  'them',
  'there',
  'these',
  'they',
  'this',
  'to',
  'today',
  'us',
  'vs',
  'was',
  'we',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'will',
  'with',
  'would',
  'you',
  'your',
]);

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
