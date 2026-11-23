import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ChatPanel } from '@/components/ChatPanel';
import { ProfileForm } from '@/components/ProfileForm';
import { RecommendationList } from '@/components/RecommendationList';
import { SuggestedQuestions } from '@/components/SuggestedQuestions';
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
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
    expect(screen.getByText(/Please enter a city or neighborhood name/i)).toBeInTheDocument();

    await user.clear(cityInput);
    await user.type(cityInput, 'Lahore');
    await user.click(screen.getByRole('button', { name: /Generate Tailored Action Plan/i }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({ city: 'Lahore' }));
  });

  it('filters recommendations by tab and persists checklist ticks in localStorage', async () => {
    const user = userEvent.setup();
    render(<ChecklistHarness />);

    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];
    expect(checkboxes.length).toBeGreaterThan(3);
    expect(firstCheckbox).toBeDefined();
    if (!firstCheckbox) throw new Error('Expected at least one checkbox');
    expect(firstCheckbox).toHaveAttribute('aria-checked', 'false');

    await user.click(firstCheckbox);
    expect(firstCheckbox).toHaveAttribute('aria-checked', 'true');

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.checklist) ?? '[]');
    expect(stored).toHaveLength(1);

    await user.click(screen.getByRole('tab', { name: /Indoor Hacks/i }));
    expect(screen.getByText('Indoor Air Quality Hacks')).toBeInTheDocument();
    expect(screen.queryByText('Daily Low-Emission Routine')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reset Checklist/i }));
    const cleared = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.checklist) ?? '[]');
    expect(cleared).toHaveLength(0);
  });

  it('renders 6 to 8 profile-relevant SuggestedQuestions chips and supports keyboard activation', async () => {
    const user = userEvent.setup();
    const handleSelect = jest.fn();

    render(
      <SuggestedQuestions
        profile={{ ...DEFAULT_PROFILE, householdGroups: ['kids', 'respiratory'] }}
        aqi={getFallbackAqiReading('New Delhi')}
        onSelectSuggestion={handleSelect}
      />
    );

    const group = screen.getByRole('group', { name: /Suggested questions/i });
    const buttons = Array.from(group.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThanOrEqual(6);
    expect(buttons.length).toBeLessThanOrEqual(8);

    expect(
      screen.getByRole('button', {
        name: /How do I protect elderly family members and asthma patients\?/i,
      })
    ).toBeInTheDocument();
    const kidsBtn = screen.getByRole('button', {
      name: /Is it safe for kids to play outside today\?/i,
    });
    expect(kidsBtn).toBeInTheDocument();

    kidsBtn.focus();
    await user.keyboard('{Enter}');
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'faq-kids-play' }),
      expect.stringContaining('not medical advice')
    );
  });

  it('displays an instant FAQ answer with zero fetch requests when clicking a chip in ChatPanel', async () => {
    const user = userEvent.setup();
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;

    render(
      <ChatPanel
        profile={{ ...DEFAULT_PROFILE, householdGroups: ['kids', 'respiratory'] }}
        aqi={getFallbackAqiReading('New Delhi')}
      />
    );

    const chip = screen.getByRole('button', {
      name: /How do I protect elderly family members and asthma patients\?/i,
    });
    await user.click(chip);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await screen.findByText('Instant answer')).toBeInTheDocument();
    expect(await screen.findByText(/sealed clean-air bedroom/i)).toBeInTheDocument();
    expect(await screen.findByText(/not medical advice/i)).toBeInTheDocument();
  });
});
