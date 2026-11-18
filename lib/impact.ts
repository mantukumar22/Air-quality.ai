import type {
  AqiReading,
  ImpactMetrics,
  RecommendationItem,
  RecommendationPlan,
  UserProfile,
} from '@/types/airwise';

/**
 * Flattens all actionable recommendation items in a plan into a deduplicated list.
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
 * Computes baseline personal daily PM2.5 exposure (µg/m³ effective) and
 * household winter emission index (0–100 scale) from ambient AQI and profile factors.
 */
export function computeBaselineMetrics(
  profile: UserProfile,
  aqi: AqiReading
): { baselineExposureUgM3: number; baselineEmissionIndex: number } {
  const outdoorPm25 = Math.max(5, aqi.pm25);

  // Indoor infiltration + indoor source multiplier
  let infiltrationFactor = 0.65;
  if (profile.ventilation === 'hepa_purifier' || profile.ventilation === 'hvac_filtered') {
    infiltrationFactor = 0.38;
  } else if (profile.ventilation === 'exhaust_fans') {
    infiltrationFactor = 0.55;
  }

  let indoorCookingPenalty = 4;
  if (profile.cookingFuel === 'biomass_solid') {
    indoorCookingPenalty = 28;
  } else if (profile.cookingFuel === 'lpg_gas') {
    indoorCookingPenalty = 11;
  }

  let commuteExposurePenalty = 0;
  if (profile.commuteMode === 'walking_cycling') {
    commuteExposurePenalty = outdoorPm25 * 0.22;
  } else if (profile.commuteMode === 'public_transit') {
    commuteExposurePenalty = outdoorPm25 * 0.14;
  } else if (profile.commuteMode === 'carpool' || profile.commuteMode === 'private_car') {
    commuteExposurePenalty = outdoorPm25 * 0.1;
  }

  const baselineExposureUgM3 = Number(
    (outdoorPm25 * infiltrationFactor + indoorCookingPenalty + commuteExposurePenalty).toFixed(1)
  );

  // Relative household emission score (0–100 normalized index)
  let emissionScore = 20;
  if (profile.commuteMode === 'private_car') emissionScore += 28;
  else if (profile.commuteMode === 'carpool') emissionScore += 14;
  else if (profile.commuteMode === 'public_transit') emissionScore += 8;

  if (profile.heatingSource === 'wood_coal') emissionScore += 32;
  else if (profile.heatingSource === 'natural_gas') emissionScore += 16;
  else if (profile.heatingSource === 'district') emissionScore += 10;
  else if (profile.heatingSource === 'electric') emissionScore += 6;

  if (profile.cookingFuel === 'biomass_solid') emissionScore += 22;
  else if (profile.cookingFuel === 'lpg_gas') emissionScore += 10;
  else if (profile.cookingFuel === 'electric_coil') emissionScore += 4;

  return {
    baselineExposureUgM3,
    baselineEmissionIndex: Math.min(100, Math.max(10, emissionScore)),
  };
}

/**
 * Combines percentage reductions using diminishing-returns compounding capped at 72%
 * so multi-action totals remain physically realistic.
 */
export function combineReductionPercentages(percentages: number[]): number {
  if (percentages.length === 0) {
    return 0;
  }
  let remainingFactor = 1;
  for (const pct of percentages) {
    const bounded = Math.min(60, Math.max(0, pct)) / 100;
    // Scale individual contribution slightly so multiple small habits compound realistically
    remainingFactor *= 1 - bounded * 0.45;
  }
  const combinedPct = Math.round((1 - remainingFactor) * 100);
  return Math.min(72, Math.max(0, combinedPct));
}

/**
 * Calculates Before vs After exposure and emission metrics for the full plan
 * and for the user's currently checked checklist items.
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

  const projectedExposureUgM3 = Number(
    (baselineExposureUgM3 * (1 - exposureReductionPct / 100)).toFixed(1)
  );
  const projectedEmissionIndex = Math.round(
    baselineEmissionIndex * (1 - emissionReductionPct / 100)
  );

  const activeExposureUgM3 = Number(
    (baselineExposureUgM3 * (1 - activeExposurePct / 100)).toFixed(1)
  );
  const activeEmissionIndex = Math.round(baselineEmissionIndex * (1 - activeEmissionPct / 100));

  return {
    baselineExposureUgM3,
    projectedExposureUgM3,
    exposureReductionPct,
    baselineEmissionIndex,
    projectedEmissionIndex,
    emissionReductionPct,
    completedActionsCount: completedItems.length,
    totalActionsCount: items.length,
    activeExposureUgM3,
    activeEmissionIndex,
  };
}
