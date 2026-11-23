/**
 * @fileoverview Presentational city AQI search bar with client-side minimum length
 * validation and accessible error association.
 */

'use client';

import { Loader2, MapPin, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { INPUT_LIMITS } from '@/lib/constants';

export interface AqiSearchFormProps {
  locationName: string;
  isLoading: boolean;
  hasMounted: boolean;
  onSearchCity: (city: string) => void;
}

/**
 * Renders the live city air-quality lookup bar or a matched-height placeholder during SSR.
 *
 * @param props - Active location label, loading state, mount flag, and submit handler.
 * @returns Search form component.
 */
export function AqiSearchForm({
  locationName,
  isLoading,
  hasMounted,
  onSearchCity,
}: AqiSearchFormProps) {
  const [cityQuery, setCityQuery] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  if (!hasMounted) {
    return <div className="liquid-glass-card-aqua h-[70px] rounded-3xl p-3" aria-hidden="true" />;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = cityQuery.trim();
    if (trimmed.length < INPUT_LIMITS.cityMinLength) {
      setInputError('Enter at least 2 characters to look up a city.');
      return;
    }
    setInputError(null);
    onSearchCity(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="liquid-glass-card-aqua rounded-3xl p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="hero-city-search" className="sr-only">
            Check live air quality by city
          </label>
          <MapPin
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E7C8D] dark:text-sky-300"
            aria-hidden="true"
          />
          <input
            id="hero-city-search"
            type="text"
            autoComplete="off"
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              if (inputError) setInputError(null);
            }}
            placeholder="Check live AQI for any city (e.g., New Delhi, Lahore, Beijing, Salt Lake City)"
            aria-describedby={inputError ? 'hero-city-error' : undefined}
            aria-invalid={Boolean(inputError)}
            className="liquid-input min-h-[46px] w-full rounded-full pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="hidden md:flex items-center gap-2 px-2 text-xs text-slate-700 dark:text-slate-200">
            <span>Monitoring:</span>
            <span className="font-semibold text-[#123D2B] dark:text-sky-200 max-w-[160px] truncate">
              {locationName}
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="liquid-btn-secondary inline-flex min-h-[46px] w-full sm:w-auto items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E7C8D] focus-visible:ring-offset-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Check Live AQI</span>
          </button>
        </div>
      </div>

      {inputError && (
        <p id="hero-city-error" className="mt-2 px-2 text-xs text-red-700 dark:text-red-400">
          {inputError}
        </p>
      )}
    </form>
  );
}
