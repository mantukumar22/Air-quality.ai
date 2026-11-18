'use client';

import { memo, useMemo, useState } from 'react';
import { AlertTriangle, CheckSquare, RotateCcw, Square } from 'lucide-react';
import type { RecommendationItem, RecommendationPlan } from '@/types/airwise';

export type RecommendationFilterTab = 'all' | 'routine' | 'indoor' | 'sustainable' | 'vulnerable';

interface RecommendationListProps {
  plan: RecommendationPlan;
  isGenerating: boolean;
  error: string | null;
  checkedIds: string[];
  activeTab?: RecommendationFilterTab;
  onTabChange?: (tab: RecommendationFilterTab) => void;
  onToggleItem: (id: string) => void;
  onResetChecklist: () => void;
}

const FILTER_TABS: Array<{ id: RecommendationFilterTab; label: string }> = [
  { id: 'all', label: 'All Actions' },
  { id: 'routine', label: 'Daily Routine' },
  { id: 'indoor', label: 'Indoor Hacks' },
  { id: 'sustainable', label: 'Sustainable Swaps' },
  { id: 'vulnerable', label: 'Vulnerable Care' },
];

const COST_LABELS: Record<RecommendationItem['costTier'], string> = {
  low: 'Low / Zero cost',
  medium: 'Moderate cost',
  high: 'Higher investment',
};

function RecommendationRow({
  item,
  sectionLabel,
  checked,
  onToggle,
}: {
  item: RecommendationItem;
  sectionLabel: string;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <li className="py-4 first:pt-2 last:pb-1">
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={`Mark "${item.title}" as ${checked ? 'incomplete' : 'complete'}`}
          onClick={() => onToggle(item.id)}
          className="liquid-btn-glass mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[#5846E5] dark:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5]"
        >
          {checked ? (
            <CheckSquare className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Square className="h-5 w-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h4
              className={`text-base font-semibold leading-snug ${
                checked
                  ? 'line-through text-slate-500 dark:text-slate-400'
                  : 'text-[#1E4D3B] dark:text-white'
              }`}
            >
              {item.title}
            </h4>
            <p className="font-mono text-xs font-semibold text-[#C9482B] dark:text-[#FF8A6B] tabular-nums shrink-0">
              Est. -{item.pm25ReductionPct}% PM2.5 · -{item.emissionReductionPct}% emissions
            </p>
          </div>

          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {item.actionSummary}
          </p>

          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Why this works:{' '}
            </span>
            {item.whyItWorks}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{sectionLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{item.timeframe}</span>
            <span aria-hidden="true">·</span>
            <span>{COST_LABELS[item.costTier]}</span>
            <span aria-hidden="true">·</span>
            <span>Estimate</span>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Displays structured daily routine, indoor hacks, sustainable alternatives,
 * and vulnerable-group precautions with persistent checklist controls.
 */
export const RecommendationList = memo(function RecommendationList({
  plan,
  isGenerating,
  error,
  checkedIds,
  activeTab: controlledTab,
  onTabChange,
  onToggleItem,
  onResetChecklist,
}: RecommendationListProps) {
  const [internalTab, setInternalTab] = useState<RecommendationFilterTab>('all');
  const activeTab = controlledTab ?? internalTab;

  const handleTabSelect = (tab: RecommendationFilterTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const checkedSet = useMemo(() => new Set(checkedIds), [checkedIds]);

  const sections = useMemo(() => {
    const groups: Array<{
      key: RecommendationFilterTab;
      title: string;
      entries: Array<{ item: RecommendationItem; label: string }>;
    }> = [
      {
        key: 'routine',
        title: 'Daily Low-Emission Routine',
        entries: [
          ...plan.dailyRoutine.morning.map((item) => ({ item, label: 'Morning' })),
          ...plan.dailyRoutine.afternoon.map((item) => ({ item, label: 'Afternoon' })),
          ...plan.dailyRoutine.evening.map((item) => ({ item, label: 'Evening' })),
        ],
      },
      {
        key: 'indoor',
        title: 'Indoor Air Quality Hacks',
        entries: plan.indoorHacks.map((item) => ({ item, label: 'Indoor Air' })),
      },
      {
        key: 'sustainable',
        title: 'Sustainable Alternatives',
        entries: plan.sustainableAlternatives.map((item) => ({
          item,
          label: 'Sustainable Swap',
        })),
      },
      {
        key: 'vulnerable',
        title: 'Vulnerable-Group Precautions',
        entries: plan.vulnerablePrecautions.map((item) => ({
          item,
          label: 'Household Care',
        })),
      },
    ];

    if (activeTab === 'all') return groups;
    return groups.filter((g) => g.key === activeTab);
  }, [activeTab, plan]);

  return (
    <section
      id="action-plan"
      aria-labelledby="plan-heading"
      className="liquid-glass-card rounded-3xl p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#5846E5] dark:text-indigo-300">
            Your Personalized Checklist
          </p>
          <h2 id="plan-heading" className="mt-1 text-xl font-bold text-[#123D2B] dark:text-white">
            {plan.headline}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {plan.winterSmogContext}
          </p>
        </div>

        <button
          type="button"
          onClick={onResetChecklist}
          disabled={checkedIds.length === 0}
          className="liquid-btn-glass inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-slate-800 disabled:opacity-45 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] dark:text-slate-100"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Reset Checklist</span>
        </button>
      </div>

      {error && (
        <div
          role="status"
          aria-live="polite"
          className="liquid-glass-card-warm mt-4 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm text-amber-950 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Segmented Liquid Glass filter tabs */}
      <div
        role="tablist"
        aria-label="Filter action plan categories"
        className="liquid-tablist mt-5 flex flex-wrap gap-1.5 rounded-full p-1.5"
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabSelect(tab.id)}
              className={`min-h-[40px] rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] ${
                isActive
                  ? 'liquid-tab-active'
                  : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="mt-6 space-y-8">
        {isGenerating ? (
          <div className="space-y-4 animate-pulse" aria-label="Generating recommendations">
            <div className="h-5 w-48 rounded bg-white/70 dark:bg-white/10" />
            <div className="h-24 w-full rounded-2xl bg-white/60 dark:bg-white/10" />
            <div className="h-24 w-full rounded-2xl bg-white/60 dark:bg-white/10" />
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.key}>
              <h3 className="border-b border-white/70 pb-2 text-base font-bold text-[#123D2B] dark:border-white/15 dark:text-white">
                {section.title}
              </h3>
              <ul className="divide-y divide-white/65 dark:divide-white/15">
                {section.entries.map(({ item, label }) => (
                  <RecommendationRow
                    key={item.id}
                    item={item}
                    sectionLabel={label}
                    checked={checkedSet.has(item.id)}
                    onToggle={onToggleItem}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
});
