/**
 * @fileoverview Presentational chat message bubble displaying role metadata,
 * answer-source badges, multi-paragraph text, impact estimates, and retry controls.
 */

'use client';

import { Loader2, RefreshCw, ShieldAlert, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import type { ChatMessage, ChatResponseSource } from '@/types/airwise';

interface SourceBadgeMeta {
  label: string;
  className: string;
  icon: LucideIcon;
}

const SOURCE_BADGE_MAP: Record<ChatResponseSource, SourceBadgeMeta> = {
  faq: {
    label: 'Instant answer',
    className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200',
    icon: Zap,
  },
  cache: {
    label: 'Instant answer',
    className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200',
    icon: Zap,
  },
  gemini: {
    label: 'AI answer',
    className: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200',
    icon: Sparkles,
  },
  fallback: {
    label: 'Offline guide',
    className: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200',
    icon: ShieldAlert,
  },
};

export interface ChatMessageBubbleProps {
  message: ChatMessage;
  isLoading: boolean;
  onRetryQuestion: (question: string) => void;
}

/**
 * Renders an individual user or assistant transcript bubble with source badges
 * and optional inline "Try again" control on offline fallback replies.
 *
 * @param props - Message record, global loading flag, and retry callback.
 * @returns Message bubble container.
 */
export function ChatMessageBubble({ message, isLoading, onRetryQuestion }: ChatMessageBubbleProps) {
  const badge =
    message.role === 'assistant' && message.source ? SOURCE_BADGE_MAP[message.source] : null;
  const BadgeIcon = badge?.icon;
  const retryQuestion = message.retryQuestion;

  return (
    <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {message.role === 'user' ? 'You' : 'AirWise Assistant'}
        </span>
        {badge && BadgeIcon && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
          >
            <BadgeIcon className="h-3 w-3" aria-hidden="true" />
            {badge.label}
          </span>
        )}
      </div>

      <div
        className={`max-w-[90%] sm:max-w-[80%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
          message.role === 'user'
            ? 'liquid-btn-primary'
            : 'liquid-glass-card text-slate-900 dark:text-slate-100'
        }`}
      >
        {message.content ? (
          <>
            {message.content.split('\n').map((line, idx) => (
              <p key={idx} className={idx > 0 ? 'mt-2' : undefined}>
                {line}
              </p>
            ))}
            {message.impact && (
              <p className="mt-2.5 border-t border-slate-200/70 pt-2 text-xs font-medium text-emerald-800 dark:border-white/15 dark:text-emerald-300">
                {message.impact}
              </p>
            )}
            {retryQuestion && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-amber-300/60 pt-2.5 dark:border-amber-700/50">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onRetryQuestion(retryQuestion)}
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
}
