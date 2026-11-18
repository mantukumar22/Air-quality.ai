'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { MotionConfig, motion } from 'motion/react';
import { AqiHero } from '@/components/AqiHero';
import { FeatureTrio } from '@/components/FeatureTrio';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { ProfileForm } from '@/components/ProfileForm';
import { RecommendationList, type RecommendationFilterTab } from '@/components/RecommendationList';
import { ScenarioShowcase } from '@/components/ScenarioShowcase';
import { SkyBackdrop } from '@/components/SkyBackdrop';
import { useAqi } from '@/hooks/useAqi';
import { useChecklist } from '@/hooks/useChecklist';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useTheme } from '@/hooks/useTheme';
import { getFallbackAqiReading } from '@/lib/aqi';
import { DEFAULT_PROFILE } from '@/lib/constants';
import { calculateImpactMetrics } from '@/lib/impact';
import type { UserProfile } from '@/types/airwise';

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

/**
 * Main interactive AirWise workspace following the alternating light-cream,
 * pastel-trio, and deep-emerald band cadence.
 */
export function AirWiseApp() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [activeTab, setActiveTab] = useState<RecommendationFilterTab>('all');
  const initialFallbackAqi = useMemo(() => getFallbackAqiReading(DEFAULT_PROFILE.city), []);

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
    <MotionConfig reducedMotion="user">
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
          {/* Deep Forest Band: Winter Smog Playbooks */}
          <ScenarioShowcase onSelectCategory={setActiveTab} />

          {/* 3-Column Pastel Bento Band */}
          <FeatureTrio />

          {/* Medical Safety Notice */}
          <MedicalDisclaimer />

          {/* Two-column workspace: Household Profile + Before/After Impact Dashboard */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-8 lg:grid-cols-12 lg:items-start"
          >
            <div className="lg:col-span-5">
              <ProfileForm
                profile={profile}
                isGenerating={isGenerating}
                onProfileChange={setProfile}
                onSubmitPlan={handleSubmitProfile}
                onCityDebouncedChange={(city) => {
                  void fetchByCity(city);
                }}
              />
            </div>

            <div className="lg:col-span-7">
              <ImpactDashboard metrics={impactMetrics} />
            </div>
          </motion.div>

          {/* Structured Recommendations & Persistent Checklist */}
          {plan && (
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
          )}

          {/* Deep Forest Band: Community Actions & Neighbor Share Summary */}
          {plan && (
            <CommunitySection
              communityActions={plan.communityActions}
              neighborShareSummary={plan.neighborShareSummary}
              checkedIds={checkedIds}
              onToggleItem={toggleItem}
            />
          )}

          {/* Grounded Streaming AI Follow-up */}
          <ChatPanel profile={profile} aqi={aqi} />

          {/* Iridescent Liquid Glass Closing Invitation Band */}
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
    </MotionConfig>
  );
}
