/**
 * @fileoverview Presentational conversational follow-up assistant panel backed by `useChat`,
 * `SuggestedQuestions`, and `ChatMessageBubble`.
 */

'use client';

import { AlertCircle, Loader2, MessageSquare, RefreshCw, Send } from 'lucide-react';
import type { FormEvent } from 'react';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { SuggestedQuestions } from '@/components/SuggestedQuestions';
import { useChat } from '@/hooks/useChat';
import { INPUT_LIMITS } from '@/lib/constants';
import type { AqiReading, UserProfile } from '@/types/airwise';

export interface ChatPanelProps {
  profile: UserProfile;
  aqi: AqiReading;
}

/**
 * Fast, resilient conversational assistant grounded in the user's household profile
 * and live AQI. Serves pre-stored FAQ & cached answers immediately and degrades gracefully
 * to an offline AQI/profile guide whenever upstream AI is overloaded.
 *
 * @param props - Household profile and active local AQI snapshot.
 * @returns Accessible chat workspace section.
 */
export function ChatPanel({ profile, aqi }: ChatPanelProps) {
  const { messages, input, isLoading, notice, setInput, selectSuggestion, sendMessage } = useChat(
    profile,
    aqi
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input, { sourceStrategy: 'smart' });
  };

  const handleRetryQuestion = (question: string) => {
    void sendMessage(question, { sourceStrategy: 'liveOnly' });
  };

  const noticeRetryQuestion = notice?.retryQuestion;

  return (
    <section
      id="assistant"
      aria-labelledby="assistant-heading"
      className="liquid-glass-card rounded-3xl p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-[#5846E5] shadow-xs dark:border-white/20 dark:bg-white/10 dark:text-indigo-300">
          <MessageSquare className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="assistant-heading" className="text-lg font-bold text-[#123D2B] dark:text-white">
            Follow-Up Questions
          </h2>
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Grounded in {aqi.locationName} ({aqi.usAqi} AQI · PM2.5 {aqi.pm25} µg/m³) and your{' '}
            {profile.budget}-budget household profile.
          </p>
        </div>
      </div>

      <SuggestedQuestions
        profile={profile}
        aqi={aqi}
        disabled={isLoading}
        showInlineAnswer={false}
        onSelectSuggestion={selectSuggestion}
      />

      <div
        aria-live="polite"
        aria-label="Assistant conversation"
        className="mt-5 max-h-96 space-y-4 overflow-y-auto border-y border-white/70 py-4 dark:border-white/15"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Tap any instant smog guide question above or ask your own question about ventilation,
            masks, cooking smoke, or neighborhood actions.
          </p>
        ) : (
          messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              isLoading={isLoading}
              onRetryQuestion={handleRetryQuestion}
            />
          ))
        )}
      </div>

      <div aria-live="polite" className="mt-3">
        {notice && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300/70 bg-amber-50/90 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
            <span className="inline-flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {notice.text}
            </span>
            {noticeRetryQuestion && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleRetryQuestion(noticeRetryQuestion)}
                className="liquid-btn-glass inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] disabled:opacity-50 dark:text-amber-100"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="chat-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Ask about today&apos;s air quality ({input.length}/{INPUT_LIMITS.chatMessageMaxLength})
          </label>
          <input
            id="chat-input"
            type="text"
            autoComplete="off"
            value={input}
            maxLength={INPUT_LIMITS.chatMessageMaxLength}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., Is it safe to open bedroom windows at 2 PM?"
            className="liquid-input mt-1.5 min-h-[44px] w-full rounded-full px-4 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || input.trim().length === 0}
          className="liquid-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-6 py-2 text-sm font-semibold disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5]"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          <span>Send</span>
        </button>
      </form>
    </section>
  );
}
