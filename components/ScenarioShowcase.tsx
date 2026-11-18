'use client';

import { useState } from 'react';
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RecommendationFilterTab } from '@/components/RecommendationList';
import { SmartImage } from '@/components/SmartImage';
import cleanKitchenImg from '@/src/assets/images/clean_kitchen_exhaust_1794986285119.jpg';
import diyHepaRoomImg from '@/src/assets/images/diy_hepa_filter_room_1794986285578.jpg';
import indoorSanctuaryImg from '@/src/assets/images/indoor_sanctuary_living_1794986284632.jpg';
import winterMorningImg from '@/src/assets/images/winter_smog_morning_1794986284807.jpg';

interface ScenarioShowcaseProps {
  onSelectCategory: (tab: RecommendationFilterTab) => void;
}

const SCENARIO_CARDS: Array<{
  id: string;
  title: string;
  windowLabel: string;
  impactLabel: string;
  tab: RecommendationFilterTab;
  image: typeof winterMorningImg;
  alt: string;
}> = [
  {
    id: 'morning-inversion',
    title: 'Morning Inversion Guard',
    windowLabel: '6:00–10:30 AM',
    impactLabel: 'Est. -28% PM2.5',
    tab: 'routine',
    image: winterMorningImg,
    alt: 'Stylized urban apartment street during a calm winter morning mist with warm lit windows',
  },
  {
    id: 'indoor-sanctuary',
    title: 'Clean Indoor Air Room',
    windowLabel: 'Midday Flush',
    impactLabel: 'Est. -42% PM2.5',
    tab: 'indoor',
    image: indoorSanctuaryImg,
    alt: 'Sunlit modern living room with a white air purifier, indoor plants, and clean timber floors',
  },
  {
    id: 'low-emission-kitchen',
    title: 'Low-Emission Cooking',
    windowLabel: 'Every Meal',
    impactLabel: 'Est. -30% PM2.5',
    tab: 'sustainable',
    image: cleanKitchenImg,
    alt: 'Bright clean home kitchen with covered pot on induction stove, exhaust hood, and herbs',
  },
  {
    id: 'protected-sleep-zone',
    title: 'Protected Sleep Zone',
    windowLabel: 'Overnight',
    impactLabel: 'Est. -45% PM2.5',
    tab: 'vulnerable',
    image: diyHepaRoomImg,
    alt: 'Cozy bedroom nook with running air purifier, snake plant, peace lily, and sealed wood window',
  },
];

/**
 * Deep lush forest band showcasing the 4 illustrated winter-smog playbooks
 * with interactive prev/next spotlight controls matching the reference UI's dark canopy band.
 */
export function ScenarioShowcase({ onSelectCategory }: ScenarioShowcaseProps) {
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const handleCardSelect = (tab: RecommendationFilterTab) => {
    onSelectCategory(tab);
    const el = document.getElementById('action-plan');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleStep = (delta: number) => {
    setSpotlightIndex((prev) => (prev + delta + SCENARIO_CARDS.length) % SCENARIO_CARDS.length);
  };

  return (
    <section
      id="scenarios"
      aria-labelledby="scenarios-heading"
      className="rounded-3xl bg-[#164A32] px-4 py-8 text-white sm:px-8 sm:py-10 dark:bg-[#0F3323]"
    >
      <div className="text-center">
        <h2 id="scenarios-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Winter Smog Playbooks
        </h2>
        <p className="mt-1.5 text-sm text-emerald-100/90">
          Explore visual guides for the hours and rooms where exposure drops fastest.
        </p>
      </div>

      <div className="mt-7 flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          aria-label="Highlight previous playbook"
          className="hidden sm:inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#164A32] hover:bg-emerald-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SCENARIO_CARDS.map((card, idx) => {
            const isSpotlight = idx === spotlightIndex;
            return (
              <article
                key={card.id}
                className={`flex flex-col overflow-hidden rounded-2xl bg-white text-slate-900 transition-transform duration-150 ${
                  isSpotlight ? 'ring-2 ring-[#FF8A4C] -translate-y-0.5' : 'opacity-95 hover:opacity-100'
                } dark:bg-[#131F1B] dark:text-white`}
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#EFECE3] dark:bg-[#192822]">
                  <SmartImage
                    src={card.image}
                    alt={card.alt}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#164A32] dark:text-white">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      <span>{card.windowLabel}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono font-semibold text-[#C2410C] dark:text-[#FF8A4C] tabular-nums">
                        {card.impactLabel}
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSpotlightIndex(idx);
                      handleCardSelect(card.tab);
                    }}
                    className="mt-3 inline-flex min-h-[40px] w-full items-center justify-between rounded-xl bg-[#EBF5E6] px-3 py-1.5 text-xs font-semibold text-[#164A32] hover:bg-[#DCECD4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#164A32] dark:bg-[#192822] dark:text-emerald-200 dark:hover:bg-[#22362E]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      Open Actions
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => handleStep(1)}
          aria-label="Highlight next playbook"
          className="hidden sm:inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#164A32] hover:bg-emerald-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
