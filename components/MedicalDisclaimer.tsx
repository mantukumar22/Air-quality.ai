/**
 * @fileoverview Non-medical-advice informational disclaimer banner rendered as a Server Component.
 */

import { ShieldAlert } from 'lucide-react';
import { MEDICAL_DISCLAIMER } from '@/lib/constants';

/**
 * Prominent medical & environmental safety disclaimer.
 *
 * @returns Accessible `<aside>` banner noting guidance is not medical advice.
 */
export function MedicalDisclaimer() {
  return (
    <aside
      aria-label="Medical safety disclaimer"
      className="liquid-glass-card rounded-2xl px-4 py-3.5 text-xs leading-relaxed text-slate-800 dark:text-slate-200"
    >
      <div className="flex items-start gap-2.5">
        <ShieldAlert
          className="mt-0.5 h-4 w-4 shrink-0 text-[#123D2B] dark:text-emerald-300"
          aria-hidden="true"
        />
        <p>
          <span className="font-semibold text-[#123D2B] dark:text-white">Not Medical Advice: </span>
          {MEDICAL_DISCLAIMER}
        </p>
      </div>
    </aside>
  );
}
