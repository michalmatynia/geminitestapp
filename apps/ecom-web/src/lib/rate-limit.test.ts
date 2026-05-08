/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, getClientIp } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within the limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('test-key-a', 5, 60_000).allowed).toBe(true);
    }
  });

  it('blocks the request that exceeds the limit', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('test-key-b', 5, 60_000);
    const result = checkRateLimit('test-key-b', 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBeGreaterThan(0);
  });

  it('resets after the window expires', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('test-key-c', 5, 60_000);
    expect(checkRateLimit('test-key-c', 5, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit('test-key-c', 5, 60_000).allowed).toBe(true);
  });

  it('tracks different keys independently', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('key-x', 5, 60_000);
    expect(checkRateLimit('key-x', 5, 60_000).allowed).toBe(false);
    expect(checkRateLimit('key-y', 5, 60_000).allowed).toBe(true);
  });

  it('returns retryAfterSec close to the remaining window', () => {
    vi.setSystemTime(new Date('2026-05-08T12:00:00Z'));
    for (let i = 0; i < 5; i++) checkRateLimit('test-key-d', 5, 60_000);
    vi.advanceTimersByTime(20_000);
    const { retryAfterSec } = checkRateLimit('test-key-d', 5, 60_000);
    expect(retryAfterSec).toBeGreaterThanOrEqual(39);
    expect(retryAfterSec).toBeLessThanOrEqual(41);
  });
});

describe('getClientIp', () => {
  it('extracts the first IP from x-forwarded-for', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('returns "unknown" when the header is absent', () => {
    const req = new Request('http://localhost/');
    expect(getClientIp(req)).toBe('unknown');
  });
});
