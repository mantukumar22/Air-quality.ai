/**
 * @fileoverview Six discovery and protection tiles in the hero section linking
 * directly to live AQI lookup, action tabs, and impact telemetry.
 */

'use client';

import {
  BarChart3,
  Clock,
  HeartHandshake,
  Home,
  Leaf,
  Search,
  type LucideIcon,
} from 'lucide-react';
import type { RecommendationFilterTab } from '@/types/airwise';

interface ActionTile {
  id: string;
  title: string;
  subtitle: string;
  bgClass: string;
  icon: LucideIcon;
  targetId: string;
  tab?: RecommendationFilterTab;
}

const ACTION_TILES: readonly ActionTile[] = [
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
] as const;

export interface ActionTileGridProps {
  hasMounted: boolean;
  onTileSelect: (targetId: string, tab?: RecommendationFilterTab) => void;
}

/**
 * Renders the 6 colorful Liquid Glass activity tiles below the hero headline,
 * switching cleanly between static SSR shells and interactive buttons after hydration.
 *
 * @param props - Hydration mount flag and tile selection callback.
 * @returns Discovery grid component.
 */
export function ActionTileGrid({ hasMounted, onTileSelect }: ActionTileGridProps) {
  return (
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
          const tileContent = (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/50 bg-white/22 shadow-[inset_0_1px_1px_rgba(255,255,255,0.65)]">
                <Icon className="h-6 w-6 text-white" aria-hidden="true" />
              </span>
              <span className="mt-3 block">
                <span className="block text-sm font-bold leading-tight">{tile.title}</span>
                <span className="mt-1 block text-xs leading-snug text-white/95">
                  {tile.subtitle}
                </span>
              </span>
            </>
          );

          if (!hasMounted) {
            return (
              <div
                key={tile.id}
                className={`liquid-tile flex min-h-[152px] flex-col items-center justify-between rounded-3xl p-4 text-center text-white ${tile.bgClass}`}
              >
                {tileContent}
              </div>
            );
          }

          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onTileSelect(tile.targetId, tile.tab)}
              className={`liquid-tile group flex min-h-[152px] flex-col items-center justify-between rounded-3xl p-4 text-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] focus-visible:ring-offset-2 ${tile.bgClass}`}
            >
              {tileContent}
            </button>
          );
        })}
      </div>
    </div>
  );
}
