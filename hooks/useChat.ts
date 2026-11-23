/**
 * @fileoverview Custom hook managing conversational winter-smog Q&A state, instant
 * FAQ shortcutting, client memory + sessionStorage caching, `/api/chat` requests,
 * and offline fallback retries.
 */

'use client';

import { useCallback, useState } from 'react';
import { useTypingReveal } from '@/hooks/useTypingReveal';
import { toAqiContextInput } from '@/lib/apiClient';
import {
  BUSY_AI_NOTICE,
  CLIENT_SESSION_CACHE_CONFIG,
  INPUT_LIMITS,
  STORAGE_KEYS,
  TYPING_REVEAL_CONFIG,
} from '@/lib/constants';
import {
  ChatAnswerCache,
  buildChatCacheKey,
  buildOfflineFallbackAnswer,
  matchFaqQuestion,
  personalizeFaqAnswer,
} from '@/lib/faqMatcher';
import type {
  ApiErrorDetail,
  AqiContextInput,
  AqiReading,
  ChatApiResponse,
  ChatMessage,
  ChatResponseSource,
  FaqEntry,
  UserProfile,
} from '@/types/airwise';

export interface ChatNotice {
  text: string;
  retryQuestion?: string | undefined;
}

export interface SendMessageMode {
  sourceStrategy: 'smart' | 'liveOnly';
}

export interface UseChatResult {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  notice: ChatNotice | null;
  setInput: (value: string) => void;
  selectSuggestion: (entry: FaqEntry, personalizedAnswer: string) => void;
  sendMessage: (rawText: string, mode?: SendMessageMode) => Promise<void>;
}

const clientMemoryCache = new ChatAnswerCache(
  CLIENT_SESSION_CACHE_CONFIG.maxMemoryEntries,
  CLIENT_SESSION_CACHE_CONFIG.ttlMs
);

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
    const raw = window.sessionStorage.getItem(STORAGE_KEYS.chatSessionCache);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, { reply: string; expiresAt: number }>;
    const record = parsed[cacheKey];
    if (!record || Date.now() >= record.expiresAt) return null;
    clientMemoryCache.set(cacheKey, record.reply);
    return record.reply;
  } catch {
    // Non-fatal: sessionStorage may be disabled in strict privacy modes
    return null;
  }
}

function writeClientSessionCache(cacheKey: string, reply: string): void {
  clientMemoryCache.set(cacheKey, reply);
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEYS.chatSessionCache);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, { reply: string; expiresAt: number }>)
      : {};
    const entries = Object.entries(parsed);
    const nextCache =
      entries.length >= CLIENT_SESSION_CACHE_CONFIG.maxStorageEntries
        ? Object.fromEntries(entries.slice(1))
        : parsed;
    nextCache[cacheKey] = {
      reply,
      expiresAt: Date.now() + CLIENT_SESSION_CACHE_CONFIG.ttlMs,
    };
    window.sessionStorage.setItem(STORAGE_KEYS.chatSessionCache, JSON.stringify(nextCache));
  } catch {
    // Non-fatal: ignore storage quota exceeded errors
  }
}

function tryResolveLocalShortcut(
  question: string,
  profile: UserProfile,
  aqiContext: AqiContextInput
): { reply: string; source: 'faq' | 'cache'; impact?: string | undefined } | null {
  const faqMatch = matchFaqQuestion(question);
  if (faqMatch) {
    return {
      reply: personalizeFaqAnswer(faqMatch.entry, profile, aqiContext),
      source: 'faq',
      impact: faqMatch.entry.impact,
    };
  }

  const cacheKey = buildChatCacheKey(question, aqiContext.usAqi, profile);
  const cached = readClientSessionCache(cacheKey);
  if (cached) {
    return { reply: cached, source: 'cache' };
  }

  return null;
}

/**
 * Manages AirWise follow-up Q&A messages, instant FAQ matching, session caching,
 * `/api/chat` calls, and accessible offline fallback retries.
 *
 * @param profile - Active household profile grounding answers.
 * @param aqi - Current local AQI reading grounding answers.
 * @returns Chat transcript state, loading flag, notice state, and action handlers.
 */
export function useChat(profile: UserProfile, aqi: AqiReading): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<ChatNotice | null>(null);
  const { startReveal } = useTypingReveal({
    chunkSizeChars: TYPING_REVEAL_CONFIG.chatChunkSizeChars,
    intervalMs: TYPING_REVEAL_CONFIG.intervalMs,
  });

  const revealAssistantMessage = useCallback(
    (assistantId: string, fullText: string, source: ChatResponseSource, impact?: string) => {
      startReveal(fullText, (slice) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: slice,
                  source,
                  ...(impact !== undefined ? { impact } : {}),
                }
              : m
          )
        );
      });
    },
    [startReveal]
  );

  const applyFallbackMessage = useCallback(
    (assistantId: string, question: string, friendlyNotice: string, aqiCtx: AqiContextInput) => {
      const offlineGuide = buildOfflineFallbackAnswer(question, profile, aqiCtx);
      setNotice({ text: friendlyNotice, retryQuestion: question });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: offlineGuide,
                source: 'fallback',
                notice: friendlyNotice,
                retryQuestion: question,
              }
            : m
        )
      );
    },
    [profile]
  );

  const selectSuggestion = useCallback(
    (entry: FaqEntry, personalizedAnswer: string) => {
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
      revealAssistantMessage(assistantMsg.id, personalizedAnswer, 'faq', entry.impact);
    },
    [isLoading, revealAssistantMessage]
  );

  const sendMessage = useCallback(
    async (rawText: string, mode: SendMessageMode = { sourceStrategy: 'smart' }) => {
      const trimmed = rawText.trim().slice(0, INPUT_LIMITS.chatMessageMaxLength);
      if (!trimmed || isLoading) return;

      setNotice(null);
      const userMsg = createMessageRecord('user', trimmed);
      const placeholderAssistant = createMessageRecord('assistant', '');
      const assistantId = placeholderAssistant.id;

      const nextHistory = [...messages, userMsg].slice(-INPUT_LIMITS.chatHistoryMaxItems);
      setMessages([...nextHistory, placeholderAssistant]);

      if (mode.sourceStrategy === 'smart') {
        setInput('');
      }

      const aqiContext = toAqiContextInput(aqi);
      if (mode.sourceStrategy === 'smart') {
        const localHit = tryResolveLocalShortcut(trimmed, profile, aqiContext);
        if (localHit) {
          revealAssistantMessage(assistantId, localHit.reply, localHit.source, localHit.impact);
          return;
        }
      }

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
          impact?: string;
          notice?: string;
        };

        if (!response.ok || !payload.reply) {
          const friendlyNotice =
            typeof payload.error === 'object' && payload.error?.message
              ? payload.error.message
              : BUSY_AI_NOTICE;
          applyFallbackMessage(assistantId, trimmed, friendlyNotice, aqiContext);
          return;
        }

        const source = payload.source ?? 'gemini';
        if (source === 'gemini') {
          writeClientSessionCache(buildChatCacheKey(trimmed, aqi.usAqi, profile), payload.reply);
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
        applyFallbackMessage(assistantId, trimmed, BUSY_AI_NOTICE, aqiContext);
      } finally {
        setIsLoading(false);
      }
    },
    [aqi, applyFallbackMessage, isLoading, messages, profile, revealAssistantMessage]
  );

  return {
    messages,
    input,
    isLoading,
    notice,
    setInput,
    selectSuggestion,
    sendMessage,
  };
}
