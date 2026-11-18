'use client';

import { OpenWingBird } from '@/components/OpenWingBird';

function CumulusCluster({
  className,
  scaleClass = 'scale-100',
}: {
  className: string;
  scaleClass?: string;
}) {
  return (
    <div className={`pointer-events-none absolute ${className} ${scaleClass}`} aria-hidden="true">
      <div className="relative h-14 w-44">
        <div className="absolute bottom-0 left-3 h-9 w-36 rounded-full bg-white/70 blur-[1px] dark:bg-sky-200/10" />
        <div className="absolute bottom-3 left-6 h-11 w-14 rounded-full bg-white/75 dark:bg-sky-200/12" />
        <div className="absolute bottom-4 left-14 h-12 w-16 rounded-full bg-white/80 dark:bg-sky-200/14" />
        <div className="absolute bottom-2 right-5 h-9 w-12 rounded-full bg-white/70 dark:bg-sky-200/10" />
      </div>
    </div>
  );
}

/**
 * Full-page Earth sky backdrop with serene atmospheric gradient,
 * gentle cumulus clouds, and open-winged soaring birds.
 */
export function SkyBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-[#BFE4FA] via-[#DCF1FD] to-[#EEF8FE] dark:from-[#071526] dark:via-[#0D2238] dark:to-[#0A1829]"
    >
      {/* Subtle solar horizon glow */}
      <div className="absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-amber-100/45 blur-3xl dark:bg-sky-400/10" />

      {/* Scattered calm cumulus clouds across the page sky */}
      <CumulusCluster className="top-[14%] left-[4%] opacity-85" scaleClass="scale-110" />
      <CumulusCluster className="top-[28%] right-[6%] opacity-75" scaleClass="scale-95" />
      <CumulusCluster className="top-[54%] left-[8%] opacity-65" scaleClass="scale-125" />
      <CumulusCluster className="top-[72%] right-[10%] opacity-70" scaleClass="scale-100" />
      <CumulusCluster className="bottom-[6%] left-[24%] opacity-60" scaleClass="scale-90" />

      {/* Distant calm open-wing soaring birds */}
      <div className="absolute top-[22%] right-[22%] text-sky-900/35 -rotate-6 dark:text-sky-200/25">
        <OpenWingBird size="md" animated={false} />
      </div>
      <div className="absolute top-[48%] left-[18%] text-sky-900/30 rotate-6 dark:text-sky-200/25">
        <OpenWingBird size="sm" animated={false} />
      </div>
      <div className="absolute top-[66%] right-[28%] text-sky-900/30 -rotate-3 dark:text-sky-200/25">
        <OpenWingBird size="md" animated={false} />
      </div>
    </div>
  );
}
