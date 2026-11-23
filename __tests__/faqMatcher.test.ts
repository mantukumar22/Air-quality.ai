import { getFallbackAqiReading } from '@/lib/aqi';
import { DEFAULT_PROFILE } from '@/lib/constants';
import { FAQ_ENTRIES } from '@/lib/faq';
import {
  buildChatCacheKey,
  buildOfflineFallbackAnswer,
  ChatAnswerCache,
  getSuggestedFaqEntries,
  matchFaqQuestion,
  normalizeQuestion,
  personalizeFaqAnswer,
} from '@/lib/faqMatcher';
import type { UserProfile } from '@/types/airwise';

describe('FAQ Knowledge Base & Smart Matcher', () => {
  it('provides at least 20 winter-smog FAQ entries with impact estimates and non-medical disclaimers', () => {
    expect(FAQ_ENTRIES.length).toBeGreaterThanOrEqual(20);
    for (const entry of FAQ_ENTRIES) {
      expect(entry.id).toBeTruthy();
      expect(entry.keywords.length).toBeGreaterThanOrEqual(4);
      expect(entry.impact.toLowerCase()).toContain('estimate');
      expect(entry.answer.toLowerCase()).toContain('not medical advice');
    }
  });

  it('normalizes case, punctuation, and stopwords cleanly', () => {
    expect(normalizeQuestion('What is the BEST time to ventilate?!')).toBe('best time ventilate');
    expect(normalizeQuestion('   How do I wear an N95 mask???  ')).toBe('wear n95 mask');
  });

  it('matches exact FAQ questions with top score', () => {
    const match = matchFaqQuestion('Best time to ventilate my home during smog?');
    expect(match).not.toBeNull();
    expect(match?.entry.id).toBe('faq-ventilate-timing');
    expect(match?.score).toBe(1);
  });

  it('matches partial queries regardless of punctuation and casing', () => {
    const diyMatch = matchFaqQuestion('DIY BOX FAN + HEPA AIR PURIFIER!!');
    expect(diyMatch?.entry.id).toBe('faq-diy-purifier');

    const maskMatch = matchFaqQuestion('n95 or ffp2 vs cloth mask???');
    expect(maskMatch?.entry.id).toBe('faq-mask-choice');

    const winterMatch = matchFaqQuestion('WHY IS SMOG WORSE IN WINTER??');
    expect(winterMatch?.entry.id).toBe('faq-why-winter-smog');
  });

  it('returns null when no FAQ entry meets threshold', () => {
    expect(matchFaqQuestion('')).toBeNull();
    expect(matchFaqQuestion('   ?!.,   ')).toBeNull();
    expect(matchFaqQuestion('quantum astrophysics black hole entropy')).toBeNull();
    expect(matchFaqQuestion('best sourdough bread starter temperature recipe')).toBeNull();
  });

  it('personalizes FAQ answers using live AQI and household profile', () => {
    const entry = FAQ_ENTRIES.find((item) => item.id === 'faq-kids-play');
    expect(entry).toBeDefined();
    if (!entry) throw new Error('Expected faq-kids-play fixture to exist');
    const aqi = getFallbackAqiReading('Lahore');
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      city: 'Lahore',
      householdGroups: ['respiratory', 'kids'],
      budget: 'low',
    };

    const personalized = personalizeFaqAnswer(entry, profile, {
      locationName: aqi.locationName,
      usAqi: aqi.usAqi,
      pm25: aqi.pm25,
      categoryLabel: aqi.category.label,
    });

    expect(personalized).toContain('Lahore');
    expect(personalized).toContain(`${aqi.usAqi} AQI`);
    expect(personalized).toContain('asthma medications handy');
    expect(personalized).toContain('zero-cost timing');
  });

  it('builds deterministic offline fallback advice from AQI and profile', () => {
    const fallback = buildOfflineFallbackAnswer('Custom neighborhood question', DEFAULT_PROFILE, {
      locationName: 'New Delhi',
      usAqi: 210,
      pm25: 132.4,
      categoryLabel: 'Very Unhealthy',
    });

    expect(fallback).toContain('Offline guidance');
    expect(fallback).toContain('New Delhi');
    expect(fallback).toContain('210 AQI');
    expect(fallback).toContain('not medical advice');
  });

  it('prioritizes 6 to 8 relevant FAQ chips for respiratory and kids households', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      householdGroups: ['respiratory', 'kids'],
    };
    const chips = getSuggestedFaqEntries(profile, 190, 7);
    expect(chips).toHaveLength(7);
    const ids = chips.map((c) => c.id);
    expect(ids).toContain('faq-elderly-asthma');
    expect(ids).toContain('faq-kids-play');
  });

  it('caches answers with normalized keys, TTL expiry, and LRU eviction', () => {
    const cache = new ChatAnswerCache(2, 1000);
    const k1 = buildChatCacheKey('Open bedroom window at 2 PM?', 185, DEFAULT_PROFILE);
    const k2 = buildChatCacheKey('Should I buy ozone generator?', 185, DEFAULT_PROFILE);
    const k3 = buildChatCacheKey('Check air filter MERV rating?', 185, DEFAULT_PROFILE);

    expect(k1).toBe(buildChatCacheKey('open bedroom window 2 pm', 180, DEFAULT_PROFILE));

    cache.set(k1, 'Answer 1', 100);
    expect(cache.get(k1, 500)).toBe('Answer 1');
    expect(cache.get(k1, 1200)).toBeNull(); // Expired past 100 + 1000

    cache.set(k1, 'Answer 1', 2000);
    cache.set(k2, 'Answer 2', 2000);
    cache.set(k3, 'Answer 3', 2000); // Evicts oldest k1
    expect(cache.get(k1, 2100)).toBeNull();
    expect(cache.get(k2, 2100)).toBe('Answer 2');
    expect(cache.get(k3, 2100)).toBe('Answer 3');
  });
});
