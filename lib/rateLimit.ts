import { RATE_LIMITS } from '@/lib/constants';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory fixed-window per-IP rate limiter for API route protection.
 */
export class RateLimiter {
  private readonly store = new Map<string, BucketEntry>();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /**
   * Checks and consumes one request token for the given key (e.g., client IP).
   */
  check(key: string, now = Date.now()): RateLimitResult {
    this.pruneExpired(now);
    const existing = this.store.get(key);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + this.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: Math.max(0, this.limit - 1),
        resetAt,
      };
    }

    if (existing.count >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
      };
    }

    existing.count += 1;
    this.store.set(key, existing);

    return {
      allowed: true,
      remaining: Math.max(0, this.limit - existing.count),
      resetAt: existing.resetAt,
    };
  }

  /** Resets all stored rate-limit buckets (useful in tests). */
  reset(): void {
    this.store.clear();
  }

  private pruneExpired(now: number): void {
    if (this.store.size < 500) {
      return;
    }
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

export const aqiRateLimiter = new RateLimiter(RATE_LIMITS.aqi.limit, RATE_LIMITS.aqi.windowMs);
export const recommendRateLimiter = new RateLimiter(
  RATE_LIMITS.recommend.limit,
  RATE_LIMITS.recommend.windowMs
);
export const chatRateLimiter = new RateLimiter(RATE_LIMITS.chat.limit, RATE_LIMITS.chat.windowMs);

/**
 * Extracts a normalized client IP address from incoming request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}
