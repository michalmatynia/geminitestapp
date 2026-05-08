type RateLimitRecord = { count: number; resetAt: number };

const store = new Map<string, RateLimitRecord>();

// Periodically evict expired entries so the Map doesn't grow unbounded.
// Runs at most once per minute.
let lastEvict = 0;
function maybeEvict() {
  const now = Date.now();
  if (now - lastEvict < 60_000) return;
  lastEvict = now;
  for (const [key, record] of store) {
    if (now > record.resetAt) store.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  maybeEvict();
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  record.count += 1;
  if (record.count > maxAttempts) {
    return { allowed: false, retryAfterSec: Math.ceil((record.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfterSec: 0 };
}

export function getClientIp(req: Request): string {
  const forwarded = (req.headers as Headers).get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? 'unknown';
}
