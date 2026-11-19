import type { FaqEntry } from '@/types/airwise';

const NOT_MEDICAL_ADVICE_NOTE =
  'This is environmental guidance, not medical advice—consult a clinician for respiratory symptoms.';

/**
 * Curated winter-smog and indoor air quality knowledge base providing instant,
 * zero-latency responses without invoking the Gemini API.
 */
export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'faq-ventilate-timing',
    question: 'Best time to ventilate my home during smog?',
    keywords: [
      'ventilate',
      'ventilation',
      'open',
      'windows',
      'air out',
      'best time',
      'fresh air',
      'inversion',
      'afternoon',
    ],
    answer:
      'Keep street-facing windows closed between 6:00–10:30 AM and after sunset when cold inversions trap exhaust near the ground. Open opposite windows for 10–15 minutes between 1:00 PM and 3:30 PM when sunlight disperses surface smog, or run filtration instead if outdoor AQI stays above 150. Estimate: lowers peak morning indoor PM2.5 spikes by 20–30%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 20–30% lower morning PM2.5 infiltration',
    category: 'indoor',
  },
  {
    id: 'faq-diy-purifier',
    question: 'How do I make a DIY air purifier (box fan + HEPA filter)?',
    keywords: [
      'diy',
      'air purifier',
      'box fan',
      'merv',
      'merv-13',
      'hepa',
      'filter',
      'corsi',
      'rosenthal',
      'homemade',
    ],
    answer:
      'Tape a pleated MERV-13 (or HEPA-grade) furnace filter snugly onto the intake back of a 20-inch box fan with the airflow arrows pointing toward the fan, sealing all cardboard gaps with painter or duct tape. Place it centrally in your main bedroom on medium speed. Estimate: cuts room PM2.5 by 35–50% at a fraction of commercial purifier cost. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 35–50% indoor PM2.5 reduction in a closed room',
    category: 'indoor',
  },
  {
    id: 'faq-mask-choice',
    question: 'Which mask should I wear (N95/FFP2 vs cloth)?',
    keywords: ['mask', 'masks', 'n95', 'kn95', 'ffp2', 'cloth', 'surgical', 'respirator', 'wear'],
    answer:
      'Choose a snug-fitting N95, KN95, or FFP2 respirator with a nose clip rather than cloth or loose surgical masks, which leak fine smog particles around the cheeks. Check that it seals flat when you exhale and replace it once breathing feels harder or straps loosen. Estimate: reduces inhaled PM2.5 by 85–95% outdoors when fitted well. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 85–95% reduction in inhaled PM2.5 outdoors',
    category: 'health',
  },
  {
    id: 'faq-kids-play',
    question: 'Is it safe for kids to play outside today?',
    keywords: [
      'kids',
      'children',
      'child',
      'play',
      'outside',
      'outdoor',
      'school',
      'recess',
      'playground',
    ],
    answer:
      'When AQI is above 100, shorten vigorous outdoor running and shift play to 1:00–3:30 PM; when AQI exceeds 150, move play indoors inside a filtered room because children breathe faster per kilogram of body weight. For unavoidable morning school walks, use pediatric-sized KN95 masks. Estimate: cuts daily child PM2.5 dose by 30–40%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 30–40% lower child PM2.5 exposure on smog days',
    category: 'health',
  },
  {
    id: 'faq-elderly-asthma',
    question: 'How do I protect elderly family members and asthma patients?',
    keywords: [
      'elderly',
      'older',
      'senior',
      'seniors',
      'asthma',
      'respiratory',
      'copd',
      'inhaler',
      'lungs',
      'protect',
    ],
    answer:
      'Create one sealed clean-air bedroom with continuous HEPA or DIY box-fan filtration and weatherstripped door gaps so vulnerable lungs get 8+ cleaner hours overnight. Keep rescue inhalers accessible, reschedule errands to mid-afternoon, and avoid indoor smoke like incense or frying fumes. Estimate: reduces overnight particulate exposure by 40–55%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 40–55% lower overnight exposure in clean-air room',
    category: 'health',
  },
  {
    id: 'faq-outdoor-exercise',
    question: 'Should I exercise outdoors on high-AQI days?',
    keywords: [
      'exercise',
      'run',
      'running',
      'jog',
      'jogging',
      'workout',
      'cycling',
      'walk',
      'sports',
      'high aqi',
    ],
    answer:
      'Skip vigorous outdoor runs and cycling whenever AQI climbs above 150, because deep mouth-breathing pulls PM2.5 deeper into lung tissue. Switch to indoor stretching or strength circuits away from street windows, or take a gentle midday walk with an N95 when AQI is 101–150. Estimate: avoids 4x–6x peak respiratory particle intake. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: avoids 60–80% of exertion-driven smog dose',
    category: 'health',
  },
  {
    id: 'faq-indoor-plants',
    question: 'Which indoor plants actually help with air quality?',
    keywords: [
      'plant',
      'plants',
      'snake plant',
      'peace lily',
      'pothos',
      'areca',
      'houseplant',
      'indoor plants',
    ],
    answer:
      'To be honest, potted plants have a very limited effect on winter smog: they do not meaningfully remove fine PM2.5 particles at home scale, though broad leaves like rubber plants or peace lilies collect some coarse dust when wiped damp weekly. Pair plants with real mechanical filtration (HEPA or MERV-13) and avoid overwatering soil that breeds mold. Estimate: <2% PM2.5 impact from plants alone vs 35–50% from HEPA. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: <2% PM2.5 removal (use HEPA/MERV-13 for 35–50%)',
    category: 'indoor',
  },
  {
    id: 'faq-cooking-pollution',
    question: 'How can I cook with less indoor pollution?',
    keywords: [
      'cook',
      'cooking',
      'kitchen',
      'gas',
      'lpg',
      'stove',
      'frying',
      'smoke',
      'exhaust',
      'hood',
    ],
    answer:
      'Cook with pot lids on, keep oil below smoking point (prefer steaming, pressure-cooking, or boiling over deep-frying), and run your kitchen exhaust fan—or crack a kitchen window briefly during cooking—even on smoggy days. Shifting quick boils to an electric kettle or induction plate eliminates indoor NO2 spikes. Estimate: lowers kitchen PM2.5 and NO2 peaks by 30–50%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 30–50% lower mealtime PM2.5 & NO2 spikes',
    category: 'cooking',
  },
  {
    id: 'faq-cleaner-heating',
    question: 'Cleaner heating alternatives to burning wood, coal, or waste?',
    keywords: [
      'heating',
      'heat',
      'wood',
      'coal',
      'fire',
      'bonfire',
      'heater',
      'warm',
      'charcoal',
      'biomass',
    ],
    answer:
      'Replace open wood, coal, or trash fires—which pour toxic soot straight into cold ground inversions—with oil-filled electric radiators, heat pumps, or thermal layering (thick curtains at dusk, door draft stoppers, and wool blankets). Keeping rooms 1–2°C cooler while wearing warm layers trims fuel smoke dramatically. Estimate: cuts household heating PM2.5 emissions by 45–80%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 45–80% reduction in home heating particulates',
    category: 'heating',
  },
  {
    id: 'faq-why-winter-smog',
    question: 'Why is smog worse in winter?',
    keywords: [
      'why',
      'winter',
      'smog',
      'worse',
      'inversion',
      'temperature',
      'fog',
      'stubble',
      'wind',
      'season',
    ],
    answer:
      'In winter, cold air settles near the ground beneath a warmer upper air lid—a temperature inversion—so calm winds cannot disperse tailpipe exhaust, home heating smoke, and regional stubble or waste burning. Cool damp air also lets fine particles linger longer near street level until midday warmth lifts the lid. Estimate: midday sun improves natural mixing by 20–35%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 20–35% better pollutant dispersion around 1–3 PM',
    category: 'community',
  },
  {
    id: 'faq-neighbor-actions',
    question: 'How can neighbors reduce emissions together?',
    keywords: [
      'neighbor',
      'neighbors',
      'community',
      'block',
      'carpool',
      'burning',
      'leaves',
      'trash',
      'together',
      'building',
    ],
    answer:
      'Start a building or block pledge against burning dry leaves, garden clippings, or winter trash—composting or mulching instead—and organize a 3-family school carpool with strict no-idling at gates. Sharing bulk MERV-13 filter packs also lowers household costs. Estimate: neighborhood zero-burning + anti-idling cuts local block emissions by 20–30%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 20–30% lower localized neighborhood smoke & NO2',
    category: 'community',
  },
  {
    id: 'faq-aqi-pm-meaning',
    question: 'What do AQI, PM2.5, and PM10 mean?',
    keywords: [
      'aqi',
      'pm2.5',
      'pm25',
      'pm10',
      'no2',
      'mean',
      'meaning',
      'difference',
      'what is',
      'particles',
    ],
    answer:
      'US AQI is a 0–500 health scale where 0–50 is Good, 101–150 affects sensitive groups, and 151+ is Unhealthy for everyone. PM2.5 are ultra-fine particles (30x thinner than a hair) from combustion that enter deep lungs and bloodstream; PM10 is coarser road and construction dust; NO2 is traffic and gas-stove exhaust. Estimate: targeting PM2.5 yields the largest health protection. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: tracking PM2.5 guides 80%+ of indoor protection decisions',
    category: 'health',
  },
  {
    id: 'faq-see-doctor',
    question: 'When should I see a doctor?',
    keywords: [
      'doctor',
      'hospital',
      'emergency',
      'clinic',
      'medical',
      'wheezing',
      'chest',
      'cough',
      'shortness',
      'breath',
    ],
    answer:
      'Seek prompt medical care if anyone develops persistent wheezing, shortness of breath at rest, chest tightness, bluish lips, dizziness, or needs their asthma rescue inhaler much more often than prescribed. Move immediately to filtered indoor air while arranging clinical evaluation. Estimate: early clean-air shelter lowers acute irritant load immediately. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: immediate shelter reduces acute airway particle load',
    category: 'health',
  },
  {
    id: 'faq-low-budget',
    question: 'Low-cost ways to reduce exposure on a tight budget?',
    keywords: [
      'budget',
      'cheap',
      'cheapest',
      'free',
      'low cost',
      'tight budget',
      'save money',
      'affordable',
      'diy',
    ],
    answer:
      'Focus on zero-cost habits first: keep windows shut 6–10 AM, damp-mop floors instead of dry sweeping, roll damp towels along leaky door bottoms, cover pots while cooking, and time errands for 1:00–3:30 PM. Add one reusable N95 mask per person and a DIY box-fan MERV-13 filter when possible. Estimate: lowers personal exposure by 25–40% for near-zero cost. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 25–40% exposure drop with zero-cost & DIY habits',
    category: 'indoor',
  },
  {
    id: 'faq-wet-mopping',
    question: 'Should I sweep or damp-mop floors during smog?',
    keywords: [
      'mop',
      'mopping',
      'sweep',
      'sweeping',
      'broom',
      'vacuum',
      'dust',
      'floor',
      'cleaning',
    ],
    answer:
      'Always damp-mop hard floors and wipe windowsills with a wet microfiber cloth instead of dry-brooming or feather-dusting, which kicks settled PM10 and soot right back up to breathing height. If using a vacuum, ensure it has a sealed HEPA bag and run it mid-afternoon. Estimate: cuts indoor dust re-suspension by 15–25%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 15–25% less airborne indoor particulate dust',
    category: 'indoor',
  },
  {
    id: 'faq-commute-traffic',
    question: 'How do I reduce smog exposure during my daily commute?',
    keywords: [
      'commute',
      'travel',
      'car',
      'bus',
      'metro',
      'walk',
      'traffic',
      'road',
      'recirculate',
    ],
    answer:
      'Walk or cycle on side streets one block away from main arterial traffic—PM2.5 drops steeply just 50–100 meters off busy roads—and wear a fitted N95 during peak hours. In cars or buses, keep windows closed and switch cabin climate control to recirculate mode when stuck behind diesel vehicles. Estimate: cuts commute PM2.5 inhalation by 25–55%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 25–55% lower in-transit particulate intake',
    category: 'commute',
  },
  {
    id: 'faq-seal-drafts',
    question: 'How do I seal leaky doors and windows against smog?',
    keywords: ['seal', 'draft', 'drafts', 'gap', 'gaps', 'door', 'window', 'tape', 'weatherstrip'],
    answer:
      'Press self-adhesive foam weatherstripping along loose window sashes and place a rolled damp towel or fabric draft snake at the bottom gap of exterior doors and your clean-air bedroom. Closing heavy curtains after dusk adds a second air buffer against cold street drafts. Estimate: lowers outdoor smog seepage by 15–25%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 15–25% reduction in indoor smog infiltration',
    category: 'indoor',
  },
  {
    id: 'faq-gas-vs-electric',
    question: 'Does cooking with gas vs induction affect indoor air?',
    keywords: ['gas stove', 'induction', 'electric', 'lpg', 'burner', 'no2', 'nitrogen'],
    answer:
      'Yes—piped natural gas and LPG burners emit nitrogen dioxide (NO2) and ultrafine particulates straight into the kitchen, especially without vented range hoods. If switching to full induction is out of budget, plug-in single induction hotplates or electric kettles for tea and boiling water cut gas burn time significantly. Estimate: lowers kitchen NO2 by 35–65%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 35–65% lower indoor NO2 from electric/induction swaps',
    category: 'cooking',
  },
  {
    id: 'faq-candles-humidifier',
    question: 'Are candles, incense, or mist humidifiers okay during smog?',
    keywords: [
      'candle',
      'candles',
      'incense',
      'agarbatti',
      'humidifier',
      'diffuser',
      'smoke',
      'humidity',
    ],
    answer:
      'Skip candles, incense, mosquito coils, and scented diffusers whenever AQI is elevated, as indoor combustion adds concentrated PM2.5 indoors where it cannot escape. Keep indoor humidity around 40–50% using a bowl of water near safe heat or an evaporative humidifier with distilled water rather than tap-water ultrasonic mist. Estimate: prevents 20–40% extra indoor PM2.5 spikes. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: avoids 20–40% self-generated indoor PM2.5 spikes',
    category: 'indoor',
  },
  {
    id: 'faq-pets-care',
    question: 'How do I protect indoor pets on severe smog days?',
    keywords: ['pet', 'pets', 'dog', 'dogs', 'cat', 'cats', 'walk', 'paws', 'fur', 'animal'],
    answer:
      'Keep dog bathroom breaks short during morning/evening smog peaks, avoid vigorous fetch outdoors when AQI exceeds 150, and wipe paws and fur with a damp cloth on return so pets do not lick settled soot off their coat. Keep water bowls away from open doors and inside a filtered room. Estimate: reduces pet soot ingestion and dust tracking by 15–25%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 15–25% less tracked dust & coat particulate load',
    category: 'health',
  },
  {
    id: 'faq-warm-without-smoke',
    question: 'How can I stay warm in winter without adding smoke?',
    keywords: [
      'warm',
      'cold',
      'stay warm',
      'blanket',
      'insulation',
      'radiator',
      'winter warmth',
      'space heater',
    ],
    answer:
      'Zone-heat only the room you occupy, hang thick thermal curtains at sunset, lay rugs over bare tile floors, and use hot-water bottles or electric throws rather than unvented kerosene, charcoal, or wood braziers. Never bring outdoor charcoal grills indoors—they pose lethal carbon monoxide and PM2.5 hazards. Estimate: eliminates 90%+ of indoor combustion smoke. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 90%+ elimination of indoor heating smoke',
    category: 'heating',
  },
  {
    id: 'faq-school-anti-idling',
    question: 'How can schools and apartments cut morning smog peaks?',
    keywords: ['school', 'schools', 'apartment', 'idling', 'idle', 'engine', 'gate', 'pickup'],
    answer:
      'Work with school staff and resident associations to post "Engines Off" signs at pickup gates and move drop-off queues away from classroom windows, because cold-start idling emits dense PM2.5 and NO2 right at child height. Designate one filtered indoor library or hall for high-AQI recess days. Estimate: reduces gate-zone NO2 spikes by 20–35%. ' +
      NOT_MEDICAL_ADVICE_NOTE,
    impact: 'Estimate: 20–35% lower pickup-zone exhaust & NO2 peaks',
    category: 'community',
  },
];
