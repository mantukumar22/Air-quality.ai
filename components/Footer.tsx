'use client';

import { SmartImage } from '@/components/SmartImage';
import airwiseLogoImg from '@/src/assets/images/airwise_logo_mark_1794986660920.jpg';

/**
 * Clean semantic footer with brand emblem, attribution, and privacy note.
 */
export function Footer() {
  return (
    <footer className="mt-12 border-t border-[#E2E4DA] bg-white dark:border-emerald-900/40 dark:bg-[#131F1B]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          <span className="h-7 w-7 overflow-hidden rounded-lg border border-[#E2E4DA] bg-[#F7F6F0] shrink-0 dark:border-emerald-800/60">
            <SmartImage
              src={airwiseLogoImg}
              alt="AirWise logo"
              sizes="28px"
              className="h-full w-full object-cover scale-125"
            />
          </span>
          <p>
            AirWise · Urban Air Quality &amp; Winter Smog Assistant · Air quality measurements via
            Open-Meteo.
          </p>
        </div>
        <p>No personal location or profile data is stored on the server.</p>
      </div>
    </footer>
  );
}
