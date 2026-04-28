import { describe, expect, it, vi } from 'vitest';

import { createMxVerifier } from './filemaker-email-mx-verifier';

describe('createMxVerifier — hasMx (legacy boolean API)', () => {
  it('returns true for MX hit', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockResolvedValue([{ exchange: 'mx.example.com' }]),
      resolveA: vi.fn(),
    });
    await expect(verifier.hasMx('user@example.com')).resolves.toBe(true);
  });

  it('returns true for A-only fallback', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockResolvedValue([]),
      resolveA: vi.fn().mockResolvedValue(['1.2.3.4']),
      resolveAaaa: vi.fn().mockResolvedValue([]),
    });
    await expect(verifier.hasMx('user@example.com')).resolves.toBe(true);
  });

  it('returns false when no records exist', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockResolvedValue([]),
      resolveA: vi.fn().mockResolvedValue([]),
      resolveAaaa: vi.fn().mockResolvedValue([]),
    });
    await expect(verifier.hasMx('user@nope.invalid')).resolves.toBe(false);
  });

  it('returns false for explicit Null MX domains', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockResolvedValue([{ exchange: '.', priority: 0 }]),
      resolveA: vi.fn().mockResolvedValue(['1.2.3.4']),
      resolveAaaa: vi.fn().mockResolvedValue(['2001:db8::1']),
    });
    await expect(verifier.hasMx('user@example.com')).resolves.toBe(false);
  });
});

describe('createMxVerifier — lookup (structured outcome)', () => {
  it('reports outcome=mx when MX records exist', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockResolvedValue([{ exchange: 'mx.example.com' }]),
      resolveA: vi.fn(),
    });
    await expect(verifier.lookup('user@example.com')).resolves.toEqual({
      outcome: 'mx',
      hasMail: true,
    });
  });

  it('reports outcome=address-only when MX is empty but A exists', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockResolvedValue([]),
      resolveA: vi.fn().mockResolvedValue(['1.2.3.4']),
      resolveAaaa: vi.fn().mockResolvedValue([]),
    });
    await expect(verifier.lookup('user@example.com')).resolves.toEqual({
      outcome: 'address-only',
      hasMail: true,
    });
  });

  it('reports outcome=address-only when MX is empty but AAAA exists', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockResolvedValue([]),
      resolveA: vi.fn().mockResolvedValue([]),
      resolveAaaa: vi.fn().mockResolvedValue(['2001:db8::1']),
    });
    await expect(verifier.lookup('user@example.com')).resolves.toEqual({
      outcome: 'address-only',
      hasMail: true,
    });
  });

  it('reports outcome=none when both MX and A are empty', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockResolvedValue([]),
      resolveA: vi.fn().mockResolvedValue([]),
      resolveAaaa: vi.fn().mockResolvedValue([]),
    });
    await expect(verifier.lookup('user@nope.invalid')).resolves.toEqual({
      outcome: 'none',
      hasMail: false,
    });
  });

  it('reports outcome=timeout when MX resolver hangs', async () => {
    const verifier = createMxVerifier({
      resolveMx: () => new Promise<never>(() => undefined),
      resolveA: vi.fn(),
      resolveAaaa: vi.fn(),
      timeoutMs: 25,
    });
    await expect(verifier.lookup('slow.example')).resolves.toEqual({
      outcome: 'timeout',
      hasMail: false,
    });
  });

  it('reports outcome=timeout when an address resolver hangs after empty MX', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockResolvedValue([]),
      resolveA: () => new Promise<never>(() => undefined),
      resolveAaaa: vi.fn().mockResolvedValue([]),
      timeoutMs: 25,
    });
    await expect(verifier.lookup('user@slow.example')).resolves.toEqual({
      outcome: 'timeout',
      hasMail: false,
    });
  });

  it('reports outcome=error when both resolvers reject (NXDOMAIN, etc.)', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockRejectedValue(new Error('ENOTFOUND')),
      resolveA: vi.fn().mockRejectedValue(new Error('ENOTFOUND')),
      resolveAaaa: vi.fn().mockRejectedValue(new Error('ENOTFOUND')),
    });
    await expect(verifier.lookup('user@nope.invalid')).resolves.toEqual({
      outcome: 'error',
      hasMail: false,
    });
  });

  it('returns outcome=error for empty / domain-less input without resolver calls', async () => {
    const resolveMx = vi.fn();
    const resolveA = vi.fn();
    const resolveAaaa = vi.fn();
    const verifier = createMxVerifier({ resolveMx, resolveA, resolveAaaa });
    await expect(verifier.lookup('')).resolves.toEqual({ outcome: 'error', hasMail: false });
    await expect(verifier.lookup('localhost')).resolves.toEqual({
      outcome: 'error',
      hasMail: false,
    });
    expect(resolveMx).not.toHaveBeenCalled();
    expect(resolveA).not.toHaveBeenCalled();
    expect(resolveAaaa).not.toHaveBeenCalled();
  });

  it('reports outcome=null-mx and skips address fallback for explicit Null MX domains', async () => {
    const resolveA = vi.fn();
    const resolveAaaa = vi.fn();
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockResolvedValue([{ exchange: '.', priority: 0 }]),
      resolveA,
      resolveAaaa,
    });
    await expect(verifier.lookup('user@example.com')).resolves.toEqual({
      outcome: 'null-mx',
      hasMail: false,
    });
    expect(resolveA).not.toHaveBeenCalled();
    expect(resolveAaaa).not.toHaveBeenCalled();
  });

  it('does not call address resolvers when MX resolver succeeds with records', async () => {
    const resolveA = vi.fn();
    const resolveAaaa = vi.fn();
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockResolvedValue([{ exchange: 'mx.acme.com' }]),
      resolveA,
      resolveAaaa,
    });
    await verifier.lookup('user@acme.com');
    expect(resolveA).not.toHaveBeenCalled();
    expect(resolveAaaa).not.toHaveBeenCalled();
  });

  it('normalizes trailing dots before resolving', async () => {
    const resolveMx = vi.fn().mockResolvedValue([{ exchange: 'mx.acme.com' }]);
    const verifier = createMxVerifier({ resolveMx, resolveA: vi.fn(), resolveAaaa: vi.fn() });
    await verifier.lookup('User@ACME.com.');
    expect(resolveMx).toHaveBeenCalledWith('acme.com');
  });
});

describe('createMxVerifier — caching', () => {
  it('caches per-domain across multiple addresses within TTL', async () => {
    const resolveMx = vi.fn().mockResolvedValue([{ exchange: 'mx.acme.com' }]);
    const verifier = createMxVerifier({ resolveMx, resolveA: vi.fn(), resolveAaaa: vi.fn() });
    await verifier.lookup('a@acme.com');
    await verifier.lookup('b@acme.com');
    await verifier.lookup('acme.com');
    expect(resolveMx).toHaveBeenCalledTimes(1);
  });

  it('expires cache entries after TTL elapses', async () => {
    const resolveMx = vi.fn().mockResolvedValue([{ exchange: 'mx.acme.com' }]);
    let nowValue = 1000;
    const verifier = createMxVerifier({
      resolveMx,
      resolveA: vi.fn(),
      resolveAaaa: vi.fn(),
      cacheTtlMs: 100,
      now: () => nowValue,
    });
    await verifier.lookup('a@acme.com');
    nowValue += 50;
    await verifier.lookup('b@acme.com');
    expect(resolveMx).toHaveBeenCalledTimes(1);
    nowValue += 200; // past TTL
    await verifier.lookup('c@acme.com');
    expect(resolveMx).toHaveBeenCalledTimes(2);
  });
});
