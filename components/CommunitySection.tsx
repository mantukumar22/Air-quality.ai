'use client';

import { useState } from 'react';
import { Check, CheckSquare, Copy, Share2, Square, Users } from 'lucide-react';
import type { RecommendationItem } from '@/types/airwise';

interface CommunitySectionProps {
  communityActions: RecommendationItem[];
  neighborShareSummary: string;
  checkedIds: string[];
  onToggleItem: (id: string) => void;
}

/**
 * Neighborhood & family mode styled as the deep emerald community band
 * with soft mint-cream cards for collective smog actions and neighbor sharing.
 */
export function CommunitySection({
  communityActions,
  neighborShareSummary,
  checkedIds,
  onToggleItem,
}: CommunitySectionProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleCopySummary = async () => {
    setCopyError(null);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(neighborShareSummary);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError('Select and copy the summary text manually in this browser.');
    }
  };

  return (
    <section
      id="community"
      aria-labelledby="community-heading"
      className="liquid-glass-band-emerald rounded-3xl px-5 py-8 text-white sm:px-8 sm:py-10"
    >
      <div className="text-center">
        <div className="inline-flex items-center justify-center gap-2 text-emerald-200">
          <Users className="h-5 w-5" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-wide">
            Family &amp; Neighborhood Mode
          </span>
        </div>
        <h2 id="community-heading" className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
          Clean Air Starts on Your Block
        </h2>
        <p className="mt-1.5 mx-auto max-w-xl text-sm text-emerald-100/90">
          Collective steps like zero open burning and shared school commutes lower street-level
          winter smog for everyone.
        </p>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-12">
        {/* Community Action Cards */}
        <div className="lg:col-span-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {communityActions.map((item) => {
            const checked = checkedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="liquid-glass-card flex items-start gap-3 rounded-3xl p-4 text-slate-900 dark:text-slate-100"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={`Mark "${item.title}" as ${checked ? 'incomplete' : 'complete'}`}
                  onClick={() => onToggleItem(item.id)}
                  className="liquid-btn-glass mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[#5846E5] dark:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5]"
                >
                  {checked ? (
                    <CheckSquare className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Square
                      className="h-5 w-5 text-slate-500 dark:text-slate-400"
                      aria-hidden="true"
                    />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3
                      className={`text-sm font-bold ${
                        checked
                          ? 'line-through text-slate-500 dark:text-slate-400'
                          : 'text-[#123D2B] dark:text-white'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <span className="font-mono text-xs font-semibold text-[#C2410C] dark:text-[#FF8A4C] tabular-nums">
                      Est. -{item.emissionReductionPct}% emissions
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {item.actionSummary}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {item.whyItWorks} · Estimate
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Shareable Neighbor Summary Card */}
        <div className="liquid-glass-card-iridescent lg:col-span-5 flex flex-col justify-between rounded-3xl p-5 text-slate-900 dark:text-slate-100">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-[#123D2B] dark:text-white">
              <Share2 className="h-4 w-4 text-[#5846E5] dark:text-indigo-300" aria-hidden="true" />
              <h3>Shareable Neighbor Summary</h3>
            </div>
            <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
              Ready to paste into building WhatsApp, SMS, or parent groups.
            </p>

            <label htmlFor="neighbor-summary-text" className="sr-only">
              Shareable neighbor air quality summary
            </label>
            <textarea
              id="neighbor-summary-text"
              readOnly
              rows={5}
              value={neighborShareSummary}
              className="liquid-input mt-3 w-full rounded-2xl p-3 text-xs leading-relaxed text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] dark:text-slate-200"
            />
          </div>

          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="liquid-btn-coral inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>Copy Neighbor Summary</span>
                </>
              )}
            </button>
            <div aria-live="polite" className="text-xs text-slate-800 dark:text-slate-200">
              {copied && <span>Summary copied. Share it with neighbors or family members.</span>}
              {copyError && <span className="text-amber-900 dark:text-amber-300">{copyError}</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
