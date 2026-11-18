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
      {/* Card 1: Warm Sand — DIY Clean Air Room */}
      <article className="flex flex-col justify-between rounded-3xl border border-[#EFE1BE] bg-[#FBF0D9] p-6 dark:border-amber-900/40 dark:bg-[#1E1C15]">
        <div>
          <div className="flex items-center gap-2 text-[#9A3412] dark:text-[#FF8A4C]">
            <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold">Clean-Air Bedroom</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            Create one filtered sleep room for kids, elders, and asthma care—even on a tight
            budget.
          </p>
        </div>

        <div className="mt-4 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#E7D5AF] dark:border-amber-900/40">
          <SmartImage
            src={diyHepaRoomImg}
            alt="Cozy bedroom with quiet air purifier, indoor plants, and sealed window"
            sizes="(max-width: 1024px) 100vw, 33vw"
            className="h-full w-full object-cover"
          />
        </div>

        <a
          href="#action-plan"
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#C2410C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9A3412] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C]"
        >
          <span>View Indoor Hacks</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </article>

      {/* Card 2: Soft Mint-Sage — Core Winter Smog Habits */}
      <article className="flex flex-col justify-between rounded-3xl border border-[#D4E7CB] bg-[#EBF5E6] p-6 dark:border-emerald-900/40 dark:bg-[#132219]">
        <div>
          <div className="flex items-center gap-2 text-[#164A32] dark:text-emerald-300">
            <Leaf className="h-5 w-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold">Winter Smog Essentials</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            Four high-impact habits that immediately cut inhaled PM2.5 during inversion days.
          </p>

          <ul className="mt-5 space-y-3">
            {QUICK_HABITS.map((habit) => (
              <li
                key={habit}
                className="flex items-start gap-2.5 text-sm font-medium text-[#164A32] dark:text-emerald-100"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#164A32] text-white dark:bg-emerald-700">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                <span>{habit}</span>
              </li>
            ))}
          </ul>
        </div>

        <a
          href="#profile-section"
          className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#164A32] px-4 py-2 text-xs font-semibold text-white hover:bg-[#103826] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#164A32]"
        >
          <span>Tailor To My Home</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </article>

      {/* Card 3: Soft Sky-Mist — Indoor Sanctuary Showcase */}
      <article className="flex flex-col justify-between rounded-3xl border border-[#CBE2EC] bg-[#E5F2F8] p-6 dark:border-sky-900/40 dark:bg-[#132028]">
        <div>
          <div className="flex items-center gap-2 text-[#0F766E] dark:text-sky-300">
            <Home className="h-5 w-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold">Measure Your Impact</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            See estimated before-and-after exposure drops as you tick off daily household actions.
          </p>
        </div>

        <div className="mt-4 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#C1DCE8] dark:border-sky-900/40">
          <SmartImage
            src={indoorSanctuaryImg}
            alt="Sunlit living room with clean air purifier beside green outdoor trees"
            sizes="(max-width: 1024px) 100vw, 33vw"
            className="h-full w-full object-cover"
          />
        </div>

        <a
          href="#impact"
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#115E59] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
        >
          <span>See Impact Dashboard</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </article>
    </section>
  );
}
