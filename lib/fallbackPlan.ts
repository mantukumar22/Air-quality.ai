import { MEDICAL_DISCLAIMER } from '@/lib/constants';
import type { AqiReading, RecommendationPlan, UserProfile } from '@/types/airwise';

/**
 * Builds a deterministic, winter-smog-focused fallback plan tailored to the
 * user's household profile and current AQI when the live Gemini API is unavailable.
 */
export function buildFallbackPlan(profile: UserProfile, aqi: AqiReading): RecommendationPlan {
  const hasKids = profile.householdGroups.includes('kids');
  const hasElderly = profile.householdGroups.includes('elderly');
  const hasRespiratory = profile.householdGroups.includes('respiratory');
  const hasPets = profile.householdGroups.includes('pets');

  const highSmog = aqi.usAqi > 150;
  const cityLabel = aqi.locationName || profile.city;

  const vulnerablePrecautions = [
    ...(hasKids
      ? [
          {
            id: 'vuln-kids-school-route',
            category: 'vulnerable_care' as const,
            title: 'Switch morning school commute to indoor play & fitted masks',
            actionSummary:
              'Keep outdoor recess indoors when AQI exceeds 150 and fit children with pediatric KN95 masks on transit.',
            whyItWorks:
              'Children breathe faster per kilogram of body weight, inhaling more fine PM2.5 during morning inversions.',
            pm25ReductionPct: 32,
            emissionReductionPct: 5,
            costTier: 'low' as const,
            timeframe: 'Morning commute',
            isEstimate: true as const,
          },
        ]
      : []),
    ...(hasRespiratory
      ? [
          {
            id: 'vuln-asthma-clean-room',
            category: 'vulnerable_care' as const,
            title: 'Designate one sealed clean-air bedroom',
            actionSummary:
              'Run a HEPA or DIY box-fan filter in one primary sleeping room with door-sweep weatherstripping.',
            whyItWorks:
              '8 hours of clean overnight breathing significantly lowers airway inflammation and rescue-inhaler triggers.',
            pm25ReductionPct: 45,
            emissionReductionPct: 0,
            costTier: profile.budget,
            timeframe: 'Overnight',
            isEstimate: true as const,
          },
        ]
      : []),
    ...(hasElderly
      ? [
          {
            id: 'vuln-elderly-midday-shift',
            category: 'vulnerable_care' as const,
            title: 'Move walks and errands to 1:00–3:30 PM',
            actionSummary:
              'Avoid early morning and post-sunset walks when cold air traps vehicle and heating smoke near ground level.',
            whyItWorks:
              'Solar warming lifts the winter inversion boundary mid-afternoon, dispersing surface particulates.',
            pm25ReductionPct: 26,
            emissionReductionPct: 0,
            costTier: 'low' as const,
            timeframe: '1:00–3:30 PM',
            isEstimate: true as const,
          },
        ]
      : []),
    ...(hasPets
      ? [
          {
            id: 'vuln-pets-paw-wipe',
            category: 'vulnerable_care' as const,
            title: 'Shorten dog walks and wipe fur after outdoor breaks',
            actionSummary:
              'Keep outdoor bathroom breaks brief during smog spikes and wipe paws and coat with a damp cloth on return.',
            whyItWorks:
              'Removes settled soot and heavy-metal dust before pets groom themselves or track particulates onto rugs.',
            pm25ReductionPct: 14,
            emissionReductionPct: 0,
            costTier: 'low' as const,
            timeframe: 'After walks',
            isEstimate: true as const,
          },
        ]
      : []),
  ];

  if (vulnerablePrecautions.length === 0) {
    vulnerablePrecautions.push({
      id: 'vuln-general-n95',
      category: 'vulnerable_care',
      title: 'Keep fitted N95/KN95 masks by the front door',
      actionSummary:
        'Wear a well-sealed respirator whenever outdoor AQI climbs above 150, especially near busy intersections.',
      whyItWorks:
        'A snug N95 filters over 95% of airborne PM2.5 particles compared to negligible protection from cloth masks.',
      pm25ReductionPct: 38,
      emissionReductionPct: 0,
      costTier: 'low',
      timeframe: 'Outdoor trips',
      isEstimate: true,
    });
  }

  return {
    headline: `Winter Smog Action Plan for ${cityLabel} (${aqi.category.label} · ${aqi.usAqi} AQI)`,
    winterSmogContext:
      'Winter temperature inversions trap vehicle exhaust, residential heating smoke, and regional stubble or open-burning haze near ground level during calm mornings and evenings.',
    dailyRoutine: {
      morning: [
        {
          id: 'morning-seal-drafts',
          category: 'routine_morning',
          title: 'Keep windows closed during morning inversion peak',
          actionSummary: highSmog
            ? 'Delay airing out rooms until afternoon; tuck damp towels or foam tape along loose window gaps.'
            : 'Keep street-facing windows shut during rush hour and use interior air circulation.',
          whyItWorks:
            'Cold morning air holds concentrated rush-hour NO2 and PM2.5 right at window height.',
          pm25ReductionPct: 28,
          emissionReductionPct: 4,
          costTier: 'low',
          timeframe: '6:00–10:30 AM',
          isEstimate: true,
        },
      ],
      afternoon: [
        {
          id: 'afternoon-vent-window',
          category: 'routine_afternoon',
          title: 'Brief 15-minute cross-ventilation during dispersion peak',
          actionSummary:
            'If outdoor AQI drops below indoor levels between 1:00 and 3:30 PM, open opposite windows briefly to flush CO2.',
          whyItWorks:
            'Mid-afternoon sun creates vertical air mixing, reducing stagnant street-level smog concentrations.',
          pm25ReductionPct: 16,
          emissionReductionPct: 5,
          costTier: 'low',
          timeframe: '1:00–3:30 PM',
          isEstimate: true,
        },
      ],
      evening: [
        {
          id: 'evening-wet-mop',
          category: 'routine_evening',
          title: 'Damp-mop floors instead of dry sweeping',
          actionSummary:
            'Use a damp microfiber mop on entryways and living areas before evening wind drops.',
          whyItWorks:
            'Dry brooms re-suspend settled PM10 and PM2.5 back into breathing height; damp mopping captures particles.',
          pm25ReductionPct: 20,
          emissionReductionPct: 0,
          costTier: 'low',
          timeframe: '6:00–9:00 PM',
          isEstimate: true,
        },
      ],
    },
    indoorHacks: [
      {
        id: 'indoor-diy-filter',
        category: 'indoor_hack',
        title:
          profile.budget === 'low'
            ? 'Build a low-cost box-fan MERV-13 filter'
            : 'Run HEPA filtration on medium-high continuous speed',
        actionSummary:
          profile.budget === 'low'
            ? 'Tape a MERV-13 furnace filter securely to the intake side of a standard 20-inch box fan in your main living room.'
            : 'Place your HEPA purifier centrally away from walls and keep it running continuously rather than intermittently.',
        whyItWorks:
          'High-efficiency pleated media traps 85–99% of fine PM2.5 particles per pass with minimal electricity use.',
        pm25ReductionPct: 42,
        emissionReductionPct: 2,
        costTier: profile.budget,
        timeframe: 'Continuous',
        isEstimate: true,
      },
      {
        id: 'indoor-cooking-lids',
        category: 'indoor_hack',
        title: 'Cook with lids on, lower oil heat, and exhaust running',
        actionSummary:
          'Cover pots, avoid charring oils, and run your kitchen exhaust fan (or crack a nearby window briefly) while cooking.',
        whyItWorks:
          'Frying and gas combustion generate sharp indoor PM2.5 and NO2 spikes that can exceed outdoor smog levels.',
        pm25ReductionPct: 30,
        emissionReductionPct: 12,
        costTier: 'low',
        timeframe: 'Every meal',
        isEstimate: true,
      },
      {
        id: 'indoor-humidity-balance',
        category: 'indoor_hack',
        title: 'Maintain indoor humidity between 40% and 50%',
        actionSummary:
          'Place a shallow bowl of water near safe radiators or avoid over-drying heaters; avoid scented ultrasonic mist.',
        whyItWorks:
          'Balanced humidity keeps airway mucus protective without encouraging mold, and avoids mineral dust from tap-water mist.',
        pm25ReductionPct: 12,
        emissionReductionPct: 0,
        costTier: 'low',
        timeframe: 'All day',
        isEstimate: true,
      },
    ],
    sustainableAlternatives: [
      {
        id: 'alt-commute-shift',
        category: 'sustainable_alt',
        title:
          profile.commuteMode === 'private_car'
            ? 'Combine errands into 1 trip or carpool twice a week'
            : 'Prefer electric/rail transit and off-peak travel windows',
        actionSummary:
          profile.commuteMode === 'private_car'
            ? 'Cold-start winter drives emit peak tailpipe particulates; batch trips and use recirculate-air mode in traffic.'
            : 'Choose bus/metro routes off main arterial bottlenecks or shift flexible commutes outside 8–10 AM.',
        whyItWorks:
          'Cold engines burn richer fuel mixtures; reducing cold starts and idling cuts local NO2 and ultrafine soot.',
        pm25ReductionPct: 18,
        emissionReductionPct: 26,
        costTier: 'low',
        timeframe: 'Workdays',
        isEstimate: true,
      },
      {
        id: 'alt-heating-cooking',
        category: 'sustainable_alt',
        title:
          profile.cookingFuel === 'biomass_solid' || profile.heatingSource === 'wood_coal'
            ? 'Transition meals to electric kettle/induction & draft-seal warmth'
            : 'Layer thermal textiles to lower furnace/heater runtime by 2°C',
        actionSummary:
          profile.cookingFuel === 'biomass_solid' || profile.heatingSource === 'wood_coal'
            ? 'Use electric rice cookers or induction hotplates where available and seal door drafts to retain warmth without smoke.'
            : 'Use door snakes, thick curtains at dusk, and warm layers so heating runs cleaner and less frequently.',
        whyItWorks:
          'Reducing solid-fuel or gas combustion directly eliminates primary indoor PM2.5 and neighborhood winter smoke.',
        pm25ReductionPct: 24,
        emissionReductionPct: 28,
        costTier: profile.budget,
        timeframe: 'Daily heating & meals',
        isEstimate: true,
      },
    ],
    vulnerablePrecautions,
    communityActions: [
      {
        id: 'comm-no-open-burning',
        category: 'community_action',
        title: 'Organize a zero-open-burning block pledge',
        actionSummary:
          'Encourage neighbors and building staff to compost dry leaves instead of burning yard waste or trash on cold evenings.',
        whyItWorks:
          'Smoldering leaf and waste piles release concentrated PM2.5 and dioxins directly into ground-level winter inversions.',
        pm25ReductionPct: 22,
        emissionReductionPct: 30,
        costTier: 'low',
        timeframe: 'Neighborhood-wide',
        isEstimate: true,
      },
      {
        id: 'comm-school-carpool',
        category: 'community_action',
        title: 'Coordinate a 3-family school carpool or walking-bus rotation',
        actionSummary:
          'Share rides with nearby families on high-smog days and ask drivers to turn off engines while waiting at school gates.',
        whyItWorks:
          'Eliminating idling cars outside schools sharply reduces localized NO2 and PM2.5 exposure for children.',
        pm25ReductionPct: 15,
        emissionReductionPct: 24,
        costTier: 'low',
        timeframe: 'School days',
        isEstimate: true,
      },
    ],
    neighborShareSummary: `AirWise Alert for ${cityLabel}: Current air quality is ${aqi.category.label} (${aqi.usAqi} AQI, PM2.5 ${aqi.pm25} µg/m³). Today's winter-smog tips: keep windows closed during morning/evening inversions, run indoor filtration or damp-mop dust, avoid burning leaves/trash, and check on elderly or asthmatic neighbors.`,
    disclaimer: MEDICAL_DISCLAIMER,
    generatedAt: new Date().toISOString(),
    isFallback: true,
  };
}
