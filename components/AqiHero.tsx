'use client';

import { useState, useSyncExternalStore, type FormEvent } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock,
  CloudFog,
  Flame,
  HeartHandshake,
  Home,
  Leaf,
  Loader2,
  MapPin,
  Moon,
  Navigation,
  Search,
  ShieldCheck,
  Siren,
  Sun,
  Wind,
} from 'lucide-react';
import { HeroSkyLayer } from '@/components/HeroSkyLayer';
import type { RecommendationFilterTab } from '@/components/RecommendationList';
import { SmartImage } from '@/components/SmartImage';
import type { ThemeMode } from '@/hooks/useTheme';
import heroDioramaImg from '@/src/assets/images/hero_clean_air_diorama_1794986283905.jpg';
import type { AqiIconName, AqiReading } from '@/types/airwise';

interface AqiHeroProps {
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

function CategoryIcon({ icon, className }: { icon: AqiIconName; className?: string }) {
  switch (icon) {
    case 'shield-check':
      return <ShieldCheck className={className} aria-hidden="true" />;
    case 'wind':
      return <Wind className={className} aria-hidden="true" />;
    case 'alert-triangle':
      return <AlertTriangle className={className} aria-hidden="true" />;
    case 'alert-octagon':
      return <AlertOctagon className={className} aria-hidden="true" />;
    case 'flame':
      return <Flame className={className} aria-hidden="true" />;
    case 'siren':
      return <Siren className={className} aria-hidden="true" />;
  }
}

const ACTION_TILES: Array<{
  id: string;
  title: string;
  subtitle: string;
  bgClass: string;
  icon: typeof Wind;
  targetId: string;
  tab?: RecommendationFilterTab;
}> = [
  {
    id: 'tile-aqi',
    title: 'Explore AQI',
    subtitle: 'Check live PM2.5 & smog levels',
    bgClass: 'bg-gradient-to-b from-[#4F7D18]/92 via-[#3F6B12]/92 to-[#2F530B]/95',
    icon: Search,
    targetId: 'live-aqi-bar',
  },
  {
    id: 'tile-routine',
    title: 'Daily Timing',
    subtitle: 'Beat morning inversion peaks',
    bgClass: 'bg-gradient-to-b from-[#6B5DF6]/92 via-[#5846E5]/92 to-[#4533CD]/95',
    icon: Clock,
    targetId: 'action-plan',
    tab: 'routine',
  },
  {
    id: 'tile-indoor',
    title: 'Indoor Hacks',
    subtitle: 'DIY filters & humidity tips',
    bgClass: 'bg-gradient-to-b from-[#1698A8]/92 via-[#0E7C8D]/92 to-[#0B6473]/95',
    icon: Home,
    targetId: 'action-plan',
    tab: 'indoor',
  },
  {
    id: 'tile-swaps',
    title: 'Clean Swaps',
    subtitle: 'Low-smoke cooking & travel',
    bgClass: 'bg-gradient-to-b from-[#C76512]/92 via-[#B45309]/92 to-[#92400E]/95',
    icon: Leaf,
    targetId: 'action-plan',
    tab: 'sustainable',
  },
  {
    id: 'tile-protect',
    title: 'Family Care',
    subtitle: 'Kids, seniors & asthma safety',
    bgClass: 'bg-gradient-to-b from-[#0E8F64]/92 via-[#047857]/92 to-[#065F46]/95',
    icon: HeartHandshake,
    targetId: 'action-plan',
    tab: 'vulnerable',
  },
  {
    id: 'tile-impact',
    title: 'Impact Check',
    subtitle: 'Compare before vs. after',
    bgClass: 'bg-gradient-to-b from-[#D85327]/92 via-[#C2410C]/92 to-[#9A3412]/95',
    icon: BarChart3,
    targetId: 'impact',
  },
];

function subscribeNoop(): () => void {
  return () => {};
}

/**
 * Hero banner over the animated Earth sky layer (left-to-right moving clouds and flying birds)
 * with 6 activity tiles and live Open-Meteo AQI lookup & telemetry bar.
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
  const [cityQuery, setCityQuery] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const hasMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = cityQuery.trim();
    if (trimmed.length < 2) {
      setInputError('Enter at least 2 characters to look up a city.');
      return;
    }
    setInputError(null);
    onSearchCity(trimmed);
  };

  const handleTileClick = (targetId: string, tab?: RecommendationFilterTab) => {
    if (tab) {
      onSelectCategory(tab);
    }
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const formattedTime = (() => {
    if (!hasMounted) return 'Latest reading';
    try {
      const date = new Date(aqi.observedAt);
      if (Number.isNaN(date.getTime())) return 'Latest reading';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Latest reading';
    }
  })();

  return (
    <section
      id="overview"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-sky-200/70 bg-transparent dark:border-sky-900/40"
    >
      {/* Moving clouds (left-to-right) & flying birds across the hero sky */}
      <HeroSkyLayer />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-8 pb-10 sm:px-6 lg:pt-10 lg:pb-12">
        {/* Centered illustrated hero statement + panoramic diorama */}
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

        {/* 6 Colorful Discovery & Protection Tiles */}
        <div className="mt-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#123D2B] dark:text-white">
              Monitor, Protect &amp; Breathe Better
            </h2>
            <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
              Jump directly into the habits, filters, and impact tools built for your home.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
            {ACTION_TILES.map((tile) => {
              const Icon = tile.icon;
              if (!hasMounted) {
                return (
                  <div
                    key={tile.id}
                    className={`liquid-tile flex min-h-[152px] flex-col items-center justify-between rounded-3xl p-4 text-center text-white ${tile.bgClass}`}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/50 bg-white/22 shadow-[inset_0_1px_1px_rgba(255,255,255,0.65)]">
                      <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>
                    <span className="mt-3 block">
                      <span className="block text-sm font-bold leading-tight">{tile.title}</span>
                      <span className="mt-1 block text-xs leading-snug text-white/95">
                        {tile.subtitle}
                      </span>
                    </span>
                  </div>
                );
              }
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleTileClick(tile.targetId, tile.tab)}
                  className={`liquid-tile group flex min-h-[152px] flex-col items-center justify-between rounded-3xl p-4 text-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] focus-visible:ring-offset-2 ${tile.bgClass}`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/50 bg-white/22 shadow-[inset_0_1px_1px_rgba(255,255,255,0.65)]">
                    <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </span>
                  <span className="mt-3 block">
                    <span className="block text-sm font-bold leading-tight">{tile.title}</span>
                    <span className="mt-1 block text-xs leading-snug text-white/95">
                      {tile.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live AQI Search & 4-Metric Telemetry Bar */}
        <div id="live-aqi-bar" className="mt-10 space-y-4">
          {hasMounted ? (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="liquid-glass-card-aqua rounded-3xl p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <label htmlFor="hero-city-search" className="sr-only">
                    Check live air quality by city
                  </label>
                  <MapPin
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E7C8D] dark:text-sky-300"
                    aria-hidden="true"
                  />
                  <input
                    id="hero-city-search"
                    type="text"
                    autoComplete="off"
                    value={cityQuery}
                    onChange={(e) => {
                      setCityQuery(e.target.value);
                      if (inputError) setInputError(null);
                    }}
                    placeholder="Check live AQI for any city (e.g., New Delhi, Lahore, Beijing, Salt Lake City)"
                    aria-describedby={inputError ? 'hero-city-error' : undefined}
                    aria-invalid={Boolean(inputError)}
                    className="liquid-input min-h-[46px] w-full rounded-full pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] dark:text-slate-100 dark:placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="hidden md:flex items-center gap-2 px-2 text-xs text-slate-700 dark:text-slate-200">
                    <span>Monitoring:</span>
                    <span className="font-semibold text-[#123D2B] dark:text-sky-200 max-w-[160px] truncate">
                      {aqi.locationName}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="liquid-btn-secondary inline-flex min-h-[46px] w-full sm:w-auto items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E7C8D] focus-visible:ring-offset-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Search className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>Check Live AQI</span>
                  </button>
                </div>
              </div>

              {inputError && (
                <p
                  id="hero-city-error"
                  className="mt-2 px-2 text-xs text-red-700 dark:text-red-400"
                >
                  {inputError}
                </p>
              )}
            </form>
          ) : (
            <div className="liquid-glass-card-aqua h-[70px] rounded-3xl p-3" aria-hidden="true" />
          )}

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
            {isLoading ? (
              <div
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse"
                aria-label="Loading air quality metrics"
              >
                <div className="liquid-glass-card h-24 rounded-3xl" />
                <div className="liquid-glass-card h-24 rounded-3xl" />
                <div className="liquid-glass-card h-24 rounded-3xl" />
                <div className="liquid-glass-card h-24 rounded-3xl" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div
                    className={`liquid-glass-card flex items-center gap-3.5 rounded-3xl p-4 ${aqi.category.borderClass}`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/85 shadow-xs dark:border-white/20 dark:bg-slate-900/70 ${aqi.category.textClass}`}
                    >
                      <CategoryIcon icon={aqi.category.icon} className="h-6 w-6" />
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
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
