/**
 * @fileoverview Hero section over the animated Earth sky layer composing the
 * headline/diorama, 6 activity tiles, city AQI search bar, and telemetry strip.
 */

'use client';

import { AlertTriangle, ArrowRight, Loader2, Moon, Navigation, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { ActionTileGrid } from '@/components/hero/ActionTileGrid';
import { AqiSearchForm } from '@/components/hero/AqiSearchForm';
import { AqiTelemetryGrid } from '@/components/hero/AqiTelemetryGrid';
import { HeroSkyLayer } from '@/components/HeroSkyLayer';
import { SmartImage } from '@/components/SmartImage';
import type { ThemeMode } from '@/hooks/useTheme';
import heroDioramaImg from '@/src/assets/images/hero_clean_air_diorama_1794986283905.jpg';
import type { AqiReading, RecommendationFilterTab } from '@/types/airwise';

export interface AqiHeroProps {
  aqi: AqiReading;
  isLoading: boolean;
  isLocating: boolean;
  error: string | null;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onSearchCity: (city: string) => void;
  onUseGeolocation: () => void;
  onSelectCategory: (tab: RecommendationFilterTab) => void;
}

function subscribeNoop(): () => void {
  return () => {};
}

function formatObservedTime(observedAt: string, hasMounted: boolean): string {
  if (!hasMounted) return 'Latest reading';
  try {
    const date = new Date(observedAt);
    if (Number.isNaN(date.getTime())) return 'Latest reading';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Latest reading';
  }
}

/**
 * Hero banner over the animated Earth sky layer with quick-jump discovery tiles
 * and live Open-Meteo AQI lookup & telemetry bar.
 *
 * @param props - Live AQI telemetry, loading/location flags, theme state, and action callbacks.
 * @returns Hero section element.
 */
export function AqiHero({
  aqi,
  isLoading,
  isLocating,
  error,
  theme,
  onToggleTheme,
  onSearchCity,
  onUseGeolocation,
  onSelectCategory,
}: AqiHeroProps) {
  const hasMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const handleTileSelect = (targetId: string, tab?: RecommendationFilterTab) => {
    if (tab) {
      onSelectCategory(tab);
    }
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const formattedTime = formatObservedTime(aqi.observedAt, hasMounted);

  return (
    <section
      id="overview"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-sky-200/70 bg-transparent dark:border-sky-900/40"
    >
      <HeroSkyLayer />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-8 pb-10 sm:px-6 lg:pt-10 lg:pb-12">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="text-center lg:col-span-6 lg:text-left">
            <h1
              id="hero-heading"
              className="text-4xl font-bold tracking-tight text-[#123D2B] dark:text-white sm:text-5xl [text-wrap:balance]"
            >
              Clean Air Every Day{' '}
              <span className="block text-[#C2410C] dark:text-[#FF8A4C]">For Every Family</span>
            </h1>
            <p className="mt-3.5 mx-auto lg:mx-0 max-w-xl text-base leading-relaxed text-slate-800 dark:text-slate-200">
              Navigate winter smog with live neighborhood air quality, budget-fit indoor air hacks,
              and hands-on daily protection for kids, elders, and sensitive lungs.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <a
                href="#profile-section"
                className="liquid-btn-primary inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] focus-visible:ring-offset-2"
              >
                <span>Start Your Air Plan</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>

              {hasMounted ? (
                <>
                  <button
                    type="button"
                    onClick={onUseGeolocation}
                    disabled={isLocating || isLoading}
                    className="liquid-btn-glass inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[#123D2B] disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] dark:text-sky-100"
                  >
                    {isLocating ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Navigation
                        className="h-4 w-4 text-[#5846E5] dark:text-sky-300"
                        aria-hidden="true"
                      />
                    )}
                    <span>Use My Location</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleTheme}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="liquid-btn-glass inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[#123D2B] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] dark:text-sky-100"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Moon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </>
              ) : (
                <>
                  <span
                    aria-hidden="true"
                    className="liquid-btn-glass inline-flex min-h-[44px] w-40 rounded-full opacity-80"
                  />
                  <span
                    aria-hidden="true"
                    className="liquid-btn-glass inline-flex min-h-[44px] min-w-[44px] rounded-full opacity-80"
                  />
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="liquid-glass-card aspect-[4/3] w-full overflow-hidden rounded-3xl p-2">
              <div className="h-full w-full overflow-hidden rounded-2xl">
                <SmartImage
                  src={heroDioramaImg}
                  alt="Illustrated clean-air neighborhood island with cozy homes, pine trees, solar panels, and a bicycle path"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        <ActionTileGrid hasMounted={hasMounted} onTileSelect={handleTileSelect} />

        <div id="live-aqi-bar" className="mt-10 space-y-4">
          <AqiSearchForm
            locationName={aqi.locationName}
            isLoading={isLoading}
            hasMounted={hasMounted}
            onSearchCity={onSearchCity}
          />

          {error && (
            <div
              role="status"
              aria-live="polite"
              className="liquid-glass-card-warm flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm text-amber-950 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div aria-live="polite" className="space-y-4">
            <AqiTelemetryGrid aqi={aqi} isLoading={isLoading} formattedTime={formattedTime} />
          </div>
        </div>
      </div>
    </section>
  );
}
