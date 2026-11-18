import Link from 'next/link';
import { ArrowLeft, Wind } from 'lucide-react';

/**
 * Accessible App Router 404 page matching the AirWise sky aesthetic.
 */
export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="liquid-glass-card-iridescent rounded-3xl p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-[#5846E5] shadow-xs dark:border-white/20 dark:bg-white/10 dark:text-indigo-300">
          <Wind className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[#123D2B] dark:text-white">Page Not Found</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          We could not find that AirWise route. Return to the main dashboard to check live air
          quality and your household smog plan.
        </p>
        <Link
          href="/"
          className="liquid-btn-primary mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to AirWise</span>
        </Link>
      </div>
    </main>
  );
}
