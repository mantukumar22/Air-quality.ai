/**
 * @fileoverview Pure calculation engine estimating personal daily PM2.5 exposure
 * and household winter emission footprint before and after AirWise habits.
 */

import { IMPACT_CONSTANTS } from '@/lib/constants';
import type {
  AqiReading,
  ImpactMetrics,
  RecommendationItem,
  RecommendationPlan,
  UserProfile,
} from '@/types/airwise';

/**
 * Flattens all actionable recommendation items in a plan into a deduplicated list.
 *
 * @param plan - Structured household recommendation plan.
 * @returns Deduplicated array of `RecommendationItem` entries.
 */
export function flattenPlanItems(plan: RecommendationPlan): RecommendationItem[] {
  const all = [
    ...plan.dailyRoutine.morning,
    ...plan.dailyRoutine.afternoon,
    ...plan.dailyRoutine.evening,
    ...plan.indoorHacks,
    ...plan.sustainableAlternatives,
    ...plan.vulnerablePrecautions,
    ...plan.communityActions,
  ];

  const seen = new Set<string>();
  return all.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

/**
 * Resolves the indoor-to-outdoor PM2.5 infiltration factor from household ventilation.
 *
 * @param ventilation - Household ventilation setup.
 * @returns Fractional infiltration multiplier (0–1).
 */
export function computeInfiltrationFactor(ventilation: UserProfile['ventilation']): number {
  return IMPACT_CONSTANTS.ventilationInfiltrationMap[ventilation];
}

/**
 * Resolves the incremental indoor PM2.5 penalty from cooking fuel type.
 *
 * @param cookingFuel - Household cooking fuel.
 * @returns Modeled indoor PM2.5 addition in µg/m³.
 */
export function computeCookingPm25Penalty(cookingFuel: UserProfile['cookingFuel']): number {
  return IMPACT_CONSTANTS.cookingPm25PenaltyMap[cookingFuel];
}

/**
 * Computes baseline personal daily PM2.5 exposure (µg/m³ effective) and
 * household winter emission index (0–100 scale) from ambient AQI and profile lookup maps.
 *
 * @param profile - Household setup and commute preferences.
 * @param aqi - Current local AQI and PM2.5 reading.
 * @returns Baseline modeled PM2.5 exposure and normalized emission index.
 */
export function computeBaselineMetrics(
  profile: UserProfile,
  aqi: AqiReading
): { baselineExposureUgM3: number; baselineEmissionIndex: number } {
  const outdoorPm25 = Math.max(IMPACT_CONSTANTS.minOutdoorPm25, aqi.pm25);
  const infiltrationFactor = computeInfiltrationFactor(profile.ventilation);
  const indoorCookingPenalty = computeCookingPm25Penalty(profile.cookingFuel);
  const commuteExposurePenalty =
    outdoorPm25 * IMPACT_CONSTANTS.commuteExposureMultiplierMap[profile.commuteMode];

  const baselineExposureUgM3 = Number(
    (outdoorPm25 * infiltrationFactor + indoorCookingPenalty + commuteExposurePenalty).toFixed(1)
  );

  const emissionScore =
    IMPACT_CONSTANTS.emissionBaseScore +
    IMPACT_CONSTANTS.commuteEmissionScoreMap[profile.commuteMode] +
    IMPACT_CONSTANTS.heatingEmissionScoreMap[profile.heatingSource] +
    IMPACT_CONSTANTS.cookingEmissionScoreMap[profile.cookingFuel];

  return {
    baselineExposureUgM3,
    baselineEmissionIndex: Math.min(
      IMPACT_CONSTANTS.maxEmissionIndex,
      Math.max(IMPACT_CONSTANTS.minEmissionIndex, emissionScore)
    ),
  };
}

/**
 * Combines percentage reductions using diminishing-returns compounding capped at 72%
 * so multi-action totals remain physically realistic.
 *
 * @param percentages - List of per-action percentage reduction estimates.
 * @returns Combined compounded percentage reduction (0–72).
 */
export function combineReductionPercentages(percentages: number[]): number {
  if (percentages.length === 0) {
    return 0;
  }

  let remainingFactor = 1;
  for (const pct of percentages) {
    const bounded = Math.min(IMPACT_CONSTANTS.maxSingleActionPct, Math.max(0, pct)) / 100;
    // Scale individual contribution so multiple small habits compound realistically
    remainingFactor *= 1 - bounded * IMPACT_CONSTANTS.compoundingWeight;
  }

  const combinedPct = Math.round((1 - remainingFactor) * 100);
  return Math.min(IMPACT_CONSTANTS.maxCombinedReductionPct, Math.max(0, combinedPct));
}

/**
 * Calculates Before-vs-After exposure and emission metrics for the full plan
 * and for the user's currently checked checklist items.
 *
 * @param profile - Household setup and lifestyle profile.
 * @param aqi - Current local AQI reading.
 * @param plan - Active recommendation plan, or `null` before generation.
 * @param checkedIds - Array of completed checklist item IDs.
 * @returns Full modeled `ImpactMetrics` summary.
 */
export function calculateImpactMetrics(
  profile: UserProfile,
  aqi: AqiReading,
  plan: RecommendationPlan | null,
  checkedIds: string[]
): ImpactMetrics {
  const { baselineExposureUgM3, baselineEmissionIndex } = computeBaselineMetrics(profile, aqi);

  if (!plan) {
    return {
      baselineExposureUgM3,
      projectedExposureUgM3: baselineExposureUgM3,
      exposureReductionPct: 0,
      baselineEmissionIndex,
      projectedEmissionIndex: baselineEmissionIndex,
      emissionReductionPct: 0,
      completedActionsCount: 0,
      totalActionsCount: 0,
      activeExposureUgM3: baselineExposureUgM3,
      activeEmissionIndex: baselineEmissionIndex,
    };
  }

  const items = flattenPlanItems(plan);
  const checkedSet = new Set(checkedIds);
  const completedItems = items.filter((item) => checkedSet.has(item.id));

  const exposureReductionPct = combineReductionPercentages(items.map((i) => i.pm25ReductionPct));
  const emissionReductionPct = combineReductionPercentages(
    items.map((i) => i.emissionReductionPct)
  );
  const activeExposurePct = combineReductionPercentages(
    completedItems.map((i) => i.pm25ReductionPct)
  );
  const activeEmissionPct = combineReductionPercentages(
    completedItems.map((i) => i.emissionReductionPct)
  );

  return {
    baselineExposureUgM3,
    projectedExposureUgM3: Number(
      (baselineExposureUgM3 * (1 - exposureReductionPct / 100)).toFixed(1)
    ),
    exposureReductionPct,
    baselineEmissionIndex,
    projectedEmissionIndex: Math.round(baselineEmissionIndex * (1 - emissionReductionPct / 100)),
    emissionReductionPct,
    completedActionsCount: completedItems.length,
    totalActionsCount: items.length,
    activeExposureUgM3: Number((baselineExposureUgM3 * (1 - activeExposurePct / 100)).toFixed(1)),
    activeEmissionIndex: Math.round(baselineEmissionIndex * (1 - activeEmissionPct / 100)),
  };
}
