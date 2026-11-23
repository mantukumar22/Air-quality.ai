/**
 * @fileoverview Lightweight circuit breaker pausing upstream Gemini calls for a
 * cooldown window after consecutive transient failures.
 */

import { GEMINI_RETRY_CONFIG } from '@/lib/constants';

export interface CircuitBreakerState {
  isOpen: boolean;
  consecutiveFailures: number;
  openUntil: number;
}

/**
 * Stateful circuit breaker tracking consecutive failures and opening for a fixed cooldown.
 */
export class GeminiCircuitBreaker {
  private consecutiveFailures = 0;
  private openUntil = 0;
  private readonly failureThreshold: number;
  private readonly openDurationMs: number;

  constructor(
    failureThreshold: number = GEMINI_RETRY_CONFIG.circuitFailureThreshold,
    openDurationMs: number = GEMINI_RETRY_CONFIG.circuitOpenDurationMs
  ) {
    this.failureThreshold = failureThreshold;
    this.openDurationMs = openDurationMs;
  }

  /** Returns `true` when requests are permitted (closed or cooldown elapsed). */
  canExecute(now = Date.now()): boolean {
    return this.openUntil === 0 || now >= this.openUntil;
  }

  /** Returns `true` while the circuit is actively blocking upstream attempts. */
  isOpen(now = Date.now()): boolean {
    return this.openUntil > now;
  }

  /** Resets failure counters after a successful upstream response. */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openUntil = 0;
  }

  /** Increments failure count and trips the breaker once threshold is reached. */
  recordFailure(now = Date.now()): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openUntil = now + this.openDurationMs;
    }
  }

  /** Restores the breaker to a clean closed state (primarily for tests). */
  reset(): void {
    this.consecutiveFailures = 0;
    this.openUntil = 0;
  }

  /** Returns a read-only snapshot of the current circuit-breaker counters. */
  getState(now = Date.now()): CircuitBreakerState {
    return {
      isOpen: this.isOpen(now),
      consecutiveFailures: this.consecutiveFailures,
      openUntil: this.openUntil,
    };
  }
}

/** Shared singleton circuit breaker protecting Gemini endpoints across requests. */
export const geminiCircuitBreaker = new GeminiCircuitBreaker();

/**
 * Resets the shared Gemini circuit breaker (used between isolated test runs).
 */
export function resetGeminiCircuitBreaker(): void {
  geminiCircuitBreaker.reset();
}

/**
 * Exposes the current shared circuit breaker state for diagnostics and tests.
 *
 * @param now - Optional epoch timestamp in milliseconds for deterministic checks.
 * @returns Snapshot containing `isOpen`, `consecutiveFailures`, and `openUntil`.
 */
export function getGeminiCircuitState(now = Date.now()): CircuitBreakerState {
  return geminiCircuitBreaker.getState(now);
}
