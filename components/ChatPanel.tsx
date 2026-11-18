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
        throw new Error(errPayload.error || 'Unable to stream response from AirWise assistant.');
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

      const tail = decoder.decode();
      if (tail) {
        buffer += tail;
        const finalText = buffer;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: finalText } : m))
        );
      }

      if (!buffer.trim()) {
        throw new Error('Assistant returned an empty response. Please try again.');
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

      {/* Starter question pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isStreaming}
            onClick={() => void sendMessage(prompt)}
            className="liquid-btn-glass min-h-[44px] rounded-full px-4 py-2 text-left text-xs font-medium text-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] dark:text-slate-100"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Live conversation transcript */}
      <div
        aria-live="polite"
        aria-label="Assistant conversation"
        className="mt-5 max-h-96 space-y-4 overflow-y-auto border-y border-white/70 py-4 dark:border-white/15"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Ask a follow-up question about ventilation timing, DIY filters, school commutes, or
            reducing household smoke.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                {msg.role === 'user' ? 'You' : 'AirWise Assistant'}
              </span>
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'liquid-btn-primary'
                    : 'liquid-glass-card text-slate-900 dark:text-slate-100'
                }`}
              >
                {msg.content ? (
                  msg.content.split('\n').map((line, idx) => (
                    <p key={idx} className={idx > 0 ? 'mt-2' : undefined}>
                      {line}
                    </p>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
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
        <p role="alert" className="mt-3 text-xs text-amber-800 dark:text-amber-300">
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
            className="liquid-input mt-1.5 min-h-[44px] w-full rounded-full px-4 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={isStreaming || input.trim().length === 0}
          className="liquid-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-6 py-2 text-sm font-semibold disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5]"
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
