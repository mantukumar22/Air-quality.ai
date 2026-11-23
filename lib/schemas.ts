/**
 * @fileoverview Single source of truth for runtime Zod validation schemas and
 * static domain types inferred via `z.infer`.
 */

import { z } from 'zod';
import { INPUT_LIMITS } from '@/lib/constants';
import { sanitizeText } from '@/lib/sanitize';

/** Validates city or lat/lon query parameters for GET /api/aqi. */
export const aqiQuerySchema = z
  .object({
    city: z
      .string()
      .trim()
      .transform((val) => sanitizeText(val, INPUT_LIMITS.cityMaxLength))
      .pipe(
        z
          .string()
          .min(INPUT_LIMITS.cityMinLength, 'City must be at least 2 characters')
          .max(INPUT_LIMITS.cityMaxLength)
      )
      .optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine(
    (data) => Boolean(data.city) || (typeof data.lat === 'number' && typeof data.lon === 'number'),
    {
      message: 'Provide either a city name or valid latitude and longitude coordinates.',
    }
  );

export const householdGroupEnum = z.enum(['kids', 'elderly', 'respiratory', 'pets']);
export const commuteModeEnum = z.enum([
  'walking_cycling',
  'public_transit',
  'carpool',
  'private_car',
  'remote',
]);
export const homeTypeEnum = z.enum(['apartment', 'detached_house', 'townhouse', 'shared_home']);
export const ventilationTypeEnum = z.enum([
  'natural_windows',
  'exhaust_fans',
  'hepa_purifier',
  'hvac_filtered',
]);
export const heatingSourceEnum = z.enum([
  'electric',
  'natural_gas',
  'wood_coal',
  'district',
  'none',
]);
export const cookingFuelEnum = z.enum(['induction', 'electric_coil', 'lpg_gas', 'biomass_solid']);
export const budgetLevelEnum = z.enum(['low', 'medium', 'high']);

/** Validates household profile submitted by the user. */
export const userProfileSchema = z.object({
  city: z
    .string()
    .trim()
    .transform((val) => sanitizeText(val, INPUT_LIMITS.cityMaxLength))
    .pipe(
      z
        .string()
        .min(
          INPUT_LIMITS.cityMinLength,
          'Please enter a city or neighborhood name (at least 2 characters).'
        )
        .max(INPUT_LIMITS.cityMaxLength, 'City name must be 100 characters or fewer.')
    ),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  householdGroups: z.array(householdGroupEnum).max(INPUT_LIMITS.householdGroupsMax),
  commuteMode: commuteModeEnum,
  homeType: homeTypeEnum,
  ventilation: ventilationTypeEnum,
  heatingSource: heatingSourceEnum,
  cookingFuel: cookingFuelEnum,
  budget: budgetLevelEnum,
});

/** Validates compact AQI snapshot passed from client to recommendation/chat endpoints. */
export const aqiContextSchema = z.object({
  locationName: z
    .string()
    .trim()
    .transform((val) => sanitizeText(val, INPUT_LIMITS.cityMaxLength)),
  usAqi: z.number().min(0).max(1000),
  pm25: z.number().min(0).max(2000),
  pm10: z.number().min(0).max(3000),
  no2: z.number().min(0).max(2000),
  categoryLabel: z.string().trim().max(INPUT_LIMITS.categoryLabelMaxLength),
});

/** Validates POST /api/recommend request payloads. */
export const recommendRequestSchema = z.object({
  profile: userProfileSchema,
  aqi: aqiContextSchema,
});

/** Validates individual chat message payloads submitted to /api/chat. */
export const chatMessageInputSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z
    .string()
    .trim()
    .transform((val) => sanitizeText(val, INPUT_LIMITS.chatMessageMaxLength, true))
    .pipe(
      z
        .string()
        .min(1, 'Message cannot be empty.')
        .max(INPUT_LIMITS.chatMessageMaxLength, 'Message is too long.')
    ),
});

/** Validates POST /api/chat request payloads. */
export const chatRequestSchema = z.object({
  profile: userProfileSchema,
  aqi: aqiContextSchema,
  messages: z
    .array(chatMessageInputSchema)
    .min(1, 'At least one message is required.')
    .max(INPUT_LIMITS.chatHistoryMaxItems),
  retryLive: z.boolean().optional(),
});

export const recommendationCategoryEnum = z.enum([
  'routine_morning',
  'routine_afternoon',
  'routine_evening',
  'indoor_hack',
  'sustainable_alt',
  'vulnerable_care',
  'community_action',
]);

/** Validates each structured recommendation item returned by Gemini. */
export const recommendationItemSchema = z.object({
  id: z.string().trim().min(1).max(60),
  category: recommendationCategoryEnum,
  title: z.string().trim().min(3).max(120),
  actionSummary: z.string().trim().min(8).max(260),
  whyItWorks: z.string().trim().min(8).max(280),
  pm25ReductionPct: z.number().min(0).max(75),
  emissionReductionPct: z.number().min(0).max(75),
  costTier: budgetLevelEnum,
  timeframe: z.string().trim().min(2).max(50),
  isEstimate: z.literal(true).default(true),
});

/** Validates the full JSON recommendation structure returned by Gemini. */
export const recommendationPlanSchema = z.object({
  headline: z.string().trim().min(5).max(160),
  winterSmogContext: z.string().trim().min(10).max(340),
  dailyRoutine: z.object({
    morning: z.array(recommendationItemSchema).min(1).max(3),
    afternoon: z.array(recommendationItemSchema).min(1).max(3),
    evening: z.array(recommendationItemSchema).min(1).max(3),
  }),
  indoorHacks: z.array(recommendationItemSchema).min(2).max(5),
  sustainableAlternatives: z.array(recommendationItemSchema).min(2).max(4),
  vulnerablePrecautions: z.array(recommendationItemSchema).min(1).max(4),
  communityActions: z.array(recommendationItemSchema).min(2).max(4),
  neighborShareSummary: z.string().trim().min(20).max(600),
  disclaimer: z.string().trim().min(15).max(300),
});

export type AqiQuery = z.infer<typeof aqiQuerySchema>;
export type HouseholdGroup = z.infer<typeof householdGroupEnum>;
export type CommuteMode = z.infer<typeof commuteModeEnum>;
export type HomeType = z.infer<typeof homeTypeEnum>;
export type VentilationType = z.infer<typeof ventilationTypeEnum>;
export type HeatingSource = z.infer<typeof heatingSourceEnum>;
export type CookingFuel = z.infer<typeof cookingFuelEnum>;
export type BudgetLevel = z.infer<typeof budgetLevelEnum>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type AqiContextInput = z.infer<typeof aqiContextSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>;
export type ChatRequestPayload = z.infer<typeof chatRequestSchema>;
export type RecommendRequestPayload = z.infer<typeof recommendRequestSchema>;
export type RecommendationCategory = z.infer<typeof recommendationCategoryEnum>;
export type RecommendationItem = z.infer<typeof recommendationItemSchema>;
export type GeminiRecommendationPlan = z.infer<typeof recommendationPlanSchema>;
