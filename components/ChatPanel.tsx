'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { SuggestedQuestions } from '@/components/SuggestedQuestions';
import { INPUT_LIMITS } from '@/lib/constants';
import {
  buildChatCacheKey,
  buildOfflineFallbackAnswer,
  ChatAnswerCache,
  matchFaqQuestion,
  personalizeFaqAnswer,
} from '@/lib/faqMatcher';
import type {
  ApiErrorDetail,
  AqiReading,
  ChatApiResponse,
  ChatMessage,
  ChatResponseSource,
  FaqEntry,
  UserProfile,
} from '@/types/airwise';

interface ChatPanelProps {
  profile: UserProfile;
  aqi: AqiReading;
}

const SESSION_CACHE_STORAGE_KEY = 'airwise_chat_session_cache_v1';
const clientMemoryCache = new ChatAnswerCache(40, 15 * 60 * 1000);

let messageSequence = 0;

function createMessageRecord(
  role: ChatMessage['role'],
  content: string,
  extras?: Partial<Omit<ChatMessage, 'id' | 'role' | 'content' | 'createdAt'>>
): ChatMessage {
  messageSequence += 1;
  return {
    id: `${role}-${messageSequence}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    ...extras,
  };
}

function readClientSessionCache(cacheKey: string): string | null {
  const memoryHit = clientMemoryCache.get(cacheKey);
  if (memoryHit) return memoryHit;

  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, { reply: string; expiresAt: number }>;
    const record = parsed[cacheKey];
    if (!record || Date.now() >= record.expiresAt) return null;
    clientMemoryCache.set(cacheKey, record.reply);
    return record.reply;
  } catch {
    return null;
  }
}

function writeClientSessionCache(cacheKey: string, reply: string): void {
  clientMemoryCache.set(cacheKey, reply);
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_STORAGE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, { reply: string; expiresAt: number }>)
      : {};
    const keys = Object.keys(parsed);
    if (keys.length >= 30) {
      delete parsed[keys[0]];
    }
    parsed[cacheKey] = {
      reply,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
    window.sessionStorage.setItem(SESSION_CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage quota / privacy mode issues
  }
}

function getSourceBadgeMeta(source?: ChatResponseSource): {
  label: string;
  className: string;
  kind: 'instant' | 'ai' | 'offline';
} | null {
  if (source === 'faq' || source === 'cache') {
    return {
      label: 'Instant answer',
      className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200',
      kind: 'instant',
    };
  }
  if (source === 'gemini') {
    return {
      label: 'AI answer',
      className: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200',
      kind: 'ai',
    };
  }
  if (source === 'fallback') {
    return {
      label: 'Offline guide',
      className: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200',
      kind: 'offline',
    };
  }
  return null;
}

/**
 * Fast, resilient conversational assistant grounded in the user's household profile
 * and live AQI. Serves pre-stored FAQ & cached answers immediately and degrades gracefully
 * to an offline AQI/profile guide whenever upstream AI is overloaded.
 */
export function ChatPanel({ profile, aqi }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<{ text: string; retryQuestion?: string } | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingCursorRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  const revealInstantReply = (
    assistantId: string,
    fullText: string,
    source: ChatResponseSource,
    impact?: string
  ) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: fullText, source, impact } : m))
      );
      return;
    }

    typingCursorRef.current = Math.min(36, fullText.length);
    const initialSlice = fullText.slice(0, typingCursorRef.current);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId ? { ...m, content: initialSlice, source, impact } : m
      )
    );

    if (typingCursorRef.current >= fullText.length) return;

    typingTimerRef.current = setInterval(() => {
      const nextCursor = Math.min(fullText.length, typingCursorRef.current + 36);
      typingCursorRef.current = nextCursor;
      const nextSlice = fullText.slice(0, nextCursor);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: nextSlice } : m))
      );
      if (nextCursor >= fullText.length && typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }, 16);
  };

  const handleSelectSuggestion = (entry: FaqEntry, personalizedAnswer: string) => {
    if (isLoading) return;
    setNotice(null);

    const userMsg = createMessageRecord('user', entry.question);
    const assistantMsg = createMessageRecord('assistant', '', {
      source: 'faq',
      impact: entry.impact,
    });

    setMessages((prev) =>
      [...prev, userMsg, assistantMsg].slice(-INPUT_LIMITS.chatHistoryMaxItems)
    );
    revealInstantReply(assistantMsg.id, personalizedAnswer, 'faq', entry.impact);
  };

  const sendMessage = async (rawText: string, options?: { bypassLocalShortcuts?: boolean }) => {
    const trimmed = rawText.trim().slice(0, INPUT_LIMITS.chatMessageMaxLength);
    if (!trimmed || isLoading) return;

    setNotice(null);
    const userMsg = createMessageRecord('user', trimmed);
    const placeholderAssistant = createMessageRecord('assistant', '');
    const assistantId = placeholderAssistant.id;

    const nextHistory = [...messages, userMsg].slice(-INPUT_LIMITS.chatHistoryMaxItems);
    setMessages([...nextHistory, placeholderAssistant]);
    if (!options?.bypassLocalShortcuts) {
      setInput('');
    }

    const aqiContext = {
      locationName: aqi.locationName,
      usAqi: aqi.usAqi,
      pm25: aqi.pm25,
      pm10: aqi.pm10,
      no2: aqi.no2,
      categoryLabel: aqi.category.label,
    };

    if (!options?.bypassLocalShortcuts) {
      // 1. Pre-stored FAQ match (instant, 0 network calls)
      const faqMatch = matchFaqQuestion(trimmed);
      if (faqMatch) {
        const personalized = personalizeFaqAnswer(faqMatch.entry, profile, aqiContext);
        revealInstantReply(assistantId, personalized, 'faq', faqMatch.entry.impact);
        return;
      }

      // 2. Client session cache hit (instant, 0 network calls)
      const cacheKey = buildChatCacheKey(trimmed, aqi.usAqi, profile);
      const cached = readClientSessionCache(cacheKey);
      if (cached) {
        revealInstantReply(assistantId, cached, 'cache');
        return;
      }
    }

    // 3. Call /api/chat (server FAQ -> server cache -> resilient Gemini -> fallback)
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          aqi: aqiContext,
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<ChatApiResponse> & {
        error?: ApiErrorDetail | string;
      };

      if (!response.ok || !payload.reply) {
        const friendlyNotice =
          typeof payload.error === 'object' && payload.error?.message
            ? payload.error.message
            : "Our AI is busy, here's a quick answer from our guide.";

        const offlineGuide = buildOfflineFallbackAnswer(trimmed, profile, aqiContext);
        setNotice({ text: friendlyNotice, retryQuestion: trimmed });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: offlineGuide,
                  source: 'fallback',
                  notice: friendlyNotice,
                  retryQuestion: trimmed,
                }
              : m
          )
        );
        return;
      }

      const source = payload.source ?? 'gemini';
      if (source === 'gemini') {
        const cacheKey = buildChatCacheKey(trimmed, aqi.usAqi, profile);
        writeClientSessionCache(cacheKey, payload.reply);
      }

      if (payload.notice) {
        setNotice({
          text: payload.notice,
          retryQuestion: source === 'fallback' ? trimmed : undefined,
        });
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: payload.reply ?? '',
                source,
                impact: payload.impact,
                notice: payload.notice,
                retryQuestion: source === 'fallback' ? trimmed : undefined,
              }
            : m
        )
      );
    } catch {
      const friendlyNotice = "Our AI is busy, here's a quick answer from our guide.";
      const offlineGuide = buildOfflineFallbackAnswer(trimmed, profile, aqiContext);
      setNotice({ text: friendlyNotice, retryQuestion: trimmed });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: offlineGuide,
                source: 'fallback',
                notice: friendlyNotice,
                retryQuestion: trimmed,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
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

      {/* Profile-aware instant FAQ suggestion chips */}
      <SuggestedQuestions
        profile={profile}
        aqi={aqi}
        disabled={isLoading}
        showInlineAnswer={false}
        onSelectSuggestion={handleSelectSuggestion}
      />

      {/* Live conversation transcript */}
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
          messages.map((msg) => {
            const badge = msg.role === 'assistant' ? getSourceBadgeMeta(msg.source) : null;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {msg.role === 'user' ? 'You' : 'AirWise Assistant'}
                  </span>
                  {badge && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                    >
                      {badge.kind === 'instant' && <Zap className="h-3 w-3" aria-hidden="true" />}
                      {badge.kind === 'ai' && <Sparkles className="h-3 w-3" aria-hidden="true" />}
                      {badge.kind === 'offline' && (
                        <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                      )}
                      {badge.label}
                    </span>
                  )}
                </div>

                <div
                  className={`max-w-[90%] sm:max-w-[80%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'liquid-btn-primary'
                      : 'liquid-glass-card text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {msg.content ? (
                    <>
                      {msg.content.split('\n').map((line, idx) => (
                        <p key={idx} className={idx > 0 ? 'mt-2' : undefined}>
                          {line}
                        </p>
                      ))}
                      {msg.impact && (
                        <p className="mt-2.5 border-t border-slate-200/70 pt-2 text-xs font-medium text-emerald-800 dark:border-white/15 dark:text-emerald-300">
                          {msg.impact}
                        </p>
                      )}
                      {msg.retryQuestion && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-amber-300/60 pt-2.5 dark:border-amber-700/50">
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() =>
                              void sendMessage(msg.retryQuestion!, { bypassLocalShortcuts: true })
                            }
                            className="liquid-btn-glass inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] disabled:opacity-50 dark:text-slate-100"
                          >
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                            Try again
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Finding the best answer...
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Non-blocking status notice with Try again */}
      <div aria-live="polite" className="mt-3">
        {notice && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300/70 bg-amber-50/90 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
            <span className="inline-flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {notice.text}
            </span>
            {notice.retryQuestion && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() =>
                  void sendMessage(notice.retryQuestion!, { bypassLocalShortcuts: true })
                }
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
