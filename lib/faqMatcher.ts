import { CHAT_CACHE_CONFIG } from '@/lib/constants';
import { FAQ_ENTRIES } from '@/lib/faq';
import { sanitizeText } from '@/lib/sanitize';
import type { AqiContextInput } from '@/lib/gemini';
import type { FaqEntry, UserProfile } from '@/types/airwise';

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'can',
  'could',
  'do',
  'does',
  'for',
  'from',
  'have',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'please',
  'should',
  'so',
  'tell',
  'that',
  'the',
  'their',
  'them',
  'there',
  'these',
  'they',
  'this',
  'to',
  'today',
  'us',
  'vs',
  'was',
  'we',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'will',
  'with',
  'would',
  'you',
  'your',
]);

export interface FaqMatchResult {
  entry: FaqEntry;
  score: number;
}

/**
 * Normalizes a user question by lowercasing, stripping punctuation,
 * collapsing whitespace, and removing stopwords.
 */
export function normalizeQuestion(input: string): string {
  const cleaned = sanitizeText(input, 600)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9.\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .filter((token) => token.length > 0 && !STOPWORDS.has(token))
    .join(' ');
}

/**
 * Splits a question into normalized content tokens (minimum length 2).
 */
export function tokenizeQuestion(input: string): string[] {
  const normalized = normalizeQuestion(input);
  if (!normalized) return [];
  return Array.from(new Set(normalized.split(' ').filter((t) => t.length >= 2)));
}

function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigramsA = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i += 1) {
    const pair = a.slice(i, i + 2);
    bigramsA.set(pair, (bigramsA.get(pair) ?? 0) + 1);
  }

  let overlap = 0;
  for (let i = 0; i < b.length - 1; i += 1) {
    const pair = b.slice(i, i + 2);
    const count = bigramsA.get(pair) ?? 0;
    if (count > 0) {
      overlap += 1;
      bigramsA.set(pair, count - 1);
    }
  }

  return (2 * overlap) / (a.length + b.length - 2);
}

function scoreEntry(rawNormalizedFull: string, tokens: string[], entry: FaqEntry): number {
  if (tokens.length === 0) return 0;

  const entryQuestionNorm = normalizeQuestion(entry.question);
  if (rawNormalizedFull && entryQuestionNorm === rawNormalizedFull) {
    return 1;
  }

  const entryKeywordTokens = new Set<string>();
  let phraseBonus = 0;

  for (const kw of entry.keywords) {
    const kwNorm = kw.toLowerCase().trim();
    if (rawNormalizedFull.includes(kwNorm) && kwNorm.length >= 4) {
      phraseBonus += kwNorm.includes(' ') ? 0.35 : 0.16;
    }
    for (const part of tokenizeQuestion(kwNorm)) {
      entryKeywordTokens.add(part);
    }
  }

  const questionTokens = new Set(tokenizeQuestion(entry.question));

  let matchedWeight = 0;
  for (const token of tokens) {
    if (entryKeywordTokens.has(token) && questionTokens.has(token)) {
      matchedWeight += 1.25;
    } else if (entryKeywordTokens.has(token)) {
      matchedWeight += 1.0;
    } else if (questionTokens.has(token)) {
      matchedWeight += 0.9;
    } else {
      // Soft fuzzy check for plurals / slight typos (e.g. purifiers vs purifier)
      for (const kwToken of entryKeywordTokens) {
        if (
          (token.length >= 4 && kwToken.startsWith(token.slice(0, 4))) ||
          diceSimilarity(token, kwToken) >= 0.82
        ) {
          matchedWeight += 0.65;
          break;
        }
      }
    }
  }

  const tokenCoverage = matchedWeight / Math.max(tokens.length, 2);
  const questionDice = diceSimilarity(rawNormalizedFull, entryQuestionNorm);

  return Math.min(1, tokenCoverage * 0.68 + Math.min(0.45, phraseBonus) + questionDice * 0.25);
}

/**
 * Matches a typed user question against pre-stored FAQ_ENTRIES using keyword overlap
 * and token similarity. Returns the best match only when score meets threshold.
 */
