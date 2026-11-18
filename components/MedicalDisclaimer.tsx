import { ShieldAlert } from 'lucide-react';
import { MEDICAL_DISCLAIMER } from '@/lib/constants';

/**
 * Prominent medical & environmental safety disclaimer.
 */
export function MedicalDisclaimer() {
  return (
    <aside
      aria-label="Medical safety disclaimer"
      className="rounded-2xl border border-[#E2E4DA] bg-[#EFECE3]/70 px-4 py-3.5 text-xs leading-relaxed text-slate-700 dark:border-emerald-900/40 dark:bg-[#131F1B] dark:text-slate-300"
    >
      <div className="flex items-start gap-2.5">
        <ShieldAlert
          className="mt-0.5 h-4 w-4 shrink-0 text-[#1E4D3B] dark:text-emerald-300"
          aria-hidden="true"
        />
        <p>
          <span className="font-semibold text-[#1E4D3B] dark:text-white">
            Not Medical Advice:{' '}
          </span>
          {MEDICAL_DISCLAIMER}
        </p>
      </div>
    </aside>
  );
}
