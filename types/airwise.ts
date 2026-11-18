/**
 * Domain types for AirWise: Urban Air Quality Assistant.
 */

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
  isFallback?: boolean;
  source: string;
}

export type HouseholdGroup = 'kids' | 'elderly' | 'respiratory' | 'pets';

export type CommuteMode =
  'walking_cycling' | 'public_transit' | 'carpool' | 'private_car' | 'remote';

export type HomeType = 'apartment' | 'detached_house' | 'townhouse' | 'shared_home';

export type VentilationType =
  'natural_windows' | 'exhaust_fans' | 'hepa_purifier' | 'hvac_filtered';

export type HeatingSource = 'electric' | 'natural_gas' | 'wood_coal' | 'district' | 'none';

export type CookingFuel = 'induction' | 'electric_coil' | 'lpg_gas' | 'biomass_solid';

export type BudgetLevel = 'low' | 'medium' | 'high';

export interface UserProfile {
  city: string;
  latitude?: number;
  longitude?: number;
  householdGroups: HouseholdGroup[];
  commuteMode: CommuteMode;
  homeType: HomeType;
  ventilation: VentilationType;
  heatingSource: HeatingSource;
  cookingFuel: CookingFuel;
  budget: BudgetLevel;
}

export type RecommendationCategory =
  | 'routine_morning'
  | 'routine_afternoon'
  | 'routine_evening'
  | 'indoor_hack'
  | 'sustainable_alt'
  | 'vulnerable_care'
  | 'community_action';

export interface RecommendationItem {
  id: string;
  category: RecommendationCategory;
  title: string;
  actionSummary: string;
  whyItWorks: string;
  pm25ReductionPct: number;
  emissionReductionPct: number;
  costTier: BudgetLevel;
  timeframe: string;
  isEstimate: boolean;
}

export interface RecommendationPlan {
  headline: string;
  winterSmogContext: string;
  dailyRoutine: {
    morning: RecommendationItem[];
    afternoon: RecommendationItem[];
    evening: RecommendationItem[];
  };
  indoorHacks: RecommendationItem[];
  sustainableAlternatives: RecommendationItem[];
  vulnerablePrecautions: RecommendationItem[];
  communityActions: RecommendationItem[];
  neighborShareSummary: string;
  disclaimer: string;
  generatedAt: string;
  isFallback?: boolean;
}

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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
