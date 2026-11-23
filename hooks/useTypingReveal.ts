/**
 * @fileoverview Shared reduced-motion-safe typing reveal hook eliminating duplicated
 * `setInterval` and `matchMedia('(prefers-reduced-motion: reduce)')` logic.
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { TYPING_REVEAL_CONFIG } from '@/lib/constants';

export interface UseTypingRevealOptions {
  chunkSizeChars?: number;
  intervalMs?: number;
}

export interface UseTypingRevealResult {
  startReveal: (fullText: string, onStep: (visibleSlice: string) => void) => void;
  stopReveal: () => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Progressively reveals instant answers in small character chunks while
 * showing the full text immediately when `prefers-reduced-motion` is enabled.
 *
 * @param options - Optional chunk size and interval duration overrides.
 * @returns `startReveal` and `stopReveal` controls with automatic unmount cleanup.
 */
export function useTypingReveal(options: UseTypingRevealOptions = {}): UseTypingRevealResult {
  const chunkSize = options.chunkSizeChars ?? TYPING_REVEAL_CONFIG.chatChunkSizeChars;
  const intervalMs = options.intervalMs ?? TYPING_REVEAL_CONFIG.intervalMs;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorRef = useRef<number>(0);

  const stopReveal = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => stopReveal, [stopReveal]);

  const startReveal = useCallback(
    (fullText: string, onStep: (visibleSlice: string) => void) => {
      stopReveal();

      if (prefersReducedMotion()) {
        onStep(fullText);
        return;
      }

      cursorRef.current = Math.min(chunkSize, fullText.length);
      onStep(fullText.slice(0, cursorRef.current));

      if (cursorRef.current >= fullText.length) {
        return;
      }

      timerRef.current = setInterval(() => {
        const nextCursor = Math.min(fullText.length, cursorRef.current + chunkSize);
        cursorRef.current = nextCursor;
        onStep(fullText.slice(0, nextCursor));
        if (nextCursor >= fullText.length) {
          stopReveal();
        }
      }, intervalMs);
    },
    [chunkSize, intervalMs, stopReveal]
  );

  return { startReveal, stopReveal };
}
