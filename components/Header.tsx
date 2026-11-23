/**
 * @fileoverview Primary top navigation bar blended over the Earth sky canvas.
 */

'use client';

import { SmartImage } from '@/components/SmartImage';
import airwiseLogoImg from '@/src/assets/images/airwise_logo_mark_1794986660920.jpg';

const NAV_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '#overview', label: 'Overview' },
  { href: '#scenarios', label: 'Playbooks' },
  { href: '#action-plan', label: 'Action Plan' },
  { href: '#impact', label: 'Impact' },
  { href: '#community', label: 'Community' },
];

/**
 * Renders the top semantic `<header>` with brand logo, primary navigation links,
 * and a quick anchor CTA to the follow-up assistant.
 *
 * @returns Header navigation landmark.
 */
export function Header() {
  return (
    <header className="border-b border-white/60 bg-white/45 backdrop-blur-xl dark:border-white/15 dark:bg-[#081728]/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#123D2B] dark:text-sky-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] focus-visible:ring-offset-2 rounded-lg"
        >
          <span className="h-9 w-9 overflow-hidden rounded-xl border border-white/80 bg-white/80 shadow-xs shrink-0 dark:border-white/20 dark:bg-white/10">
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
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap shrink-0 hover:text-[#4533CD] dark:hover:text-sky-300 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] rounded px-1 py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="shrink-0">
          <a
            href="#assistant"
            className="liquid-btn-primary inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-sm font-semibold whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] focus-visible:ring-offset-2"
          >
            Ask Assistant
          </a>
        </div>
      </div>
    </header>
  );
}