export function matchFaqQuestion(query: string, threshold = 0.48): FaqMatchResult | null {
  const normalizedFull = normalizeQuestion(query);
  const tokens = tokenizeQuestion(query);
  if (tokens.length === 0) return null;

  let best: FaqMatchResult | null = null;
  for (const entry of FAQ_ENTRIES) {
    const score = scoreEntry(normalizedFull, tokens, entry);
    if (!best || score > best.score) {
      best = { entry, score };
    }
  }

  if (!best || best.score < threshold) {
    return null;
  }

  return best;
}

/**
 * Appends one personalized context line tailored to the user's live AQI and household profile.
 */
export function personalizeFaqAnswer(
  entry: FaqEntry,
  profile: UserProfile,
  aqi: Pick<AqiContextInput, 'locationName' | 'usAqi' | 'pm25' | 'categoryLabel'>
): string {
  const safeLocation = sanitizeText(aqi.locationName || profile.city || 'your area', 80);
  const safeCategory = sanitizeText(aqi.categoryLabel || 'Elevated', 60);

  const notes: string[] = [];
  if (aqi.usAqi > 150) {
    notes.push('keep windows sealed until mid-afternoon and wear a fitted N95 outdoors');
  } else if (aqi.usAqi > 100) {
    notes.push('limit prolonged outdoor exertion during morning and evening rush hours');
  } else {
    notes.push('take advantage of cleaner daylight hours to briefly cross-ventilate');
  }

  if (profile.householdGroups.includes('respiratory')) {
    notes.push('keep asthma medications handy and run continuous bedroom filtration');
  } else if (profile.householdGroups.includes('kids')) {
    notes.push('keep children indoors during early morning inversion hours');
  } else if (profile.householdGroups.includes('elderly')) {
    notes.push('schedule walks for older adults only around 1:00–3:30 PM');
  } else if (profile.householdGroups.includes('pets')) {
    notes.push('keep pet walks brief and wipe paws/fur afterward');
  }

  if (profile.budget === 'low') {
    notes.push('prioritize zero-cost timing and DIY sealing');
  }

  const contextLine = `For ${safeLocation} today (${aqi.usAqi} AQI · ${safeCategory}, PM2.5 ${aqi.pm25} µg/m³): ${notes.join('; ')}.`;
  return `${sanitizeText(entry.answer, 1200, true)}\n\n${contextLine}`;
}

/**
 * Builds a deterministic offline fallback guide answer when Gemini is unreachable
 * or circuit-broken and no FAQ entry directly matched.
 */
export function buildOfflineFallbackAnswer(
  query: string,
  profile: UserProfile,
  aqi: Pick<AqiContextInput, 'locationName' | 'usAqi' | 'pm25' | 'categoryLabel'>
): string {
  const safeLocation = sanitizeText(aqi.locationName || profile.city || 'your area', 80);
  const safeCategory = sanitizeText(aqi.categoryLabel || 'Elevated', 60);
  const safeQuery = sanitizeText(query, 120);

  const sensitiveLine =
    profile.householdGroups.length > 0
      ? `Because your household includes ${profile.householdGroups.join(', ')}, prioritize one sealed clean-air room overnight.`
      : 'Keep bedroom doors and street-facing window drafts sealed overnight.';

  const budgetFilterTip =
    profile.budget === 'low'
      ? 'Use a low-cost DIY 20-inch box fan + MERV-13 filter or damp-mop floors instead of dry sweeping (estimate: 25–40% lower indoor PM2.5).'
      : 'Run your HEPA purifier continuously on medium-high and keep kitchen exhaust fans running while cooking (estimate: 35–50% lower indoor PM2.5).';

  const outdoorTip =
    aqi.usAqi > 150
      ? 'Stay indoors during 6:00–10:30 AM and post-sunset peaks; wear a snug N95/FFP2 respirator outdoors and ventilate only briefly around 1:00–3:30 PM if outdoor haze clears.'
      : 'Keep outdoor errands timed for mid-afternoon (1:00–3:30 PM) when dispersion peaks and keep a fitted N95 handy near busy roads.';

  return [
    `Offline guidance for "${safeQuery || 'winter smog protection'}" in ${safeLocation} (${aqi.usAqi} AQI · ${safeCategory}, PM2.5 ${aqi.pm25} µg/m³):`,
    `• Outdoor & Ventilation: ${outdoorTip}`,
    `• Indoor Protection: ${budgetFilterTip} ${sensitiveLine}`,
    '• Clean Habits: Cook with lids on, skip candles/incense, and avoid burning leaves or waste. Figures are modeled estimates, not medical advice—consult a clinician for acute breathing symptoms.',
  ].join('\n\n');
}

