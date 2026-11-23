/**
 * @fileoverview Before-vs-After impact dashboard composing reusable `ImpactBarChart`
 * visualizations and `ImpactComparisonTable` data fallback.
 */

'use client';

import { BarChart3, CheckCircle2, Info } from 'lucide-react';
import { LazyMotion, MotionConfig, domAnimation, m } from 'motion/react';
import { memo } from 'react';
import { ImpactBarChart } from '@/components/impact/ImpactBarChart';
import { ImpactComparisonTable } from '@/components/impact/ImpactComparisonTable';
import type { ImpactMetrics } from '@/types/airwise';

export interface ImpactDashboardProps {
  metrics: ImpactMetrics;
}

/**
 * Displays Before-vs-After PM2.5 exposure and emission reductions using accessible
 * SVG bar charts, summary callouts, and an HTML data table fallback.
 *
 * @param props - Calculated household exposure and emission `ImpactMetrics`.
 * @returns Animated section summarizing estimated impact.
 */
export const ImpactDashboard = memo(function ImpactDashboard({ metrics }: ImpactDashboardProps) {
  const svgDescription = `Estimated impact comparison: Following the full plan lowers daily personal PM2.5 exposure from ${metrics.baselineExposureUgM3} to ${metrics.projectedExposureUgM3} micrograms per cubic meter (a ${metrics.exposureReductionPct}% reduction) and lowers household winter emissions index from ${metrics.baselineEmissionIndex} to ${metrics.projectedEmissionIndex} (a ${metrics.emissionReductionPct}% reduction).`;

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <m.section
          id="impact"
          aria-labelledby="impact-heading"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="liquid-glass-card-aqua rounded-3xl p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-[#0E7C8D] shadow-xs dark:border-white/20 dark:bg-white/10 dark:text-teal-300">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="impact-heading"
                  className="text-lg font-bold text-[#123D2B] dark:text-white"
                >
                  Estimated Household Impact
                </h2>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Before vs. after exposure and emissions · Estimate based on profile &amp; checked
                  habits
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-[#123D2B] dark:text-emerald-200">
              <CheckCircle2
                className="h-4 w-4 text-[#5846E5] dark:text-indigo-300"
                aria-hidden="true"
              />
              <span className="font-mono tabular-nums">
                {metrics.completedActionsCount}/{metrics.totalActionsCount} actions checked
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 border-y border-white/70 py-4 sm:grid-cols-2 dark:border-white/15">
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Estimated PM2.5 Exposure Reduction (Full Plan)
              </p>
              <p className="mt-1 font-mono text-3xl font-bold text-[#1E4D3B] dark:text-emerald-300 tabular-nums">
                -{metrics.exposureReductionPct}%
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                {metrics.baselineExposureUgM3} → {metrics.projectedExposureUgM3} µg/m³ effective
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Estimated Winter Emission Reduction (Full Plan)
              </p>
              <p className="mt-1 font-mono text-3xl font-bold text-[#C9482B] dark:text-[#FF8A6B] tabular-nums">
                -{metrics.emissionReductionPct}%
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                Index {metrics.baselineEmissionIndex} → {metrics.projectedEmissionIndex} / 100
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-6">
            <p className="sr-only">{svgDescription}</p>

            <ImpactBarChart
              title="Daily Personal PM2.5 Exposure (µg/m³ effective · Estimate)"
              ariaLabel={`PM2.5 exposure comparison bar chart: Before plan ${metrics.baselineExposureUgM3}, Checked today ${metrics.activeExposureUgM3}, Full plan ${metrics.projectedExposureUgM3} micrograms per cubic meter`}
              unitSuffix="µg/m³"
              baselineValue={metrics.baselineExposureUgM3}
              activeValue={metrics.activeExposureUgM3}
              projectedValue={metrics.projectedExposureUgM3}
            />

            <ImpactBarChart
              title="Household Winter Emission Footprint (0–100 index · Estimate)"
              ariaLabel={`Household emission index comparison chart: Before plan ${metrics.baselineEmissionIndex}, Checked today ${metrics.activeEmissionIndex}, Full plan ${metrics.projectedEmissionIndex} out of 100`}
              unitSuffix="/ 100"
              baselineValue={metrics.baselineEmissionIndex}
              activeValue={metrics.activeEmissionIndex}
              projectedValue={metrics.projectedEmissionIndex}
            />
          </div>

          <ImpactComparisonTable metrics={metrics} />

          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Estimate disclaimer: Exposure and emission percentages are modeled estimates for
              household decision support based on indoor infiltration and source-reduction
              literature, not direct sensor measurements.
            </span>
          </p>
        </m.section>
      </LazyMotion>
    </MotionConfig>
  );
});
