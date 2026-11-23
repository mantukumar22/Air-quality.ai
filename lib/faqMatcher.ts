/**
 * @fileoverview Deterministic FAQ normalization, similarity matching, household
 * personalization, offline fallback synthesis, and bounded TTL answer caching.
 */

import { CHAT_CACHE_CONFIG, FAQ_MATCHER_CONFIG, INPUT_LIMITS, STOPWORDS } from '@/lib/constants';
import { FAQ_ENTRIES } from '@/lib/faq';
import { sanitizeText } from '@/lib/sanitize';
import type { AqiContextInput, FaqEntry, UserProfile } from '@/types/airwise';

export interface FaqMatchResult {
  entry: FaqEntry;
  score: number;
}

type AqiSnapshot = Pick<AqiContextInput, 'locationName' | 'usAqi' | 'pm25' | 'categoryLabel'>;

/**
 * Normalizes a user question by lowercasing, stripping punctuation,
 * collapsing whitespace, and removing English stopwords.
 *
 * @param input - Raw user question string.
 * @returns Normalized space-delimited token phrase.
 */
export function normalizeQuestion(input: string): string {
  const cleaned = sanitizeText(input, INPUT_LIMITS.chatMessageMaxLength)
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
 * Splits a question into normalized unique content tokens of at least 2 characters.
 *
 * @param input - Raw question or keyword phrase.
 * @returns Deduplicated token array.
 */
export function tokenizeQuestion(input: string): string[] {
  const normalized = normalizeQuestion(input);
  if (!normalized) return [];
  return Array.from(
    new Set(normalized.split(' ').filter((t) => t.length >= FAQ_MATCHER_CONFIG.minTokenLength))
  );
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

function extractKeywordSignals(
  rawNormalizedFull: string,
  keywords: readonly string[]
): { keywordTokens: Set<string>; phraseBonus: number } {
  const keywordTokens = new Set<string>();
  let phraseBonus = 0;

  for (const kw of keywords) {
    const kwNorm = kw.toLowerCase().trim();
    if (
      rawNormalizedFull.includes(kwNorm) &&
      kwNorm.length >= FAQ_MATCHER_CONFIG.phraseKeywordMinLength
    ) {
      phraseBonus += kwNorm.includes(' ')
        ? FAQ_MATCHER_CONFIG.phraseExactBonus
        : FAQ_MATCHER_CONFIG.wordBonus;
    }
    for (const part of tokenizeQuestion(kwNorm)) {
      keywordTokens.add(part);
    }
  }

  return { keywordTokens, phraseBonus };
}

function scoreSingleToken(
  token: string,
  keywordTokens: ReadonlySet<string>,
  questionTokens: ReadonlySet<string>
): number {
  const inKeywords = keywordTokens.has(token);
  const inQuestion = questionTokens.has(token);

  if (inKeywords && inQuestion) return FAQ_MATCHER_CONFIG.bothTokenWeight;
  if (inKeywords) return FAQ_MATCHER_CONFIG.keywordWeight;
  if (inQuestion) return FAQ_MATCHER_CONFIG.questionWeight;

  // Soft fuzzy fallback for plurals and minor spelling variations (e.g. purifiers vs purifier)
  for (const kwToken of keywordTokens) {
    const isPrefixMatch =
      token.length >= FAQ_MATCHER_CONFIG.minPrefixFuzzyLength &&
      kwToken.startsWith(token.slice(0, FAQ_MATCHER_CONFIG.minPrefixFuzzyLength));
    if (isPrefixMatch || diceSimilarity(token, kwToken) >= FAQ_MATCHER_CONFIG.diceThreshold) {
      return FAQ_MATCHER_CONFIG.fuzzyWeight;
    }
  }

  return 0;
}

function scoreEntry(rawNormalizedFull: string, tokens: readonly string[], entry: FaqEntry): number {
  if (tokens.length === 0) return 0;

  const entryQuestionNorm = normalizeQuestion(entry.question);
  if (rawNormalizedFull && entryQuestionNorm === rawNormalizedFull) {
    return 1;
  }

  const { keywordTokens, phraseBonus } = extractKeywordSignals(rawNormalizedFull, entry.keywords);
  const questionTokens = new Set(tokenizeQuestion(entry.question));

  let matchedWeight = 0;
  for (const token of tokens) {
    matchedWeight += scoreSingleToken(token, keywordTokens, questionTokens);
  }

  const tokenCoverage = matchedWeight / Math.max(tokens.length, 2);
  const questionDice = diceSimilarity(rawNormalizedFull, entryQuestionNorm);

  return Math.min(
    1,
    tokenCoverage * FAQ_MATCHER_CONFIG.coverageWeight +
      Math.min(FAQ_MATCHER_CONFIG.maxPhraseBonus, phraseBonus) +
      questionDice * FAQ_MATCHER_CONFIG.diceWeight
  );
}

/**
 * Matches a typed user question against pre-stored `FAQ_ENTRIES` using keyword overlap
 * and token similarity. Returns the best match only when score meets threshold.
 *
 * @param query - Raw user message text.
 * @param threshold - Minimum normalized similarity score (0–1) required to match.
 * @returns Top matching `FaqMatchResult`, or `null` when below threshold.
 */
export function matchFaqQuestion(
  query: string,
  threshold = FAQ_MATCHER_CONFIG.defaultThreshold
): FaqMatchResult | null {
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

function buildGroupContextNote(
  groups: readonly UserProfile['householdGroups'][number][]
): string | null {
  if (groups.includes('respiratory')) {
    return 'keep asthma medications handy and run continuous bedroom filtration';
  }
  if (groups.includes('kids')) {
    return 'keep children indoors during early morning inversion hours';
  }
  if (groups.includes('elderly')) {
    return 'schedule walks for older adults only around 1:00–3:30 PM';
  }
  if (groups.includes('pets')) {
    return 'keep pet walks brief and wipe paws/fur afterward';
  }
  return null;
}

/**
 * Appends one personalized context line tailored to the user's live AQI and household profile.
 *
 * @param entry - Matched pre-stored FAQ entry.
 * @param profile - Household sensitivity groups and budget tier.
 * @param aqi - Current neighborhood AQI snapshot.
 * @returns Sanitized answer with localized AQI context appended.
 */
export function personalizeFaqAnswer(
  entry: FaqEntry,
  profile: UserProfile,
  aqi: AqiSnapshot
): string {
  const safeLocation = sanitizeText(aqi.locationName || profile.city || 'your area', 80);
  const safeCategory = sanitizeText(
    aqi.categoryLabel || 'Elevated',
    INPUT_LIMITS.categoryLabelMaxLength
  );

  const aqiGuidance =
    aqi.usAqi > FAQ_MATCHER_CONFIG.highSmogAqiThreshold
      ? 'keep windows sealed until mid-afternoon and wear a fitted N95 outdoors'
      : aqi.usAqi > FAQ_MATCHER_CONFIG.moderateSmogAqiThreshold
        ? 'limit prolonged outdoor exertion during morning and evening rush hours'
        : 'take advantage of cleaner daylight hours to briefly cross-ventilate';

  const notes: string[] = [aqiGuidance];
  const groupNote = buildGroupContextNote(profile.householdGroups);
  if (groupNote) {
    notes.push(groupNote);
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
 *
 * @param query - User's custom question text.
 * @param profile - Household setup and budget tier.
 * @param aqi - Live neighborhood AQI snapshot.
 * @returns Multi-paragraph plain-text winter-smog guide response.
 */
export function buildOfflineFallbackAnswer(
  query: string,
  profile: UserProfile,
  aqi: AqiSnapshot
): string {
  const safeLocation = sanitizeText(aqi.locationName || profile.city || 'your area', 80);
  const safeCategory = sanitizeText(
    aqi.categoryLabel || 'Elevated',
    INPUT_LIMITS.categoryLabelMaxLength
  );
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
    aqi.usAqi > FAQ_MATCHER_CONFIG.highSmogAqiThreshold
      ? 'Stay indoors during 6:00–10:30 AM and post-sunset peaks; wear a snug N95/FFP2 respirator outdoors and ventilate only briefly around 1:00–3:30 PM if outdoor haze clears.'
      : 'Keep outdoor errands timed for mid-afternoon (1:00–3:30 PM) when dispersion peaks and keep a fitted N95 handy near busy roads.';

  return [
    `Offline guidance for "${safeQuery || 'winter smog protection'}" in ${safeLocation} (${aqi.usAqi} AQI · ${safeCategory}, PM2.5 ${aqi.pm25} µg/m³):`,
    `• Outdoor & Ventilation: ${outdoorTip}`,
    `• Indoor Protection: ${budgetFilterTip} ${sensitiveLine}`,
    '• Clean Habits: Cook with lids on, skip candles/incense, and avoid burning leaves or waste. Figures are modeled estimates, not medical advice—consult a clinician for acute breathing symptoms.',
  ].join('\n\n');
}

function scoreSuggestedFaq(entry: FaqEntry, profile: UserProfile, usAqi: number): number {
  let priority = 0;
  const groups = profile.householdGroups;

  if (
    groups.includes('respiratory') &&
    (entry.id === 'faq-elderly-asthma' || entry.id === 'faq-see-doctor')
  ) {
    priority += 5;
  }
  if (groups.includes('kids') && entry.id === 'faq-kids-play') priority += 5;
  if (groups.includes('elderly') && entry.id === 'faq-elderly-asthma') priority += 4;
  if (groups.includes('pets') && entry.id === 'faq-pets-care') priority += 4;
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
  if (profile.heatingSource === 'wood_coal' && entry.id === 'faq-cleaner-heating') priority += 4;
  if (
    (profile.commuteMode === 'walking_cycling' || profile.commuteMode === 'public_transit') &&
    (entry.id === 'faq-mask-choice' || entry.id === 'faq-commute-traffic')
  ) {
    priority += 3;
  }
  if (
    usAqi > FAQ_MATCHER_CONFIG.highSmogAqiThreshold &&
    (entry.id === 'faq-ventilate-timing' ||
      entry.id === 'faq-mask-choice' ||
      entry.id === 'faq-outdoor-exercise')
  ) {
    priority += 2;
  }

  return priority;
}

/**
 * Selects 6 to 8 high-relevance FAQ chips prioritized for the user's household profile and AQI.
 *
 * @param profile - Household setup and sensitivity groups.
 * @param usAqi - Current local US AQI value.
 * @param limit - Target number of chips clamped between 6 and 8.
 * @returns Ordered list of top `FaqEntry` chips.
 */
export function getSuggestedFaqEntries(
  profile: UserProfile,
  usAqi: number,
  limit: number = FAQ_MATCHER_CONFIG.suggestedChipDefault
): FaqEntry[] {
  const boundedLimit = Math.min(
    FAQ_MATCHER_CONFIG.suggestedChipMax,
    Math.max(FAQ_MATCHER_CONFIG.suggestedChipMin, limit)
  );

  return FAQ_ENTRIES.map((entry, idx) => ({
    entry,
    priority: scoreSuggestedFaq(entry, profile, usAqi),
    idx,
  }))
    .sort((a, b) => b.priority - a.priority || a.idx - b.idx)
    .slice(0, boundedLimit)
    .map((item) => item.entry);
}

/**
 * Generates a deterministic cache key from normalized question, AQI band, and household profile.
 *
 * @param question - User question string.
 * @param usAqi - Current US AQI reading.
 * @param profile - Household profile affecting guidance.
 * @returns Canonical cache lookup key.
 */
export function buildChatCacheKey(question: string, usAqi: number, profile: UserProfile): string {
  const normQ = normalizeQuestion(question) || sanitizeText(question, 200).toLowerCase();
  const bucket = FAQ_MATCHER_CONFIG.aqiBucketSize;
  const aqiBucket = Math.floor(Math.max(0, usAqi) / bucket) * bucket;
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
 * Bounded TTL in-memory LRU cache for chat answers.
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

  /** Retrieves a cached reply if present and unexpired, refreshing LRU recency. */
  get(key: string, now = Date.now()): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (now >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.reply;
  }

  /** Stores a reply under `key`, evicting oldest entries once `maxEntries` is reached. */
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

  /** Removes all cached answers. */
  clear(): void {
    this.store.clear();
  }

  /** Current count of stored entries. */
  get size(): number {
    return this.store.size;
  }
}

/** Shared server-side TTL cache for generated Gemini chat answers. */
export const chatAnswerCache = new ChatAnswerCache();
