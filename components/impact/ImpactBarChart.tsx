/**
 * @fileoverview Reusable accessible SVG horizontal comparison bar chart shared by
 * PM2.5 exposure and household winter emission sections inside `ImpactDashboard`.
 */

'use client';

import { IMPACT_CONSTANTS } from '@/lib/constants';

export interface ImpactBarChartProps {
  title: string;
  ariaLabel: string;
  unitSuffix: string;
  baselineValue: number;
  activeValue: number;
  projectedValue: number;
}

function computeBarWidth(value: number, maxValue: number): number {
  const safeMax = Math.max(IMPACT_CONSTANTS.chartMinScale, maxValue);
  const pct = Math.max(IMPACT_CONSTANTS.chartMinBarWidthPct, Math.round((value / safeMax) * 100));
  return (pct / 100) * IMPACT_CONSTANTS.chartSvgBarMaxWidth;
}

/**
 * Renders a 3-bar accessible horizontal SVG chart comparing Before plan,
 * Checked today, and Full plan values.
 *
 * @param props - Chart heading, ARIA label, unit suffix, and comparison metrics.
 * @returns Accessible SVG chart block.
 */
export function ImpactBarChart({
  title,
  ariaLabel,
  unitSuffix,
  baselineValue,
  activeValue,
  projectedValue,
}: ImpactBarChartProps) {
  const baselineWidth = IMPACT_CONSTANTS.chartSvgBarMaxWidth;
  const activeWidth = computeBarWidth(activeValue, baselineValue);
  const projectedWidth = computeBarWidth(projectedValue, baselineValue);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">Lower is cleaner</span>
      </div>

      <svg
        role="img"
        aria-label={ariaLabel}
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
            width={baselineWidth}
            height="16"
            rx="4"
            className="fill-slate-400 dark:fill-slate-600"
          />
          <text
            x="412"
            y="18"
            className="font-mono font-semibold fill-slate-800 dark:fill-slate-200"
          >
            {baselineValue} {unitSuffix}
          </text>

          <text x="0" y="50">
            Checked today
          </text>
          <rect
            x="110"
            y="38"
            width={activeWidth}
            height="16"
            rx="4"
            className="fill-[#C9482B] dark:fill-[#FF8A6B]"
          />
          <text
            x="412"
            y="50"
            className="font-mono font-semibold fill-[#B23C22] dark:fill-[#FF8A6B]"
          >
            {activeValue} {unitSuffix}
          </text>

          <text x="0" y="82">
            With full plan
          </text>
          <rect
            x="110"
            y="70"
            width={projectedWidth}
            height="16"
            rx="4"
            className="fill-[#1E4D3B] dark:fill-emerald-500"
          />
          <text
            x="412"
            y="82"
            className="font-mono font-semibold fill-[#1E4D3B] dark:fill-emerald-300"
          >
            {projectedValue} {unitSuffix}
          </text>
        </g>
      </svg>
    </div>
  );
}
