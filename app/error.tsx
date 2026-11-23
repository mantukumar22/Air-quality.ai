/**
 * @fileoverview Root App Router error boundary with automatic single-shot recovery
 * when a lazy webpack chunk times out or becomes stale after deployment.
 */

'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';
import { useEffect } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

function isChunkLoadError(error: Error): boolean {
  const text = `${error.name} ${error.message}`.toLowerCase();
  return (
    text.includes('chunkloaderror') ||
    text.includes('loading chunk') ||
    text.includes('failed to fetch dynamically imported module')
  );
}

/**
 * Root App Router error boundary with automatic single-shot recovery
 * for stale or timed-out Next.js chunks.
 *
 * @param props - Caught runtime error and Next.js reset callback.
 * @returns Accessible liquid-glass error fallback screen.
 */
export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    try {
      const alreadyReloaded = window.sessionStorage.getItem(STORAGE_KEYS.chunkReloadOnce);
      if (!alreadyReloaded) {
        window.sessionStorage.setItem(STORAGE_KEYS.chunkReloadOnce, '1');
        window.location.reload();
      }
    } catch {
      // Non-fatal: sessionStorage may be blocked in strict privacy contexts
    }
  }, [error]);

  const handleRetry = () => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEYS.chunkReloadOnce);
    } catch {
      // Non-fatal: ignore storage errors during retry cleanup
    }
    if (isChunkLoadError(error)) {
      window.location.reload();
      return;
    }
    reset();
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="liquid-glass-card-iridescent rounded-3xl p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-[#C2410C] shadow-xs dark:border-white/20 dark:bg-white/10 dark:text-[#FF8A4C]">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[#123D2B] dark:text-white">
          Unable to Load View
        </h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          {isChunkLoadError(error)
            ? 'A page script took too long to load or updated on the server. Reload to fetch the latest bundle.'
            : 'An unexpected error interrupted this screen. You can safely retry below.'}
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="liquid-btn-primary mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5]"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          <span>Reload AirWise</span>
        </button>
      </div>
    </main>
  );
}
