import { getFallbackAqiReading } from '@/lib/aqi';
import { DEFAULT_PROFILE } from '@/lib/constants';
import { buildFallbackPlan } from '@/lib/fallbackPlan';
import {
  aqiQuerySchema,
  chatRequestSchema,
  recommendationPlanSchema,
  userProfileSchema,
} from '@/lib/schemas';

describe('Zod request and response schemas', () => {
  it('validates aqiQuerySchema with city or coordinates and rejects empty query', () => {
    expect(aqiQuerySchema.safeParse({ city: 'Delhi' }).success).toBe(true);
    expect(aqiQuerySchema.safeParse({ lat: 28.61, lon: 77.2 }).success).toBe(true);
    expect(aqiQuerySchema.safeParse({}).success).toBe(false);
    expect(aqiQuerySchema.safeParse({ lat: 120, lon: 77 }).success).toBe(false);
  });

  it('validates userProfileSchema and rejects short city names', () => {
    expect(userProfileSchema.safeParse(DEFAULT_PROFILE).success).toBe(true);
    expect(
      userProfileSchema.safeParse({
        ...DEFAULT_PROFILE,
        city: 'A',
      }).success
    ).toBe(false);
  });

  it('validates structured recommendationPlanSchema output', () => {
    const plan = buildFallbackPlan(DEFAULT_PROFILE, getFallbackAqiReading('New Delhi'));
    const parsed = recommendationPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);
  });

  it('validates chatRequestSchema and rejects empty messages', () => {
    const valid = chatRequestSchema.safeParse({
      profile: DEFAULT_PROFILE,
      aqi: {
        locationName: 'New Delhi',
        usAqi: 180,
        pm25: 95,
        pm10: 150,
        no2: 45,
        categoryLabel: 'Unhealthy',
      },
      messages: [{ role: 'user', content: 'When should I open windows?' }],
    });
    expect(valid.success).toBe(true);

    const empty = chatRequestSchema.safeParse({
      profile: DEFAULT_PROFILE,
      aqi: {
        locationName: 'New Delhi',
        usAqi: 180,
        pm25: 95,
        pm10: 150,
        no2: 45,
        categoryLabel: 'Unhealthy',
      },
      messages: [],
    });
    expect(empty.success).toBe(false);
  });
});
