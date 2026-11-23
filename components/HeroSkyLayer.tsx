/**
 * @fileoverview Ambient hero sky backdrop layer rendering drifting clouds and
 * flying open-winged birds via pure CSS keyframe animations.
 */

'use client';

import { FlyingSkyBird, MovingSkyCloud } from '@/components/SkyMotionPrimitives';

/**
 * Renders the hero ambient sky layer with clouds gliding smoothly left-to-right
 * and open-winged birds soaring across the hero canvas.
 *
 * @returns Decorative hero sky overlay element.
 */
export function HeroSkyLayer() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Left-to-right moving clouds */}
      <MovingSkyCloud
        topClass="top-4"
        motionClass="animate-[airwise-cloud-drift_36s_linear_infinite] [animation-delay:-4s]"
        scaleClass="scale-95"
        opacityClass="opacity-85"
      />
      <MovingSkyCloud
        topClass="top-16"
        motionClass="animate-[airwise-cloud-drift_48s_linear_infinite] [animation-delay:-18s]"
        scaleClass="scale-110"
        opacityClass="opacity-75"
      />
      <MovingSkyCloud
        topClass="top-28"
        motionClass="animate-[airwise-cloud-drift_56s_linear_infinite] [animation-delay:-32s]"
        scaleClass="scale-75"
        opacityClass="opacity-80"
      />
      <MovingSkyCloud
        topClass="top-44"
        motionClass="animate-[airwise-cloud-drift_42s_linear_infinite] [animation-delay:-9s]"
        scaleClass="scale-90"
        opacityClass="opacity-65"
      />

      {/* Open-winged birds gliding across the hero sky */}
      <FlyingSkyBird
        topClass="top-9"
        motionClass="animate-[airwise-bird-glide_22s_linear_infinite] [animation-delay:-5s]"
        flapClass="[animation-duration:0.95s]"
        size="lg"
      />
      <FlyingSkyBird
        topClass="top-14"
        motionClass="animate-[airwise-bird-glide_22s_linear_infinite] [animation-delay:-3.8s]"
        flapClass="[animation-duration:1.05s]"
        size="md"
      />
      <FlyingSkyBird
        topClass="top-24"
        motionClass="animate-[airwise-bird-glide_28s_linear_infinite] [animation-delay:-11s]"
        flapClass="[animation-duration:1.15s]"
        size="md"
      />
      <FlyingSkyBird
        topClass="top-7"
        motionClass="animate-[airwise-bird-glide_25s_linear_infinite] [animation-delay:-16s]"
        flapClass="[animation-duration:0.9s]"
        size="sm"
      />
    </div>
  );
}
