'use client';

import { SmartImage } from '@/components/SmartImage';
import airwiseLogoImg from '@/src/assets/images/airwise_logo_mark_1794986660920.jpg';

/**
 * Primary top navigation blended cleanly with the Earth sky backdrop.
 */
export function Header() {
  return (
    <header className="border-b border-sky-200/80 bg-[#D9EFFD]/75 backdrop-blur-md dark:border-sky-900/40 dark:bg-[#081728]/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#164A32] dark:text-sky-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#164A32] focus-visible:ring-offset-2 rounded-lg"
        >
          <span className="h-9 w-9 overflow-hidden rounded-xl border border-sky-200 bg-[#F7F6F0] shrink-0 dark:border-sky-800/60">
            <SmartImage
              src={airwiseLogoImg}
              alt="AirWise logo"
              priority
              sizes="36px"
              className="h-full w-full object-cover scale-125"
            />
          </span>
          <span>AirWise</span>
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-800 dark:text-slate-200"
        >
          <a
            href="#overview"
            className="whitespace-nowrap shrink-0 hover:text-[#164A32] dark:hover:text-sky-300 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#164A32] rounded px-1 py-1"
          >
            Overview
          </a>
          <a
            href="#scenarios"
            className="whitespace-nowrap shrink-0 hover:text-[#164A32] dark:hover:text-sky-300 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#164A32] rounded px-1 py-1"
          >
            Playbooks
          </a>
          <a
            href="#action-plan"
            className="whitespace-nowrap shrink-0 hover:text-[#164A32] dark:hover:text-sky-300 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#164A32] rounded px-1 py-1"
          >
            Action Plan
          </a>
          <a
            href="#impact"
            className="whitespace-nowrap shrink-0 hover:text-[#164A32] dark:hover:text-sky-300 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#164A32] rounded px-1 py-1"
          >
            Impact
          </a>
          <a
            href="#community"
            className="whitespace-nowrap shrink-0 hover:text-[#164A32] dark:hover:text-sky-300 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#164A32] rounded px-1 py-1"
          >
            Community
          </a>
        </nav>

        <div className="shrink-0">
          <a
            href="#assistant"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#C2410C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#9A3412] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C] focus-visible:ring-offset-2 dark:bg-[#D95B26] dark:hover:bg-[#C2410C]"
          >
            Ask Assistant
          </a>
        </div>
      </div>
    </header>
  );
}
