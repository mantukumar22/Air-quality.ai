'use client';

import { motion } from 'motion/react';

interface OpenWingBirdProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  flapDuration?: number;
  flapDelay?: number;
  className?: string;
}

const SIZE_CLASSES: Record<
  NonNullable<OpenWingBirdProps['size']>,
  { wrapper: string; wing: string; body: string }
> = {
  sm: {
    wrapper: 'h-3.5 w-7',
    wing: 'h-2 w-3.5 border-t-[2px]',
    body: 'h-1 w-1.5',
  },
  md: {
    wrapper: 'h-4 w-9',
    wing: 'h-2.5 w-4.5 border-t-[2.5px]',
    body: 'h-1.5 w-2',
  },
  lg: {
    wrapper: 'h-5 w-11',
    wing: 'h-3 w-5.5 border-t-[3px]',
    body: 'h-1.5 w-2.5',
  },
};

/**
 * Pure-CSS open-winged flying bird silhouette with optional smooth wing-flapping animation.
 */
export function OpenWingBird({
  size = 'md',
  animated = true,
  flapDuration = 1.1,
  flapDelay = 0,
  className = '',
}: OpenWingBirdProps) {
  const dims = SIZE_CLASSES[size];

  if (!animated) {
    return (
      <div
        aria-hidden="true"
        className={`relative inline-flex items-center justify-center ${dims.wrapper} ${className}`}
      >
        <span
          className={`absolute left-0 top-0.5 rounded-tl-full rounded-tr-md border-current origin-right -rotate-12 ${dims.wing}`}
        />
        <span className={`rounded-full bg-current ${dims.body}`} />
        <span
          className={`absolute right-0 top-0.5 rounded-tr-full rounded-tl-md border-current origin-left rotate-12 ${dims.wing}`}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center ${dims.wrapper} ${className}`}
    >
      <motion.span
        className={`absolute left-0 top-0.5 rounded-tl-full rounded-tr-md border-current origin-right ${dims.wing}`}
        animate={{ rotate: [-22, 16, -22] }}
        transition={{
          duration: flapDuration,
          delay: flapDelay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <span className={`rounded-full bg-current ${dims.body}`} />
      <motion.span
        className={`absolute right-0 top-0.5 rounded-tr-full rounded-tl-md border-current origin-left ${dims.wing}`}
        animate={{ rotate: [22, -16, 22] }}
        transition={{
          duration: flapDuration,
          delay: flapDelay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}
