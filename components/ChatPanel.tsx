'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { INPUT_LIMITS } from '@/lib/constants';
import type { AqiReading, ChatMessage, UserProfile } from '@/types/airwise';

interface ChatPanelProps {
  profile: UserProfile;
  aqi: AqiReading;
}

const STARTER_PROMPTS = [
  'When is the safest time to air out my home today?',
  'What low-cost steps protect kids from morning smog?',
  'How do I reduce indoor PM2.5 when cooking on gas?',
];

let messageSequence = 0;

function createMessageRecord(role: ChatMessage['role'], content: string): ChatMessage {
  messageSequence += 1;
  return {
    id: `${role}-${messageSequence}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Streaming conversational follow-up assistant grounded in the user's
 * household profile and current live AQI. Renders plain text safely without dangerouslySetInnerHTML.
 */
export function ChatPanel({ profile, aqi }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim().slice(0, INPUT_LIMITS.chatMessageMaxLength);
    if (!trimmed || isStreaming) return;

    setError(null);
    const userMsg = createMessageRecord('user', trimmed);
    const placeholderAssistant = createMessageRecord('assistant', '');
    const assistantId = placeholderAssistant.id;

    const nextHistory = [...messages, userMsg].slice(-INPUT_LIMITS.chatHistoryMaxItems);
    setMessages([...nextHistory, placeholderAssistant]);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          aqi: {
            locationName: aqi.locationName,
            usAqi: aqi.usAqi,
            pm25: aqi.pm25,
            pm10: aqi.pm10,
            no2: aqi.no2,
            categoryLabel: aqi.category.label,
          },
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok || !response.body) {
        const errPayload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          errPayload.error || 'Unable to stream response from AirWise assistant.'
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const snapshot = buffer + decoder.decode(value, { stream: true });
        buffer = snapshot;

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Chat connection failed. Please try again.';
      setError(message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && !m.content
            ? {
                ...m,
                content:
                  'Live AI chat is temporarily unavailable. Check your above Action Plan and local AQI guidance for immediate protective steps.',
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <section
      id="assistant"
      aria-labelledby="assistant-heading"
      className="rounded-2xl border border-[#E2E4DA] bg-white p-5 sm:p-6 dark:border-emerald-900/40 dark:bg-[#131F1B]"
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFECE3] text-[#1E4D3B] dark:bg-[#192822] dark:text-emerald-300">
          <MessageSquare className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2
            id="assistant-heading"
            className="text-lg font-bold text-[#1E4D3B] dark:text-white"
          >
            Follow-Up Questions
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Grounded in {aqi.locationName} ({aqi.usAqi} AQI · PM2.5 {aqi.pm25} µg/m³) and your{' '}
            {profile.budget}-budget household profile.
          </p>
        </div>
      </div>

      {/* Starter question buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isStreaming}
            onClick={() => void sendMessage(prompt)}
            className="min-h-[44px] rounded-xl border border-[#E2E4DA] bg-[#FAF9F5] px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-[#EFECE3] disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3B] dark:border-emerald-900/40 dark:bg-[#0D1512] dark:text-slate-300 dark:hover:bg-[#192822]"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Live conversation transcript */}
      <div
        aria-live="polite"
        aria-label="Assistant conversation"
        className="mt-5 max-h-96 space-y-4 overflow-y-auto border-y border-[#E2E4DA] py-4 dark:border-emerald-900/40"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ask a follow-up question about ventilation timing, DIY filters, school commutes, or
            reducing household smoke.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {msg.role === 'user' ? 'You' : 'AirWise Assistant'}
              </span>
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#1E4D3B] text-white dark:bg-emerald-700'
                    : 'border border-[#E2E4DA] bg-[#FAF9F5] text-slate-800 dark:border-emerald-900/40 dark:bg-[#0D1512] dark:text-slate-200'
                }`}
              >
                {msg.content ? (
                  msg.content.split('\n').map((line, idx) => (
                    <p key={idx} className={idx > 0 ? 'mt-2' : undefined}>
                      {line}
                    </p>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Thinking...
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          {error}
        </p>
      )}

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
            value={input}
            maxLength={INPUT_LIMITS.chatMessageMaxLength}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., Is it safe to open bedroom windows at 2 PM?"
            className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#D4D8CB] bg-[#FAF9F5] px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D3B] dark:border-emerald-900/50 dark:bg-[#0D1512] dark:text-slate-100"
          />
        </div>
        <button
          type="submit"
          disabled={isStreaming || input.trim().length === 0}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#C9482B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B23C22] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9482B] dark:bg-[#D95B3D] dark:hover:bg-[#C9482B]"
        >
          {isStreaming ? (
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
