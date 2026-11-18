'use client';

import { ArrowRight, Check, Home, Leaf, ShieldCheck } from 'lucide-react';
import { SmartImage } from '@/components/SmartImage';
import indoorSanctuaryImg from '@/src/assets/images/indoor_sanctuary_living_1794986284632.jpg';
import diyHepaRoomImg from '@/src/assets/images/diy_hepa_filter_room_1794986285578.jpg';

const QUICK_HABITS = [
  'Seal street-facing drafts 6–10 AM',
  'Ventilate 15 min mid-afternoon',
  'Run DIY MERV-13 or HEPA filter',
  'Zero open leaf or trash burning',
];

/**
 * Three-column pastel bento band inspired by the reference UI's
 * Creative Games / Nature Lessons / Featured Showcase trio.
 */
export function FeatureTrio() {
  return (
    <section aria-label="AirWise quick highlights" className="grid gap-5 lg:grid-cols-3">
      {/* Card 1: Warm Liquid Glass — DIY Clean Air Room */}
      <article className="liquid-glass-card-warm flex flex-col justify-between rounded-3xl p-6">
        <div>
          <div className="flex items-center gap-2.5 text-[#9A3412] dark:text-[#FF8A4C]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/85 shadow-xs dark:border-white/20 dark:bg-white/10">
              <ShieldCheck className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-bold">Clean-Air Bedroom</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            Create one filtered sleep room for kids, elders, and asthma care—even on a tight budget.
          </p>
        </div>

        <div className="mt-4 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/80 shadow-xs dark:border-white/15">
          <SmartImage
            src={diyHepaRoomImg}
            alt="Cozy bedroom with quiet air purifier, indoor plants, and sealed window"
            sizes="(max-width: 1024px) 100vw, 33vw"
            className="h-full w-full object-cover"
          />
        </div>

        <a
          href="#action-plan"
          className="liquid-btn-coral mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C]"
        >
          <span>View Indoor Hacks</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </article>

      {/* Card 2: Mint Liquid Glass — Core Winter Smog Habits */}
      <article className="liquid-glass-card-mint flex flex-col justify-between rounded-3xl p-6">
        <div>
          <div className="flex items-center gap-2.5 text-[#123D2B] dark:text-emerald-300">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/85 shadow-xs dark:border-white/20 dark:bg-white/10">
              <Leaf className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-bold">Winter Smog Essentials</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            Four high-impact habits that immediately cut inhaled PM2.5 during inversion days.
          </p>

          <ul className="mt-5 space-y-3">
            {QUICK_HABITS.map((habit) => (
              <li
                key={habit}
                className="flex items-start gap-2.5 text-sm font-medium text-[#123D2B] dark:text-emerald-100"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5846E5] text-white shadow-xs">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                <span>{habit}</span>
              </li>
            ))}
          </ul>
        </div>

        <a
          href="#profile-section"
          className="liquid-btn-primary mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5]"
        >
          <span>Tailor To My Home</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </article>

      {/* Card 3: Aqua Liquid Glass — Indoor Sanctuary Showcase */}
      <article className="liquid-glass-card-aqua flex flex-col justify-between rounded-3xl p-6">
        <div>
          <div className="flex items-center gap-2.5 text-[#0E7C8D] dark:text-sky-300">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/85 shadow-xs dark:border-white/20 dark:bg-white/10">
              <Home className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-bold">Measure Your Impact</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            See estimated before-and-after exposure drops as you tick off daily household actions.
          </p>
        </div>

        <div className="mt-4 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/80 shadow-xs dark:border-white/15">
          <SmartImage
            src={indoorSanctuaryImg}
            alt="Sunlit living room with clean air purifier beside green outdoor trees"
            sizes="(max-width: 1024px) 100vw, 33vw"
            className="h-full w-full object-cover"
          />
        </div>

        <a
          href="#impact"
          className="liquid-btn-secondary mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E7C8D]"
        >
          <span>See Impact Dashboard</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </article>
    </section>
  );
}
