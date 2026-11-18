import { RateLimiter } from '@/lib/rateLimit';

describe('In-memory RateLimiter', () => {
  it('allows requests within limit and blocks subsequent requests until window resets', () => {
    const limiter = new RateLimiter(3, 10_000);
    const t0 = 1_000_000;

    expect(limiter.check('10.0.0.1', t0)).toMatchObject({ allowed: true, remaining: 2 });
    expect(limiter.check('10.0.0.1', t0 + 100)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.check('10.0.0.1', t0 + 200)).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.check('10.0.0.1', t0 + 300)).toMatchObject({ allowed: false, remaining: 0 });

    // Separate IP has its own bucket
    expect(limiter.check('10.0.0.2', t0 + 300)).toMatchObject({ allowed: true, remaining: 2 });

    // Window expiry restores quota
    expect(limiter.check('10.0.0.1', t0 + 10_001)).toMatchObject({ allowed: true, remaining: 2 });
  });
});
