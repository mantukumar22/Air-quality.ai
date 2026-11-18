'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { userProfileSchema } from '@/lib/schemas';
import type {
  BudgetLevel,
  CommuteMode,
  CookingFuel,
  HeatingSource,
  HomeType,
  HouseholdGroup,
  UserProfile,
  VentilationType,
} from '@/types/airwise';

interface ProfileFormProps {
  profile: UserProfile;
  isGenerating: boolean;
  onProfileChange: (next: UserProfile) => void;
  onSubmitPlan: (profile: UserProfile) => void;
  onCityDebouncedChange?: (city: string) => void;
}

const HOUSEHOLD_OPTIONS: Array<{ id: HouseholdGroup; label: string }> = [
  { id: 'kids', label: 'Young children' },
  { id: 'elderly', label: 'Older adults (65+)' },
  { id: 'respiratory', label: 'Asthma / respiratory' },
  { id: 'pets', label: 'Indoor pets' },
];

const BUDGET_OPTIONS: Array<{ id: BudgetLevel; label: string; hint: string }> = [
  { id: 'low', label: 'Low', hint: 'Zero-cost & DIY' },
  { id: 'medium', label: 'Medium', hint: 'Filters & swaps' },
  { id: 'high', label: 'High', hint: 'Appliances & upgrades' },
];

/**
 * Household profile form with Zod validation, debounced city input,
 * accessible field associations (aria-describedby), and >=44px touch targets.
 */
