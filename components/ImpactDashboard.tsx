'use client';

import { memo } from 'react';
import { BarChart3, CheckCircle2, Info } from 'lucide-react';
import { LazyMotion, MotionConfig, domAnimation, m } from 'motion/react';
import type { ImpactMetrics } from '@/types/airwise';

interface ImpactDashboardProps {
  metrics: ImpactMetrics;
}

/**
 * Displays Before-vs-After PM2.5 exposure and emission reductions using an
 * accessible SVG chart, Tailwind progress bars, text summary, and a data table fallback.
 */
export const ImpactDashboard = memo(function ImpactDashboard({ metrics }: ImpactDashboardProps) {
  const maxExposure = Math.max(20, metrics.baselineExposureUgM3);
  const beforeExpWidth = 100;
  const activeExpWidth = Math.max(6, Math.round((metrics.activeExposureUgM3 / maxExposure) * 100));
  const fullExpWidth = Math.max(6, Math.round((metrics.projectedExposureUgM3 / maxExposure) * 100));

  const maxEmission = Math.max(20, metrics.baselineEmissionIndex);
  const beforeEmWidth = 100;
  const activeEmWidth = Math.max(6, Math.round((metrics.activeEmissionIndex / maxEmission) * 100));
  const fullEmWidth = Math.max(6, Math.round((metrics.projectedEmissionIndex / maxEmission) * 100));

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

          {/* Headline savings summary */}
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

          {/* Accessible SVG + Tailwind horizontal bar visualization */}
          <div className="mt-5 space-y-6">
            <p className="sr-only">{svgDescription}</p>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Daily Personal PM2.5 Exposure (µg/m³ effective · Estimate)
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">Lower is cleaner</span>
              </div>

              <svg
                role="img"
                aria-label={`PM2.5 exposure comparison bar chart: Before plan ${metrics.baselineExposureUgM3}, Checked today ${metrics.activeExposureUgM3}, Full plan ${metrics.projectedExposureUgM3} micrograms per cubic meter`}
                viewBox="0 0 480 96"
                className="mt-2.5 w-full overflow-visible"
              >
                <g className="text-[11px] fill-slate-700 dark:fill-slate-300">
                  <text x="0" y="18">
                    Before plan
                  </text>
                  <rect
                    x="110"
                    y="6"
                    width={`${(beforeExpWidth / 100) * 290}`}
                    height="16"
                    rx="4"
                    className="fill-slate-400 dark:fill-slate-600"
                  />
                  <text
                    x="412"
                    y="18"
                    className="font-mono font-semibold fill-slate-800 dark:fill-slate-200"
                  >
                    {metrics.baselineExposureUgM3} µg/m³
                  </text>

                  <text x="0" y="50">
                    Checked today
                  </text>
                  <rect
                    x="110"
                    y="38"
                    width={`${(activeExpWidth / 100) * 290}`}
                    height="16"
                    rx="4"
                    className="fill-[#C9482B] dark:fill-[#FF8A6B]"
                  />
                  <text
                    x="412"
                    y="50"
                    className="font-mono font-semibold fill-[#B23C22] dark:fill-[#FF8A6B]"
                  >
                    {metrics.activeExposureUgM3} µg/m³
                  </text>

                  <text x="0" y="82">
                    With full plan
                  </text>
                  <rect
                    x="110"
                    y="70"
                    width={`${(fullExpWidth / 100) * 290}`}
                    height="16"
                    rx="4"
                    className="fill-[#1E4D3B] dark:fill-emerald-500"
                  />
                  <text
                    x="412"
                    y="82"
                    className="font-mono font-semibold fill-[#1E4D3B] dark:fill-emerald-300"
                  >
                    {metrics.projectedExposureUgM3} µg/m³
                  </text>
                </g>
              </svg>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Household Winter Emission Footprint (0–100 index · Estimate)
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">Lower is cleaner</span>
              </div>

              <svg
                role="img"
                aria-label={`Household emission index comparison chart: Before plan ${metrics.baselineEmissionIndex}, Checked today ${metrics.activeEmissionIndex}, Full plan ${metrics.projectedEmissionIndex} out of 100`}
                viewBox="0 0 480 96"
                className="mt-2.5 w-full overflow-visible"
              >
                <g className="text-[11px] fill-slate-700 dark:fill-slate-300">
                  <text x="0" y="18">
                    Before plan
                  </text>
                  <rect
                    x="110"
                    y="6"
                    width={`${(beforeEmWidth / 100) * 290}`}
                    height="16"
                    rx="4"
                    className="fill-slate-400 dark:fill-slate-600"
                  />
                  <text
                    x="412"
                    y="18"
                    className="font-mono font-semibold fill-slate-800 dark:fill-slate-200"
                  >
                    {metrics.baselineEmissionIndex} / 100
                  </text>

                  <text x="0" y="50">
                    Checked today
                  </text>
                  <rect
                    x="110"
                    y="38"
                    width={`${(activeEmWidth / 100) * 290}`}
                    height="16"
                    rx="4"
                    className="fill-[#C9482B] dark:fill-[#FF8A6B]"
                  />
                  <text
                    x="412"
                    y="50"
                    className="font-mono font-semibold fill-[#B23C22] dark:fill-[#FF8A6B]"
                  >
                    {metrics.activeEmissionIndex} / 100
                  </text>

                  <text x="0" y="82">
                    With full plan
                  </text>
                  <rect
                    x="110"
                    y="70"
                    width={`${(fullEmWidth / 100) * 290}`}
                    height="16"
                    rx="4"
                    className="fill-[#1E4D3B] dark:fill-emerald-500"
                  />
                  <text
                    x="412"
                    y="82"
                    className="font-mono font-semibold fill-[#1E4D3B] dark:fill-emerald-300"
                  >
                    {metrics.projectedEmissionIndex} / 100
                  </text>
                </g>
              </svg>
            </div>
          </div>

          {/* Accessible data table fallback */}
          <div className="mt-6 overflow-x-auto border-t border-[#E2E4DA] pt-4 dark:border-emerald-900/40">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <caption className="pb-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200">
                Impact Comparison Data Table (Estimated Figures)
              </caption>
              <thead className="border-b border-[#E2E4DA] text-slate-600 dark:border-emerald-900/40 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Scenario
                  </th>
                  <th scope="col" className="py-2 px-3 text-right font-medium">
                    Est. PM2.5 Exposure
                  </th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">
                    Est. Emission Index
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE3] dark:divide-emerald-900/30">
                <tr>
                  <th
                    scope="row"
                    className="py-2 pr-3 font-medium text-slate-900 dark:text-slate-100"
                  >
                    Before plan (current baseline)
                  </th>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {metrics.baselineExposureUgM3} µg/m³
                  </td>
                  <td className="py-2 pl-3 text-right font-mono tabular-nums">
                    {metrics.baselineEmissionIndex} / 100
                  </td>
                </tr>
                <tr>
                  <th
                    scope="row"
                    className="py-2 pr-3 font-medium text-slate-900 dark:text-slate-100"
                  >
                    Your checked actions today
                  </th>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {metrics.activeExposureUgM3} µg/m³
                  </td>
                  <td className="py-2 pl-3 text-right font-mono tabular-nums">
                    {metrics.activeEmissionIndex} / 100
                  </td>
                </tr>
                <tr>
                  <th
                    scope="row"
                    className="py-2 pr-3 font-medium text-[#1E4D3B] dark:text-emerald-300"
                  >
                    Full plan adopted
                  </th>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-[#1E4D3B] dark:text-emerald-300 tabular-nums">
                    {metrics.projectedExposureUgM3} µg/m³ (-{metrics.exposureReductionPct}%)
                  </td>
                  <td className="py-2 pl-3 text-right font-mono font-semibold text-[#C9482B] dark:text-[#FF8A6B] tabular-nums">
                    {metrics.projectedEmissionIndex} / 100 (-{metrics.emissionReductionPct}%)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

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
