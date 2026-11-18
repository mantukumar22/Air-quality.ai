import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ProfileForm } from '@/components/ProfileForm';
import { RecommendationList } from '@/components/RecommendationList';
import { useChecklist } from '@/hooks/useChecklist';
import { getFallbackAqiReading } from '@/lib/aqi';
import { DEFAULT_PROFILE, STORAGE_KEYS } from '@/lib/constants';
import { buildFallbackPlan } from '@/lib/fallbackPlan';
import type { UserProfile } from '@/types/airwise';

function ProfileFormHarness({ onSubmit }: { onSubmit: (profile: UserProfile) => void }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  return (
    <ProfileForm
      profile={profile}
      isGenerating={false}
      onProfileChange={setProfile}
      onSubmitPlan={onSubmit}
    />
  );
}

function ChecklistHarness() {
  const plan = buildFallbackPlan(DEFAULT_PROFILE, getFallbackAqiReading('New Delhi'));
  const { checkedIds, toggleItem, resetChecklist } = useChecklist();
  return (
    <RecommendationList
      plan={plan}
      isGenerating={false}
      error={null}
      checkedIds={checkedIds}
      onToggleItem={toggleItem}
      onResetChecklist={resetChecklist}
    />
  );
}

describe('AirWise interactive components', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('validates empty/short city input in ProfileForm and submits valid profiles', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();

    render(<ProfileFormHarness onSubmit={handleSubmit} />);

    const cityInput = screen.getByLabelText(/City or Neighborhood/i);
    await user.clear(cityInput);
    await user.type(cityInput, 'X');

    await user.click(screen.getByRole('button', { name: /Generate Tailored Action Plan/i }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Please enter a city or neighborhood name/i)
    ).toBeInTheDocument();

    await user.clear(cityInput);
    await user.type(cityInput, 'Lahore');
    await user.click(screen.getByRole('button', { name: /Generate Tailored Action Plan/i }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Lahore' })
    );
  });

  it('filters recommendations by tab and persists checklist ticks in localStorage', async () => {
    const user = userEvent.setup();
    render(<ChecklistHarness />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(3);
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'false');

    await user.click(checkboxes[0]);
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true');

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.checklist) ?? '[]');
    expect(stored).toHaveLength(1);

    // Filter to Indoor Hacks tab
    await user.click(screen.getByRole('tab', { name: /Indoor Hacks/i }));
    expect(screen.getByText('Indoor Air Quality Hacks')).toBeInTheDocument();
    expect(screen.queryByText('Daily Low-Emission Routine')).not.toBeInTheDocument();

    // Reset checklist clears storage
    await user.click(screen.getByRole('button', { name: /Reset Checklist/i }));
    const cleared = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.checklist) ?? '[]');
    expect(cleared).toHaveLength(0);
  });
});