/**
 * Selects 6 to 8 high-relevance FAQ chips prioritized for the user's household profile and AQI.
 */
export function getSuggestedFaqEntries(profile: UserProfile, usAqi: number, limit = 7): FaqEntry[] {
  const boundedLimit = Math.min(8, Math.max(6, limit));

  const scored = FAQ_ENTRIES.map((entry, idx) => {
    let priority = 0;

    if (
      profile.householdGroups.includes('respiratory') &&
      (entry.id === 'faq-elderly-asthma' || entry.id === 'faq-see-doctor')
    ) {
      priority += 5;
    }
    if (profile.householdGroups.includes('kids') && entry.id === 'faq-kids-play') {
      priority += 5;
    }
    if (profile.householdGroups.includes('elderly') && entry.id === 'faq-elderly-asthma') {
      priority += 4;
    }
    if (profile.householdGroups.includes('pets') && entry.id === 'faq-pets-care') {
      priority += 4;
    }
    if (
      profile.budget === 'low' &&
      (entry.id === 'faq-low-budget' || entry.id === 'faq-diy-purifier')
    ) {
      priority += 4;
    }
    if (
      (profile.cookingFuel === 'lpg_gas' || profile.cookingFuel === 'biomass_solid') &&
      (entry.id === 'faq-cooking-pollution' || entry.id === 'faq-gas-vs-electric')
    ) {
      priority += 3;
    }
    if (profile.heatingSource === 'wood_coal' && entry.id === 'faq-cleaner-heating') {
      priority += 4;
    }
    if (
      (profile.commuteMode === 'walking_cycling' || profile.commuteMode === 'public_transit') &&
      (entry.id === 'faq-mask-choice' || entry.id === 'faq-commute-traffic')
    ) {
      priority += 3;
    }
    if (
      usAqi > 150 &&
      (entry.id === 'faq-ventilate-timing' ||
        entry.id === 'faq-mask-choice' ||
        entry.id === 'faq-outdoor-exercise')
    ) {
      priority += 2;
    }

    return { entry, priority, idx };
  });

  scored.sort((a, b) => b.priority - a.priority || a.idx - b.idx);
  return scored.slice(0, boundedLimit).map((item) => item.entry);
}

/**
 * Generates a deterministic cache key from normalized question, AQI band, and household profile.
 */
export function buildChatCacheKey(question: string, usAqi: number, profile: UserProfile): string {
  const normQ = normalizeQuestion(question) || sanitizeText(question, 200).toLowerCase();
  const aqiBucket = Math.floor(Math.max(0, usAqi) / 25) * 25;
  const groups = [...profile.householdGroups].sort().join(',');
  const profileHash = [
    profile.budget,
    profile.commuteMode,
    profile.homeType,
    profile.ventilation,
    profile.heatingSource,
    profile.cookingFuel,
    groups || 'none',
  ].join('|');

  return `${normQ}::aqi${aqiBucket}::${profileHash}`;
}

interface CacheRecord {
  reply: string;
  expiresAt: number;
}

/**
 * Bounded TTL in-memory cache for chat answers.
 */
export class ChatAnswerCache {
  private readonly store = new Map<string, CacheRecord>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(
    maxEntries: number = CHAT_CACHE_CONFIG.maxEntries,
    ttlMs: number = CHAT_CACHE_CONFIG.ttlMs
  ) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  get(key: string, now = Date.now()): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (now >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.reply;
  }

  set(key: string, reply: string, now = Date.now()): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    while (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (!oldestKey) break;
      this.store.delete(oldestKey);
    }
    this.store.set(key, { reply, expiresAt: now + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const chatAnswerCache = new ChatAnswerCache();
