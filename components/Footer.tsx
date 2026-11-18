'use client';

import { SmartImage } from '@/components/SmartImage';
import airwiseLogoImg from '@/src/assets/images/airwise_logo_mark_1794986660920.jpg';

/**
 * Clean semantic footer with brand emblem, attribution, and privacy note.
 */
export function Footer() {
  return (
    <footer className="mt-12 border-t border-white/60 bg-white/55 backdrop-blur-xl dark:border-white/15 dark:bg-[#081728]/75">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:text-slate-300">
        <div className="flex items-center gap-2.5">
          <span className="h-7 w-7 overflow-hidden rounded-lg border border-white/80 bg-white/80 shadow-xs shrink-0 dark:border-white/20 dark:bg-white/10">
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
