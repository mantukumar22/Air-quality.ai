/**
 * @fileoverview Browser-safe barrel exports for AirWise domain helpers and constants,
 * reducing import noise in UI components and hooks. Server-only modules (`gemini`, `env`, `errors`)
 * remain imported explicitly on the server.
 */

export { extractErrorMessage, toAqiContextInput } from '@/lib/apiClient';
export { calculateUsAqiFromPm25, getAqiCategory, getFallbackAqiReading } from '@/lib/aqi';
export {
  BUSY_AI_NOTICE,
  DEFAULT_PROFILE,
  INPUT_LIMITS,
  MEDICAL_DISCLAIMER,
  STORAGE_KEYS,
  UI_TIMING_MS,
} from '@/lib/constants';
export { buildFallbackPlan } from '@/lib/fallbackPlan';
export {
  buildChatCacheKey,
  buildOfflineFallbackAnswer,
  ChatAnswerCache,
  getSuggestedFaqEntries,
  matchFaqQuestion,
  personalizeFaqAnswer,
} from '@/lib/faqMatcher';
export {
  calculateImpactMetrics,
  combineReductionPercentages,
  computeBaselineMetrics,
  flattenPlanItems,
} from '@/lib/impact';
export { sanitizeForPrompt, sanitizeText } from '@/lib/sanitize';
