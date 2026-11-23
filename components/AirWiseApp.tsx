/**
 * @fileoverview Root interactive AirWise workspace orchestrating live AQI telemetry,
 * household profile customization, tailored recommendations, impact tracking, and Q&A.
 */

'use client';

import { ArrowUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { AqiHero } from '@/components/AqiHero';
import { FeatureTrio } from '@/components/FeatureTrio';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { ProfileForm } from '@/components/ProfileForm';
import { RecommendationList } from '@/components/RecommendationList';
import { ScenarioShowcase } from '@/components/ScenarioShowcase';
import { SkyBackdrop } from '@/components/SkyBackdrop';
import { useAqi, useChecklist, useRecommendations, useTheme } from '@/hooks';
import { DEFAULT_PROFILE, calculateImpactMetrics, getFallbackAqiReading } from '@/lib';
import type { RecommendationFilterTab, UserProfile } from '@/types/airwise';

const ImpactDashboard = dynamic(
  () => import('@/components/ImpactDashboard').then((m) => m.ImpactDashboard),
  {
    ssr: false,
    loading: () => (
      <div
        aria-label="Loading impact dashboard"
        className="liquid-glass-card-aqua h-80 rounded-3xl p-6 animate-pulse"
      />
    ),
  }
);

const CommunitySection = dynamic(
  () => import('@/components/CommunitySection').then((m) => m.CommunitySection),
  {
    ssr: false,
    loading: () => (
      <div
        aria-label="Loading community section"
        className="liquid-glass-band-emerald h-64 rounded-3xl p-6 animate-pulse"
      />
    ),
  }
);

const ChatPanel = dynamic(() => import('@/components/ChatPanel').then((m) => m.ChatPanel), {
  ssr: false,
  loading: () => (
    <div
      aria-label="Loading assistant panel"
      className="liquid-glass-card h-72 rounded-3xl p-6 animate-pulse"
    />
  ),
});

function subscribeNoop(): () => void {
  return () => {};
}

/**
 * Main interactive AirWise workspace coordinating hooks, code-split panels,
 * and alternating sky/forest/pastel visual bands.
 *
 * @returns Full interactive client workspace wrapped around `<main>`.
 */
export function AirWiseApp() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [activeTab, setActiveTab] = useState<RecommendationFilterTab>('all');
  const initialFallbackAqi = useMemo(() => getFallbackAqiReading(DEFAULT_PROFILE.city), []);
  const hasMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const { theme, toggleTheme } = useTheme();
  const {
    aqi,
    isLoading: isAqiLoading,
    isLocating,
    error: aqiError,
    fetchByCity,
    fetchByGeolocation,
  } = useAqi(DEFAULT_PROFILE.city);

  const {
    plan,
    isGenerating,
    error: planError,
    generatePlan,
  } = useRecommendations(DEFAULT_PROFILE, initialFallbackAqi);

  const { checkedIds, toggleItem, resetChecklist } = useChecklist();

  const handleHeroCitySearch = useCallback(
    async (city: string) => {
      setProfile((prev) => ({ ...prev, city }));
      await fetchByCity(city);
    },
    [fetchByCity]
  );

  const handleUseGeolocation = useCallback(async () => {
    const reading = await fetchByGeolocation();
    if (reading) {
      setProfile((prev) => ({
        ...prev,
        city: reading.locationName,
        latitude: reading.latitude,
        longitude: reading.longitude,
      }));
    }
  }, [fetchByGeolocation]);

  const handleSubmitProfile = useCallback(
    async (submittedProfile: UserProfile) => {
      setProfile(submittedProfile);
      const latestAqi =
        submittedProfile.city.toLowerCase() !== aqi.locationName.toLowerCase()
          ? ((await fetchByCity(submittedProfile.city)) ?? aqi)
          : aqi;
      await generatePlan(submittedProfile, latestAqi);
    },
    [aqi, fetchByCity, generatePlan]
  );

  const impactMetrics = useMemo(
    () => calculateImpactMetrics(profile, aqi, plan, checkedIds),
    [profile, aqi, plan, checkedIds]
  );

  return (
    <div id="top" className="relative">
      <SkyBackdrop />
      <AqiHero
        aqi={aqi}
        isLoading={isAqiLoading}
        isLocating={isLocating}
        error={aqiError}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSearchCity={handleHeroCitySearch}
        onUseGeolocation={handleUseGeolocation}
        onSelectCategory={setActiveTab}
      />

      <main id="main-content" className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        {hasMounted ? (
          <ScenarioShowcase onSelectCategory={setActiveTab} />
        ) : (
          <section
            id="scenarios"
            aria-hidden="true"
            className="liquid-glass-band-emerald h-80 rounded-3xl px-4 py-8 sm:px-8 sm:py-10"
          />
        )}

        <FeatureTrio />
        <MedicalDisclaimer />

        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            {hasMounted ? (
              <ProfileForm
                profile={profile}
                isGenerating={isGenerating}
                onProfileChange={setProfile}
                onSubmitPlan={handleSubmitProfile}
                onCityDebouncedChange={(city) => {
                  void fetchByCity(city);
                }}
              />
            ) : (
              <section
                id="profile-section"
                aria-hidden="true"
                className="liquid-glass-card h-96 rounded-3xl p-5 sm:p-6 animate-pulse"
              />
            )}
          </div>

          <div className="lg:col-span-7">
            <ImpactDashboard metrics={impactMetrics} />
          </div>
        </div>

        {hasMounted ? (
          plan && (
            <RecommendationList
              plan={plan}
              isGenerating={isGenerating}
              error={planError}
              checkedIds={checkedIds}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onToggleItem={toggleItem}
              onResetChecklist={resetChecklist}
            />
          )
        ) : (
          <section
            id="action-plan"
            aria-hidden="true"
            className="liquid-glass-card h-72 rounded-3xl p-5 sm:p-6 animate-pulse"
          />
        )}

        {hasMounted && plan && (
          <CommunitySection
            communityActions={plan.communityActions}
            neighborShareSummary={plan.neighborShareSummary}
            checkedIds={checkedIds}
            onToggleItem={toggleItem}
          />
        )}

        {hasMounted && <ChatPanel profile={profile} aqi={aqi} />}

        <section
          aria-label="Back to live air quality summary"
          className="liquid-glass-card-iridescent rounded-3xl px-6 py-8 text-center"
        >
          <h2 className="text-2xl font-bold text-[#123D2B] dark:text-white">
            Ready for Cleaner Winter Mornings?
          </h2>
          <p className="mt-1.5 mx-auto max-w-lg text-sm text-slate-700 dark:text-slate-300">
            Update your location anytime for fresh Open-Meteo telemetry or adjust your household
            profile for updated air-quality steps.
          </p>
          <a
            href="#top"
            className="liquid-btn-primary mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5]"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
            <span>Check Another Location</span>
          </a>
        </section>
      </main>
    </div>
  );
}
