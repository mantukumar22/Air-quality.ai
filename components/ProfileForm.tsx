/**
 * @fileoverview Household and lifestyle profile form with debounced city lookup,
 * runtime-validated select dropdowns, and accessible validation feedback.
 */

'use client';

import { Loader2, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ProfileSelectField, type SelectOption } from '@/components/profile/ProfileSelectField';
import { INPUT_LIMITS, UI_TIMING_MS } from '@/lib/constants';
import { sanitizeText } from '@/lib/sanitize';
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

export interface ProfileFormProps {
  profile: UserProfile;
  isGenerating: boolean;
  onProfileChange: (next: UserProfile) => void;
  onSubmitPlan: (profile: UserProfile) => void;
  onCityDebouncedChange?: (city: string) => void;
}

const HOUSEHOLD_OPTIONS: ReadonlyArray<{ id: HouseholdGroup; label: string }> = [
  { id: 'kids', label: 'Young children' },
  { id: 'elderly', label: 'Older adults (65+)' },
  { id: 'respiratory', label: 'Asthma / respiratory' },
  { id: 'pets', label: 'Indoor pets' },
];

const BUDGET_OPTIONS: ReadonlyArray<{ id: BudgetLevel; label: string; hint: string }> = [
  { id: 'low', label: 'Low', hint: 'Zero-cost & DIY' },
  { id: 'medium', label: 'Medium', hint: 'Filters & swaps' },
  { id: 'high', label: 'High', hint: 'Appliances & upgrades' },
];

const COMMUTE_OPTIONS: ReadonlyArray<SelectOption<CommuteMode>> = [
  { value: 'public_transit', label: 'Public transit (bus/metro)' },
  { value: 'walking_cycling', label: 'Walking or cycling' },
  { value: 'carpool', label: 'Carpool / rideshare' },
  { value: 'private_car', label: 'Private car / motorbike' },
  { value: 'remote', label: 'Work / study from home' },
];

const HOME_TYPE_OPTIONS: ReadonlyArray<SelectOption<HomeType>> = [
  { value: 'apartment', label: 'Apartment / flat' },
  { value: 'detached_house', label: 'Detached house' },
  { value: 'townhouse', label: 'Townhouse / duplex' },
  { value: 'shared_home', label: 'Shared / multi-family home' },
];

const VENTILATION_OPTIONS: ReadonlyArray<SelectOption<VentilationType>> = [
  { value: 'natural_windows', label: 'Natural window drafts' },
  { value: 'exhaust_fans', label: 'Kitchen / bath exhaust fans' },
  { value: 'hepa_purifier', label: 'Portable HEPA purifier' },
  { value: 'hvac_filtered', label: 'Central HVAC with filter' },
];

const HEATING_OPTIONS: ReadonlyArray<SelectOption<HeatingSource>> = [
  { value: 'electric', label: 'Electric / heat pump' },
  { value: 'natural_gas', label: 'Natural gas / boiler' },
  { value: 'wood_coal', label: 'Wood, coal, or solid fuel' },
  { value: 'district', label: 'District / central steam' },
  { value: 'none', label: 'No active heater' },
];

const COOKING_OPTIONS: ReadonlyArray<SelectOption<CookingFuel>> = [
  { value: 'induction', label: 'Induction cooktop' },
  { value: 'electric_coil', label: 'Standard electric stove' },
  { value: 'lpg_gas', label: 'LPG / piped natural gas' },
  { value: 'biomass_solid', label: 'Biomass, charcoal, or kerosene' },
];

/**
 * Household profile form with input sanitization, debounced city updates,
 * accessible `aria-describedby` field associations, and `>= 44px` touch targets.
 *
 * @param props - Controlled `UserProfile`, generation loading flag, and change/submit callbacks.
 * @returns Profile customization section.
 */
