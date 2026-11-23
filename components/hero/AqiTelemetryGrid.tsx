/**
 * @fileoverview Four-metric AQI telemetry card strip and health/winter-smog advisory bar.
 */

'use client';

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CloudFog,
  Flame,
  ShieldCheck,
  Siren,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { AqiIconName, AqiReading } from '@/types/airwise';

const AQI_ICON_MAP: Record<AqiIconName, LucideIcon> = {
  'shield-check': ShieldCheck,
  wind: Wind,
  'alert-triangle': AlertTriangle,
  'alert-octagon': AlertOctagon,
  flame: Flame,
  siren: Siren,
};

export interface AqiTelemetryGridProps {
  aqi: AqiReading;
  isLoading: boolean;
  formattedTime: string;
}

/**
 * Displays US AQI, PM2.5, PM10, and NO2 metric cards plus contextual winter-smog
 * health guidance, paired with color-blind-safe icons and numeric range labels.
 *
 * @param props - Live/fallback AQI telemetry, loading flag, and localized time string.
 * @returns Telemetry card grid and advisory summary panel.
 */
export function AqiTelemetryGrid({ aqi, isLoading, formattedTime }: AqiTelemetryGridProps) {
  if (isLoading) {
    return (
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse"
        aria-label="Loading air quality metrics"
      >
        <div className="liquid-glass-card h-24 rounded-3xl" />
        <div className="liquid-glass-card h-24 rounded-3xl" />
        <div className="liquid-glass-card h-24 rounded-3xl" />
        <div className="liquid-glass-card h-24 rounded-3xl" />
      </div>
    );
  }

  const CategoryIcon = AQI_ICON_MAP[aqi.category.icon];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className={`liquid-glass-card flex items-center gap-3.5 rounded-3xl p-4 ${aqi.category.borderClass}`}
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/85 shadow-xs dark:border-white/20 dark:bg-slate-900/70 ${aqi.category.textClass}`}
          >
            <CategoryIcon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {aqi.usAqi}{' '}
              <span className="text-xs font-sans font-medium text-slate-600 dark:text-slate-300">
                US AQI
              </span>
            </p>
            <p className={`text-xs font-semibold truncate ${aqi.category.textClass}`}>
              {aqi.category.label}
            </p>
          </div>
        </div>

        <div className="liquid-glass-card-mint flex items-center gap-3.5 rounded-3xl p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-[#164A32] shadow-xs dark:border-white/20 dark:bg-white/10 dark:text-emerald-300">
            <CloudFog className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {aqi.pm25}{' '}
              <span className="text-xs font-sans font-normal text-slate-600 dark:text-slate-300">
                µg/m³
              </span>
            </p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              PM2.5 Fine Dust
            </p>
          </div>
        </div>

        <div className="liquid-glass-card-aqua flex items-center gap-3.5 rounded-3xl p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-[#0E7C8D] shadow-xs dark:border-white/20 dark:bg-white/10 dark:text-teal-300">
            <Wind className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {aqi.pm10}{' '}
              <span className="text-xs font-sans font-normal text-slate-600 dark:text-slate-300">
                µg/m³
              </span>
            </p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              PM10 Coarse Dust
            </p>
          </div>
        </div>

        <div className="liquid-glass-card-iridescent flex items-center gap-3.5 rounded-3xl p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-[#5846E5] shadow-xs dark:border-white/20 dark:bg-white/10 dark:text-indigo-300">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {aqi.no2}{' '}
              <span className="text-xs font-sans font-normal text-slate-600 dark:text-slate-300">
                µg/m³
              </span>
            </p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              NO2 Exhaust Gas
            </p>
          </div>
        </div>
      </div>

      <div className="liquid-glass-card rounded-3xl px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-[#123D2B] dark:text-emerald-200">
            {aqi.locationName}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">Updated {formattedTime}</span>
          <span aria-hidden="true">·</span>
          <span>{aqi.isFallback ? 'Cached Baseline' : aqi.source}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{aqi.category.rangeLabel}</span>
        </div>
        <p className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
          {aqi.category.healthGuidance}
        </p>
        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
          Winter smog context: {aqi.category.winterSmogNote}
        </p>
      </div>
    </>
  );
}
