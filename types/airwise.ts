/**
 * @fileoverview Domain types for AirWise, re-exporting Zod-inferred schemas as the
 * single source of truth alongside discriminated unions for API responses, AQI telemetry, and UI state.
 */

import type { GeminiRecommendationPlan } from '@/lib/schemas';

export type {
  AqiContextInput,
  AqiQuery,
  BudgetLevel,
  ChatMessageInput,
  ChatRequestPayload,
  CommuteMode,
  CookingFuel,
  GeminiRecommendationPlan,
  HeatingSource,
  HomeType,
  HouseholdGroup,
  RecommendationCategory,
  RecommendationItem,
  RecommendRequestPayload,
  UserProfile,
  VentilationType,
} from '@/lib/schemas';

export type AqiCategoryId =
  'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';

export type AqiIconName =
  'shield-check' | 'wind' | 'alert-triangle' | 'alert-octagon' | 'flame' | 'siren';

export interface AqiCategoryMeta {
  id: AqiCategoryId;
  label: string;
  rangeLabel: string;
  icon: AqiIconName;
  healthGuidance: string;
  winterSmogNote: string;
  textClass: string;
  surfaceClass: string;
  borderClass: string;
  barColorHex: string;
}

export interface AqiReading {
  locationName: string;
  latitude: number;
  longitude: number;
  usAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  observedAt: string;
  category: AqiCategoryMeta;
  isFallback?: boolean | undefined;
  source: string;
}

export interface RecommendationPlan extends GeminiRecommendationPlan {
  generatedAt: string;
  isFallback?: boolean | undefined;
}

export type RecommendationFilterTab = 'all' | 'routine' | 'indoor' | 'sustainable' | 'vulnerable';

export interface ImpactMetrics {
  baselineExposureUgM3: number;
  projectedExposureUgM3: number;
  exposureReductionPct: number;
  baselineEmissionIndex: number;
  projectedEmissionIndex: number;
  emissionReductionPct: number;
  completedActionsCount: number;
  totalActionsCount: number;
  activeExposureUgM3: number;
  activeEmissionIndex: number;
}

export type ChatResponseSource = 'faq' | 'cache' | 'gemini' | 'fallback';

export type FaqCategory = 'indoor' | 'commute' | 'health' | 'cooking' | 'heating' | 'community';

export interface FaqEntry {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  impact: string;
  category: FaqCategory;
}

export type AppErrorCode =
  | 'RATE_LIMITED'
  | 'INVALID_JSON'
  | 'INVALID_REQUEST'
  | 'VALIDATION_ERROR'
  | 'EMPTY_MESSAGE'
  | 'LOCATION_NOT_FOUND'
  | 'AQI_UPSTREAM_ERROR'
  | 'CONFIG_MISSING'
  | 'AUTH_ERROR'
  | 'MODEL_NOT_FOUND'
  | 'TIMEOUT'
  | 'SERVICE_UNAVAILABLE'
  | 'UPSTREAM_TRANSIENT'
  | 'NETWORK_ERROR'
  | 'EMPTY_RESPONSE'
  | 'MALFORMED_JSON'
  | 'SCHEMA_MISMATCH'
  | 'CIRCUIT_OPEN'
  | 'UPSTREAM_ERROR';

export interface ApiErrorDetail {
  code: AppErrorCode;
  message: string;
  retryable: boolean;
}

/** Discriminated union representing all valid HTTP 200 responses from POST /api/chat. */
export type ChatApiResponse =
  | {
      source: 'faq';
      reply: string;
      faqId: string;
      impact: string;
    }
  | {
      source: 'cache' | 'gemini';
      reply: string;
    }
  | {
      source: 'fallback';
      reply: string;
      notice: string;
    };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  source?: ChatResponseSource | undefined;
  impact?: string | undefined;
  notice?: string | undefined;
  retryQuestion?: string | undefined;
}
