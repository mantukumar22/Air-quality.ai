'use client';

import { motion, useReducedMotion } from 'motion/react';
import { OpenWingBird } from '@/components/OpenWingBird';

function MovingHeroCloud({
  topClass,
  duration,
  delay,
  scaleClass = 'scale-100',
  opacityClass = 'opacity-85',
  reducedMotion,
  staticLeftClass,
}: {
  topClass: string;
  duration: number;
  delay: number;
  scaleClass?: string;
  opacityClass?: string;
  reducedMotion: boolean;
  staticLeftClass: string;
}) {
  const cloudShape = (
    <div className={`relative h-14 w-48 ${scaleClass} ${opacityClass}`}>
      <div className="absolute bottom-0 left-3 h-9 w-40 rounded-full bg-white/85 shadow-xs dark:bg-sky-100/15" />
      <div className="absolute bottom-3 left-7 h-11 w-14 rounded-full bg-white/90 dark:bg-sky-100/20" />
      <div className="absolute bottom-4 left-16 h-12 w-16 rounded-full bg-white/95 dark:bg-sky-100/20" />
      <div className="absolute bottom-2 right-5 h-9 w-12 rounded-full bg-white/85 dark:bg-sky-100/15" />
    </div>
  );

  if (reducedMotion) {
    return (
      <div
        className={`pointer-events-none absolute ${topClass} ${staticLeftClass}`}
        aria-hidden="true"
      >
        {cloudShape}
      </div>
    );
  }

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute ${topClass} left-0`}
      initial={{ x: '-260px' }}
      animate={{ x: '110vw' }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {cloudShape}
    </motion.div>
  );
}

function FlyingHeroBird({
  topClass,
  duration,
  delay,
  flapDuration,
  size,
  reducedMotion,
  staticLeftClass,
}: {
  topClass: string;
  duration: number;
  delay: number;
  flapDuration: number;
  size: 'sm' | 'md' | 'lg';
  reducedMotion: boolean;
  staticLeftClass: string;
}) {
  if (reducedMotion) {
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute ${topClass} ${staticLeftClass} text-sky-950/55 dark:text-sky-200/50`}
      >
        <OpenWingBird size={size} animated={false} />
      </div>
    );
  }

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute ${topClass} left-0 text-sky-950/55 dark:text-sky-200/50`}
      initial={{ x: '-80px', y: 0, rotate: -3 }}
      animate={{
        x: '108vw',
        y: [0, -10, 4, -8, 2, 0],
        rotate: [-3, 3, -2, 3, -3],
      }}
      transition={{
        x: { duration, delay, repeat: Infinity, ease: 'linear' },
        y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      <OpenWingBird size={size} animated flapDuration={flapDuration} flapDelay={delay * 0.2} />
    </motion.div>
  );
}

/**
 * Hero ambient sky layer with clouds gliding smoothly left-to-right
 * and open-winged birds soaring across the hero canvas.
 */
export function HeroSkyLayer() {
  const prefersReduced = Boolean(useReducedMotion());

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Left-to-right moving clouds */}
      <MovingHeroCloud
        topClass="top-4"
        duration={36}
        delay={0}
        scaleClass="scale-95"
        opacityClass="opacity-85"
        reducedMotion={prefersReduced}
        staticLeftClass="left-[6%]"
      />
      <MovingHeroCloud
        topClass="top-16"
        duration={48}
        delay={-18}
        scaleClass="scale-110"
        opacityClass="opacity-75"
        reducedMotion={prefersReduced}
        staticLeftClass="left-[42%]"
      />
      <MovingHeroCloud
        topClass="top-28"
        duration={56}
        delay={-32}
        scaleClass="scale-75"
        opacityClass="opacity-80"
        reducedMotion={prefersReduced}
        staticLeftClass="left-[74%]"
      />
      <MovingHeroCloud
        topClass="top-44"
        duration={42}
        delay={-9}
        scaleClass="scale-90"
        opacityClass="opacity-65"
        reducedMotion={prefersReduced}
        staticLeftClass="left-[20%]"
      />

      {/* Open-winged birds gliding across the hero sky */}
      <FlyingHeroBird
        topClass="top-9"
        duration={22}
        delay={0}
        flapDuration={0.95}
        size="lg"
        reducedMotion={prefersReduced}
        staticLeftClass="left-[26%]"
      />
      <FlyingHeroBird
        topClass="top-14"
        duration={22}
        delay={1.1}
        flapDuration={1.05}
        size="md"
        reducedMotion={prefersReduced}
        staticLeftClass="left-[31%]"
      />
      <FlyingHeroBird
        topClass="top-24"
        duration={28}
        delay={-11}
        flapDuration={1.15}
        size="md"
        reducedMotion={prefersReduced}
        staticLeftClass="left-[64%]"
      />
      <FlyingHeroBird
        topClass="top-7"
        duration={25}
        delay={-6}
        flapDuration={0.9}
        size="sm"
        reducedMotion={prefersReduced}
        staticLeftClass="left-[80%]"
      />
    </div>
  );
}
