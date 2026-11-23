/**
 * @fileoverview Profile- and AQI-prioritized suggested question chip group providing
 * instant stored FAQ answers with zero API calls via `useTypingReveal`.
 */

'use client';

import { Sparkles, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTypingReveal } from '@/hooks/useTypingReveal';
import { toAqiContextInput } from '@/lib/apiClient';
import { FAQ_MATCHER_CONFIG, TYPING_REVEAL_CONFIG } from '@/lib/constants';
import { getSuggestedFaqEntries, personalizeFaqAnswer } from '@/lib/faqMatcher';
import type { AqiReading, FaqEntry, UserProfile } from '@/types/airwise';

export interface SuggestedQuestionsProps {
  profile: UserProfile;
  aqi: AqiReading;
  disabled?: boolean;
  showInlineAnswer?: boolean;
  onSelectSuggestion?: (entry: FaqEntry, personalizedAnswer: string) => void;
}

/**
 * Renders 6 to 8 profile- and AQI-prioritized question chips above the chat input.
 * Clicking any chip displays a stored, personalized answer immediately with zero API calls
 * and respects `prefers-reduced-motion` via `useTypingReveal`.
 *
 * @param props - Household profile, AQI reading, disabled flag, and selection callback.
 * @returns Suggested question chip group with optional inline answer preview.
 */
export function SuggestedQuestions({
  profile,
  aqi,
  disabled = false,
  showInlineAnswer = true,
  onSelectSuggestion,
}: SuggestedQuestionsProps) {
  const suggestions = useMemo(
    () => getSuggestedFaqEntries(profile, aqi.usAqi, FAQ_MATCHER_CONFIG.suggestedChipDefault),
    [profile, aqi.usAqi]
  );

  const [activeEntry, setActiveEntry] = useState<FaqEntry | null>(null);
  const [fullAnswer, setFullAnswer] = useState('');
  const [visibleAnswer, setVisibleAnswer] = useState('');
  const { startReveal } = useTypingReveal({
    chunkSizeChars: TYPING_REVEAL_CONFIG.chipChunkSizeChars,
    intervalMs: TYPING_REVEAL_CONFIG.intervalMs,
  });

  const handleSelect = (entry: FaqEntry) => {
    if (disabled) return;
    const personalized = personalizeFaqAnswer(entry, profile, toAqiContextInput(aqi));

    setActiveEntry(entry);
    setFullAnswer(personalized);

    if (showInlineAnswer) {
      startReveal(personalized, setVisibleAnswer);
    }

    onSelectSuggestion?.(entry, personalized);
  };

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
        <Zap className="h-3.5 w-3.5 text-[#5846E5] dark:text-indigo-300" aria-hidden="true" />
        <span>Instant smog guide questions (tailored to your household)</span>
      </div>

      <div role="group" aria-label="Suggested questions" className="flex flex-wrap gap-2">
        {suggestions.map((entry) => {
          const isSelected = activeEntry?.id === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => handleSelect(entry)}
              className={`liquid-btn-glass min-h-[44px] rounded-full px-4 py-2 text-left text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] disabled:opacity-50 ${
                isSelected
                  ? 'border-[#5846E5]/60 bg-indigo-50/90 text-[#123D2B] dark:border-indigo-400/60 dark:bg-indigo-950/50 dark:text-white'
                  : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {entry.question}
            </button>
          );
        })}
      </div>

      {showInlineAnswer && (
        <div aria-live="polite" className="mt-3">
          {activeEntry && fullAnswer && (
            <div className="liquid-glass-card rounded-3xl p-4 text-sm leading-relaxed text-slate-900 dark:text-slate-100">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200">
                  <Zap className="h-3 w-3" aria-hidden="true" />
                  Instant answer
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {activeEntry.impact}
                </span>
              </div>
              {visibleAnswer.split('\n').map((line, index) => (
                <p key={index} className={index > 0 ? 'mt-2' : undefined}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
