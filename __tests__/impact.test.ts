import { getFallbackAqiReading } from '@/lib/aqi';
import { DEFAULT_PROFILE } from '@/lib/constants';
import { buildFallbackPlan } from '@/lib/fallbackPlan';
import {
  calculateImpactMetrics,
  combineReductionPercentages,
  computeBaselineMetrics,
  flattenPlanItems,
} from '@/lib/impact';

describe('Impact calculation engine', () => {
  it('computes higher baseline exposure for solid-fuel cooking than induction', () => {
    const aqi = getFallbackAqiReading('Lahore');
    const biomass = computeBaselineMetrics(
      { ...DEFAULT_PROFILE, cookingFuel: 'biomass_solid' },
      aqi
    );
    const induction = computeBaselineMetrics({ ...DEFAULT_PROFILE, cookingFuel: 'induction' }, aqi);

    expect(biomass.baselineExposureUgM3).toBeGreaterThan(induction.baselineExposureUgM3);
    expect(biomass.baselineEmissionIndex).toBeGreaterThan(induction.baselineEmissionIndex);
  });

  it('caps combined percentage reductions below 72% using diminishing returns', () => {
    expect(combineReductionPercentages([])).toBe(0);
    const highList = [50, 50, 50, 50, 50, 50];
    const combined = combineReductionPercentages(highList);
    expect(combined).toBeGreaterThan(40);
    expect(combined).toBeLessThanOrEqual(72);
  });

  it('tracks active exposure reduction as checklist items are checked', () => {
    const aqi = getFallbackAqiReading('New Delhi');
    const plan = buildFallbackPlan(DEFAULT_PROFILE, aqi);
    const allItems = flattenPlanItems(plan);

    const noneChecked = calculateImpactMetrics(DEFAULT_PROFILE, aqi, plan, []);
    const twoChecked = calculateImpactMetrics(
      DEFAULT_PROFILE,
      aqi,
      plan,
      allItems.slice(0, 2).map((i) => i.id)
    );

    expect(noneChecked.completedActionsCount).toBe(0);
    expect(noneChecked.activeExposureUgM3).toBe(noneChecked.baselineExposureUgM3);

    expect(twoChecked.completedActionsCount).toBe(2);
    expect(twoChecked.activeExposureUgM3).toBeLessThan(twoChecked.baselineExposureUgM3);
    expect(twoChecked.projectedExposureUgM3).toBeLessThanOrEqual(twoChecked.activeExposureUgM3);
  });
});
