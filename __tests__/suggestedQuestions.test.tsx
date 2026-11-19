import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '@/components/ChatPanel';
import { SuggestedQuestions } from '@/components/SuggestedQuestions';
import { getFallbackAqiReading } from '@/lib/aqi';
import { DEFAULT_PROFILE } from '@/lib/constants';
import type { UserProfile } from '@/types/airwise';

function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe('SuggestedQuestions & Resilient ChatPanel', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.sessionStorage.clear();
    mockMatchMedia(true);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders 6 to 8 profile-prioritized chips inside an accessible group', () => {
    const aqi = getFallbackAqiReading('New Delhi');
    const asthmaProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      householdGroups: ['respiratory', 'kids'],
    };

    render(<SuggestedQuestions profile={asthmaProfile} aqi={aqi} />);

    const group = screen.getByRole('group', { name: /Suggested questions/i });
    const buttons = group.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(6);
    expect(buttons.length).toBeLessThanOrEqual(8);
    expect(
      screen.getByRole('button', {
        name: /How do I protect elderly family members and asthma patients\?/i,
      })
    ).toBeInTheDocument();
  });

  it('shows instant personalized answer on click with zero network calls and keyboard support', async () => {
    const user = userEvent.setup();
    const aqi = getFallbackAqiReading('New Delhi');
    const fetchSpy = global.fetch as jest.Mock;

    render(<SuggestedQuestions profile={DEFAULT_PROFILE} aqi={aqi} />);

    const firstChip = screen.getByRole('button', {
      name: /How do I make a DIY air purifier/i,
    });
    firstChip.focus();
    await user.keyboard('{Enter}');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await screen.findByText(/Instant answer/i)).toBeInTheDocument();
    expect(screen.getByText(/20-inch box fan/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
  });

  it('renders friendly busy notice and Try again button when AI fails in ChatPanel', async () => {
    const user = userEvent.setup();
    const aqi = getFallbackAqiReading('New Delhi');
    const fetchSpy = (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: 'Offline guidance for your custom smog question.',
          source: 'fallback',
          notice: "Our AI is busy, here's a quick answer from our guide.",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: 'Fresh AI response after retry.',
          source: 'gemini',
        }),
      } as Response);

    render(<ChatPanel profile={DEFAULT_PROFILE} aqi={aqi} />);

    const input = screen.getByLabelText(/Ask about today's air quality/i);
    await user.type(input, 'Should I calibrate an outdoor purpleair node near a highway?');
    await user.click(screen.getByRole('button', { name: /^Send$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Offline guidance for your custom smog question/i)
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Our AI is busy, here's a quick answer from our guide\./i)
    ).toBeInTheDocument();

    const retryButtons = screen.getAllByRole('button', { name: /Try again/i });
    await user.click(retryButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Fresh AI response after retry\./i)).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
