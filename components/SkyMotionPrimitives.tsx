'use client';

import { OpenWingBird } from '@/components/OpenWingBird';

interface MovingSkyCloudProps {
  topClass: string;
  motionClass: string;
  scaleClass?: string;
  opacityClass?: string;
  softBlur?: boolean;
}

/**
 * Cumulus cloud that drifts smoothly left-to-right across the sky using pure CSS keyframes.
 */
export function MovingSkyCloud({
  topClass,
  motionClass,
  scaleClass = 'scale-100',
  opacityClass = 'opacity-85',
  softBlur = false,
}: MovingSkyCloudProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute left-0 ${topClass} ${motionClass}`}
    >
      <div className={`relative h-14 w-48 ${scaleClass} ${opacityClass}`}>
        <div
          className={`absolute bottom-0 left-3 h-9 w-40 rounded-full bg-white/85 shadow-xs dark:bg-sky-100/15 ${
            softBlur ? 'blur-[1px]' : ''
          }`}
        />
        <div className="absolute bottom-3 left-7 h-11 w-14 rounded-full bg-white/90 dark:bg-sky-100/20" />
        <div className="absolute bottom-4 left-16 h-12 w-16 rounded-full bg-white/95 dark:bg-sky-100/20" />
        <div className="absolute bottom-2 right-5 h-9 w-12 rounded-full bg-white/85 dark:bg-sky-100/15" />
      </div>
    </div>
  );
}

interface FlyingSkyBirdProps {
  topClass: string;
  motionClass: string;
  flapClass?: string;
  size: 'sm' | 'md' | 'lg';
  colorClass?: string;
}

/**
 * Open-winged bird gliding left-to-right across the sky using pure CSS keyframes.
 */
export function FlyingSkyBird({
  topClass,
  motionClass,
  flapClass = '',
  size,
  colorClass = 'text-sky-950/55 dark:text-sky-200/50',
}: FlyingSkyBirdProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute left-0 ${topClass} ${colorClass} ${motionClass}`}
    >
      <OpenWingBird size={size} animated flapClass={flapClass} />
    </div>
  );
}
