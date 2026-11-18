'use client';

import { FlyingSkyBird, MovingSkyCloud } from '@/components/SkyMotionPrimitives';

/**
 * Full-page Earth sky backdrop with serene atmospheric gradient,
 * left-to-right drifting cumulus clouds, and flying open-winged birds.
 */
export function SkyBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-[#BFE4FA] via-[#DCF1FD] to-[#EEF8FE] dark:from-[#071526] dark:via-[#0D2238] dark:to-[#0A1829]"
    >
      {/* Subtle solar horizon glow */}
      <div className="absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-amber-100/45 blur-3xl dark:bg-sky-400/10" />

      {/* Left-to-right moving cumulus clouds across the full-page sky */}
      <MovingSkyCloud
        topClass="top-[14%]"
        motionClass="animate-[airwise-cloud-drift_52s_linear_infinite] [animation-delay:-6s]"
        scaleClass="scale-110"
        opacityClass="opacity-80"
        softBlur
      />
      <MovingSkyCloud
        topClass="top-[28%]"
        motionClass="animate-[airwise-cloud-drift_64s_linear_infinite] [animation-delay:-34s]"
        scaleClass="scale-95"
        opacityClass="opacity-70"
        softBlur
      />
      <MovingSkyCloud
        topClass="top-[52%]"
        motionClass="animate-[airwise-cloud-drift_70s_linear_infinite] [animation-delay:-14s]"
        scaleClass="scale-125"
        opacityClass="opacity-60"
        softBlur
      />
      <MovingSkyCloud
        topClass="top-[70%]"
        motionClass="animate-[airwise-cloud-drift_58s_linear_infinite] [animation-delay:-42s]"
        scaleClass="scale-100"
        opacityClass="opacity-65"
        softBlur
      />
      <MovingSkyCloud
        topClass="top-[85%]"
        motionClass="animate-[airwise-cloud-drift_62s_linear_infinite] [animation-delay:-24s]"
        scaleClass="scale-90"
        opacityClass="opacity-55"
        softBlur
      />

      {/* Open-winged birds flying smoothly across the full-page sky */}
      <FlyingSkyBird
        topClass="top-[22%]"
        motionClass="animate-[airwise-bird-glide_32s_linear_infinite] [animation-delay:-19s]"
        flapClass="[animation-duration:1.05s]"
        size="md"
        colorClass="text-sky-900/40 dark:text-sky-200/35"
      />
      <FlyingSkyBird
        topClass="top-[46%]"
        motionClass="animate-[airwise-bird-glide_38s_linear_infinite] [animation-delay:-8s]"
        flapClass="[animation-duration:0.95s]"
        size="sm"
        colorClass="text-sky-900/35 dark:text-sky-200/30"
      />
      <FlyingSkyBird
        topClass="top-[64%]"
        motionClass="animate-[airwise-bird-glide_34s_linear_infinite] [animation-delay:-24s]"
        flapClass="[animation-duration:1.1s]"
        size="md"
        colorClass="text-sky-900/35 dark:text-sky-200/30"
      />
      <FlyingSkyBird
        topClass="top-[79%]"
        motionClass="animate-[airwise-bird-glide_30s_linear_infinite] [animation-delay:-12s]"
        flapClass="[animation-duration:1.0s]"
        size="sm"
        colorClass="text-sky-900/30 dark:text-sky-200/25"
      />
    </div>
  );
}
