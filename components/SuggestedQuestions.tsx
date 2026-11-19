'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';
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
 * and respects prefers-reduced-motion during the short reveal animation.
 */
export function SuggestedQuestions({
  profile,
  aqi,
  disabled = false,
  showInlineAnswer = true,
  onSelectSuggestion,
}: SuggestedQuestionsProps) {
  const suggestions = useMemo(
    () => getSuggestedFaqEntries(profile, aqi.usAqi, 7),
    [profile, aqi.usAqi]
  );

  const [activeEntry, setActiveEntry] = useState<FaqEntry | null>(null);
  const [fullAnswer, setFullAnswer] = useState('');
  const [visibleAnswer, setVisibleAnswer] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startTypingReveal = (text: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setVisibleAnswer(text);
      return;
    }

    let cursor = Math.min(28, text.length);
    setVisibleAnswer(text.slice(0, cursor));

    timerRef.current = setInterval(() => {
      cursor = Math.min(text.length, cursor + 28);
      setVisibleAnswer(text.slice(0, cursor));
      if (cursor >= text.length && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 16);
  };

  const handleSelect = (entry: FaqEntry) => {
    if (disabled) return;
    const personalized = personalizeFaqAnswer(entry, profile, {
      locationName: aqi.locationName,
      usAqi: aqi.usAqi,
      pm25: aqi.pm25,
      categoryLabel: aqi.category.label,
    });

    setActiveEntry(entry);
    setFullAnswer(personalized);

    if (showInlineAnswer) {
      startTypingReveal(personalized);
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
