/**
 * @fileoverview Accessible HTML data-table fallback presenting Before-vs-After impact numbers.
 */

'use client';

import type { ImpactMetrics } from '@/types/airwise';

export interface ImpactComparisonTableProps {
  metrics: ImpactMetrics;
}

/**
 * Renders the tabular comparison of baseline, checked-today, and full-plan metrics
 * for screen readers and scannable numerical review.
 *
 * @param props - Calculated household `ImpactMetrics`.
 * @returns Accessible HTML comparison table.
 */
export function ImpactComparisonTable({ metrics }: ImpactComparisonTableProps) {
  return (
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
            <th scope="row" className="py-2 pr-3 font-medium text-slate-900 dark:text-slate-100">
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
            <th scope="row" className="py-2 pr-3 font-medium text-slate-900 dark:text-slate-100">
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
            <th scope="row" className="py-2 pr-3 font-medium text-[#1E4D3B] dark:text-emerald-300">
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
  );
}