export function ProfileForm({
  profile,
  isGenerating,
  onProfileChange,
  onSubmitPlan,
  onCityDebouncedChange,
}: ProfileFormProps) {
  const [cityError, setCityError] = useState<string | null>(null);
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

    if (!onCityDebouncedChange) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const trimmed = value.trim();
    if (trimmed.length >= INPUT_LIMITS.cityDebounceMinLength) {
      debounceTimerRef.current = setTimeout(() => {
        onCityDebouncedChange(trimmed);
      }, UI_TIMING_MS.cityDebounceMs);
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
    const cleanedCity = sanitizeText(profile.city.trim(), INPUT_LIMITS.cityMaxLength);
    if (cleanedCity.length < INPUT_LIMITS.cityMinLength) {
      setCityError('Please enter a city or neighborhood name (at least 2 characters).');
      return;
    }

    setCityError(null);
    onSubmitPlan({
      ...profile,
      city: cleanedCity,
      householdGroups: profile.householdGroups.slice(0, INPUT_LIMITS.householdGroupsMax),
    });
  };

  return (
    <section
      id="profile-section"
      aria-labelledby="profile-heading"
      className="liquid-glass-card rounded-3xl p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-[#5846E5] shadow-xs dark:border-white/20 dark:bg-white/10 dark:text-indigo-300">
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="profile-heading" className="text-lg font-bold text-[#123D2B] dark:text-white">
            Household &amp; Lifestyle Profile
          </h2>
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Tailor routines, indoor air hacks, and budget-fit swaps.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
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
            autoComplete="off"
            value={profile.city}
            onChange={(e) => handleCityChange(e.target.value)}
            aria-describedby={cityError ? 'profile-city-error' : 'profile-city-hint'}
            aria-invalid={Boolean(cityError)}
            placeholder="e.g., New Delhi, Lahore, Beijing, Salt Lake City"
            className="liquid-input mt-1.5 min-h-[44px] w-full rounded-2xl px-4 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] dark:text-slate-100 dark:placeholder:text-slate-400"
          />
          {cityError ? (
            <p id="profile-city-error" className="mt-1 text-xs text-red-700 dark:text-red-400">
              {cityError}
            </p>
          ) : (
            <p id="profile-city-hint" className="mt-1 text-xs text-slate-600 dark:text-slate-300">
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
                  className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-2xl border px-3 py-2 text-sm transition-all ${
                    checked
                      ? 'border-[#5846E5]/60 bg-indigo-50/80 text-[#3730A3] font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] dark:border-indigo-400/50 dark:bg-indigo-950/60 dark:text-indigo-200'
                      : 'border-white/80 bg-white/65 text-slate-700 hover:bg-white/85 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:border-white/15 dark:bg-white/8 dark:text-slate-200 dark:hover:bg-white/14'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleHouseholdGroup(option.id)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#5846E5] focus:ring-[#5846E5]"
                  />
                  <span className="leading-snug">{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProfileSelectField
            id="profile-commute"
            label="Primary Commute"
            value={profile.commuteMode}
            options={COMMUTE_OPTIONS}
            onChange={(commuteMode) => onProfileChange({ ...profile, commuteMode })}
          />
          <ProfileSelectField
            id="profile-home-type"
            label="Home Type"
            value={profile.homeType}
            options={HOME_TYPE_OPTIONS}
            onChange={(homeType) => onProfileChange({ ...profile, homeType })}
          />
          <ProfileSelectField
            id="profile-ventilation"
            label="Current Ventilation"
            value={profile.ventilation}
            options={VENTILATION_OPTIONS}
            onChange={(ventilation) => onProfileChange({ ...profile, ventilation })}
          />
          <ProfileSelectField
            id="profile-heating"
            label="Winter Heating Source"
            value={profile.heatingSource}
            options={HEATING_OPTIONS}
            onChange={(heatingSource) => onProfileChange({ ...profile, heatingSource })}
          />
          <ProfileSelectField
            id="profile-cooking"
            label="Primary Cooking Fuel"
            value={profile.cookingFuel}
            options={COOKING_OPTIONS}
            wrapperClassName="sm:col-span-2"
            onChange={(cookingFuel) => onProfileChange({ ...profile, cookingFuel })}
          />
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
                  className={`flex min-h-[48px] flex-col items-start justify-center rounded-2xl border px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] ${
                    selected
                      ? 'liquid-tab-active font-semibold'
                      : 'liquid-btn-glass text-slate-800 dark:text-slate-200'
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
          className="liquid-btn-primary inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] focus-visible:ring-offset-2"
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