export function ProfileForm({
  profile,
  isGenerating,
  onProfileChange,
  onSubmitPlan,
  onCityDebouncedChange,
}: ProfileFormProps) {
  const [cityError, setCityError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleCityChange = (value: string) => {
    onProfileChange({ ...profile, city: value });
    if (cityError) setCityError(null);

    if (onCityDebouncedChange) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      const trimmed = value.trim();
      if (trimmed.length >= 3) {
        debounceTimerRef.current = setTimeout(() => {
          onCityDebouncedChange(trimmed);
        }, 650);
      }
    }
  };

  const toggleHouseholdGroup = (group: HouseholdGroup) => {
    const exists = profile.householdGroups.includes(group);
    const nextGroups = exists
      ? profile.householdGroups.filter((g) => g !== group)
      : [...profile.householdGroups, group];
    onProfileChange({ ...profile, householdGroups: nextGroups });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = userProfileSchema.safeParse(profile);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      if (firstIssue?.path.includes('city')) {
        setCityError(firstIssue.message);
      } else {
        setFormError(firstIssue?.message ?? 'Please review your profile inputs.');
      }
      return;
    }

    setCityError(null);
    setFormError(null);
    onSubmitPlan(parsed.data);
  };

  return (
    <section
      id="profile-section"
      aria-labelledby="profile-heading"
      className="rounded-2xl border border-[#E2E4DA] bg-white p-5 sm:p-6 dark:border-emerald-900/40 dark:bg-[#131F1B]"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFECE3] text-[#1E4D3B] dark:bg-[#192822] dark:text-emerald-300">
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2
            id="profile-heading"
            className="text-lg font-bold text-[#1E4D3B] dark:text-white"
          >
            Household &amp; Lifestyle Profile
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Tailor routines, indoor air hacks, and budget-fit swaps.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
          >
            {formError}
          </div>
        )}

        <div>
          <label
            htmlFor="profile-city"
            className="block text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            City or Neighborhood
          </label>
          <input
            id="profile-city"
            name="city"
            type="text"
            value={profile.city}
            onChange={(e) => handleCityChange(e.target.value)}
            aria-describedby={cityError ? 'profile-city-error' : 'profile-city-hint'}
            aria-invalid={Boolean(cityError)}
            placeholder="e.g., New Delhi, Lahore, Beijing, Salt Lake City"
            className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#D4D8CB] bg-[#FAF9F5] px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3B] dark:border-emerald-900/50 dark:bg-[#0D1512] dark:text-slate-100"
          />
          {cityError ? (
            <p id="profile-city-error" className="mt-1 text-xs text-red-700 dark:text-red-400">
              {cityError}
            </p>
          ) : (
            <p id="profile-city-hint" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Location stays in your browser unless submitted for live AQI or plan generation.
            </p>
          )}
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Household Members &amp; Sensitivities
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {HOUSEHOLD_OPTIONS.map((option) => {
              const checked = profile.householdGroups.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    checked
                      ? 'border-[#1E4D3B] bg-[#EEF4F0] text-[#1E4D3B] font-medium dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200'
                      : 'border-[#E2E4DA] bg-[#FAF9F5] text-slate-700 hover:bg-[#EFECE3] dark:border-emerald-900/40 dark:bg-[#0D1512] dark:text-slate-300 dark:hover:bg-[#192822]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleHouseholdGroup(option.id)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#1E4D3B] focus:ring-[#1E4D3B]"
                  />
                  <span className="leading-snug">{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="profile-commute"
              className="block text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              Primary Commute
            </label>
            <select
              id="profile-commute"
              value={profile.commuteMode}
              onChange={(e) =>
                onProfileChange({ ...profile, commuteMode: e.target.value as CommuteMode })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#D4D8CB] bg-[#FAF9F5] px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3B] dark:border-emerald-900/50 dark:bg-[#0D1512] dark:text-slate-100"
            >
              <option value="public_transit">Public transit (bus/metro)</option>
              <option value="walking_cycling">Walking or cycling</option>
              <option value="carpool">Carpool / rideshare</option>
              <option value="private_car">Private car / motorbike</option>
              <option value="remote">Work / study from home</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="profile-home-type"
              className="block text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              Home Type
            </label>
            <select
              id="profile-home-type"
              value={profile.homeType}
              onChange={(e) =>
                onProfileChange({ ...profile, homeType: e.target.value as HomeType })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#D4D8CB] bg-[#FAF9F5] px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3B] dark:border-emerald-900/50 dark:bg-[#0D1512] dark:text-slate-100"
            >
              <option value="apartment">Apartment / flat</option>
              <option value="detached_house">Detached house</option>
              <option value="townhouse">Townhouse / duplex</option>
              <option value="shared_home">Shared / multi-family home</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="profile-ventilation"
              className="block text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              Current Ventilation
            </label>
            <select
              id="profile-ventilation"
              value={profile.ventilation}
              onChange={(e) =>
                onProfileChange({ ...profile, ventilation: e.target.value as VentilationType })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#D4D8CB] bg-[#FAF9F5] px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3B] dark:border-emerald-900/50 dark:bg-[#0D1512] dark:text-slate-100"
            >
              <option value="natural_windows">Natural window drafts</option>
              <option value="exhaust_fans">Kitchen / bath exhaust fans</option>
              <option value="hepa_purifier">Portable HEPA purifier</option>
              <option value="hvac_filtered">Central HVAC with filter</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="profile-heating"
              className="block text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              Winter Heating Source
            </label>
            <select
              id="profile-heating"
              value={profile.heatingSource}
              onChange={(e) =>
                onProfileChange({ ...profile, heatingSource: e.target.value as HeatingSource })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#D4D8CB] bg-[#FAF9F5] px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3B] dark:border-emerald-900/50 dark:bg-[#0D1512] dark:text-slate-100"
            >
              <option value="electric">Electric / heat pump</option>
              <option value="natural_gas">Natural gas / boiler</option>
              <option value="wood_coal">Wood, coal, or solid fuel</option>
              <option value="district">District / central steam</option>
              <option value="none">No active heater</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="profile-cooking"
              className="block text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              Primary Cooking Fuel
            </label>
            <select
              id="profile-cooking"
              value={profile.cookingFuel}
              onChange={(e) =>
                onProfileChange({ ...profile, cookingFuel: e.target.value as CookingFuel })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#D4D8CB] bg-[#FAF9F5] px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3B] dark:border-emerald-900/50 dark:bg-[#0D1512] dark:text-slate-100"
            >
              <option value="induction">Induction cooktop</option>
              <option value="electric_coil">Standard electric stove</option>
              <option value="lpg_gas">LPG / piped natural gas</option>
              <option value="biomass_solid">Biomass, charcoal, or kerosene</option>
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Available Budget for Air Improvements
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {BUDGET_OPTIONS.map((opt) => {
              const selected = profile.budget === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onProfileChange({ ...profile, budget: opt.id })}
                  className={`flex min-h-[48px] flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3B] ${
                    selected
                      ? 'border-[#1E4D3B] bg-[#EEF4F0] text-[#1E4D3B] dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200'
                      : 'border-[#E2E4DA] bg-[#FAF9F5] text-slate-700 hover:bg-[#EFECE3] dark:border-emerald-900/40 dark:bg-[#0D1512] dark:text-slate-300 dark:hover:bg-[#192822]'
                  }`}
                >
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="text-xs opacity-80">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isGenerating}
          aria-busy={isGenerating}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#C9482B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B23C22] disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9482B] focus-visible:ring-offset-2 dark:bg-[#D95B3D] dark:hover:bg-[#C9482B]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Building Tailored Plan...</span>
            </>
          ) : (
            <span>Generate Tailored Action Plan</span>
          )}
        </button>
      </form>
    </section>
  );
}
