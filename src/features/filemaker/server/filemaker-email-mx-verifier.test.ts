import { describe, expect, it, vi } from 'vitest';

import { createMxVerifier } from './filemaker-email-mx-verifier';

const dnsError = (code: string): Error & { code: string } =>
  Object.assign(new Error(code), { code });

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

const createDeferred = (): Deferred => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
};

const waitForMockCallCount = async (
  mock: { mock: { calls: unknown[] } },
  count: number
): Promise<void> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (mock.mock.calls.length >= count) return;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
  expect(mock.mock.calls.length).toBeGreaterThanOrEqual(count);
};

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

  it('reports outcome=address-only when DNS reports no MX data but A exists', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockRejectedValue(dnsError('ENODATA')),
      resolveA: vi.fn().mockResolvedValue(['1.2.3.4']),
      resolveAaaa: vi.fn().mockRejectedValue(dnsError('ENODATA')),
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

  it('reports outcome=none when DNS reports no MX, A, or AAAA data', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockRejectedValue(dnsError('ENODATA')),
      resolveA: vi.fn().mockRejectedValue(dnsError('ENODATA')),
      resolveAaaa: vi.fn().mockRejectedValue(dnsError('ENODATA')),
    });
    await expect(verifier.lookup('user@nope.invalid')).resolves.toEqual({
      outcome: 'none',
      hasMail: false,
    });
  });

  it('reports outcome=error when MX lookup fails operationally even if A exists', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockRejectedValue(dnsError('ESERVFAIL')),
      resolveA: vi.fn().mockResolvedValue(['1.2.3.4']),
      resolveAaaa: vi.fn().mockResolvedValue([]),
    });
    await expect(verifier.lookup('user@example.com')).resolves.toEqual({
      outcome: 'error',
      hasMail: false,
    });
  });

  it('reports outcome=error when MX resolver throws synchronously', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn(() => {
        throw dnsError('ESERVFAIL');
      }),
      resolveA: vi.fn().mockResolvedValue(['1.2.3.4']),
      resolveAaaa: vi.fn().mockResolvedValue([]),
    });
    await expect(verifier.lookup('user@example.com')).resolves.toEqual({
      outcome: 'error',
      hasMail: false,
    });
  });

  it('reports outcome=error when an address resolver throws synchronously after empty MX', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn().mockResolvedValue([]),
      resolveA: vi.fn(() => {
        throw dnsError('ESERVFAIL');
      }),
      resolveAaaa: vi.fn().mockResolvedValue([]),
    });
    await expect(verifier.lookup('user@example.com')).resolves.toEqual({
      outcome: 'error',
      hasMail: false,
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

  it('normalizes display-name mailto addresses before resolving', async () => {
    const resolveMx = vi.fn().mockResolvedValue([{ exchange: 'mx.acme.com' }]);
    const verifier = createMxVerifier({ resolveMx, resolveA: vi.fn(), resolveAaaa: vi.fn() });
    await verifier.lookup('Acme <mailto:Sales@ACME.com.?subject=hello>');
    expect(resolveMx).toHaveBeenCalledWith('acme.com');
  });

  it('rejects malformed DNS labels before resolver calls', async () => {
    const resolveMx = vi.fn();
    const resolveA = vi.fn();
    const resolveAaaa = vi.fn();
    const verifier = createMxVerifier({ resolveMx, resolveA, resolveAaaa });
    await expect(verifier.lookup('user@bad_domain.example')).resolves.toEqual({
      outcome: 'error',
      hasMail: false,
    });
    expect(resolveMx).not.toHaveBeenCalled();
    expect(resolveA).not.toHaveBeenCalled();
    expect(resolveAaaa).not.toHaveBeenCalled();
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

  it('does not cache transient error outcomes by default', async () => {
    const resolveMx = vi.fn().mockRejectedValue(dnsError('ESERVFAIL'));
    const verifier = createMxVerifier({
      resolveMx,
      resolveA: vi.fn().mockRejectedValue(dnsError('ESERVFAIL')),
      resolveAaaa: vi.fn().mockRejectedValue(dnsError('ESERVFAIL')),
    });
    await verifier.lookup('a@broken.example');
    await verifier.lookup('b@broken.example');
    expect(resolveMx).toHaveBeenCalledTimes(2);
  });

  it('can cache transient error outcomes when configured', async () => {
    const resolveMx = vi.fn().mockRejectedValue(dnsError('ESERVFAIL'));
    const verifier = createMxVerifier({
      resolveMx,
      resolveA: vi.fn().mockRejectedValue(dnsError('ESERVFAIL')),
      resolveAaaa: vi.fn().mockRejectedValue(dnsError('ESERVFAIL')),
      transientCacheTtlMs: 1000,
    });
    await verifier.lookup('a@broken.example');
    await verifier.lookup('b@broken.example');
    expect(resolveMx).toHaveBeenCalledTimes(1);
  });
});

describe('createMxVerifier — lookupMany', () => {
  it('returns results aligned to the input order', async () => {
    const verifier = createMxVerifier({
      resolveMx: vi.fn(async (domain: string) =>
        domain === 'acme.example' ? [{ exchange: 'mx.acme.example' }] : []
      ),
      resolveA: vi.fn(async (domain: string) =>
        domain === 'relay.example' ? ['1.2.3.4'] : []
      ),
      resolveAaaa: vi.fn().mockResolvedValue([]),
    });
    await expect(verifier.lookupMany?.(['sales@acme.example', 'relay.example', 'bad'])).resolves.toEqual([
      { outcome: 'mx', hasMail: true },
      { outcome: 'address-only', hasMail: true },
      { outcome: 'error', hasMail: false },
    ]);
  });

  it('deduplicates repeated domains through the shared lookup cache', async () => {
    const resolveMx = vi.fn().mockResolvedValue([{ exchange: 'mx.acme.example' }]);
    const verifier = createMxVerifier({
      resolveMx,
      resolveA: vi.fn(),
      resolveAaaa: vi.fn(),
    });
    await expect(verifier.lookupMany?.(['a@acme.example', 'b@acme.example', 'ACME.example.'])).resolves.toEqual([
      { outcome: 'mx', hasMail: true },
      { outcome: 'mx', hasMail: true },
      { outcome: 'mx', hasMail: true },
    ]);
    expect(resolveMx).toHaveBeenCalledTimes(1);
  });

  it('limits concurrent distinct-domain lookups', async () => {
    const releases: Deferred[] = [];
    let active = 0;
    let peakActive = 0;
    const resolveMx = vi.fn(async (domain: string) => {
      active += 1;
      peakActive = Math.max(peakActive, active);
      const release = createDeferred();
      releases.push(release);
      await release.promise;
      active -= 1;
      return [{ exchange: `mx.${domain}` }];
    });
    const verifier = createMxVerifier({
      resolveMx,
      resolveA: vi.fn(),
      resolveAaaa: vi.fn(),
      maxConcurrentLookups: 2,
      timeoutMs: 1000,
    });
    const lookupMany = verifier.lookupMany;
    if (lookupMany === undefined) throw new Error('Expected lookupMany to be available.');

    const lookupPromise = lookupMany(['a.example', 'b.example', 'c.example', 'd.example']);
    await waitForMockCallCount(resolveMx, 2);
    expect(resolveMx).toHaveBeenCalledTimes(2);
    expect(peakActive).toBe(2);

    releases.splice(0).forEach((release) => release.resolve());
    await waitForMockCallCount(resolveMx, 4);
    expect(resolveMx).toHaveBeenCalledTimes(4);
    expect(peakActive).toBe(2);

    releases.splice(0).forEach((release) => release.resolve());
    await expect(lookupPromise).resolves.toEqual([
      { outcome: 'mx', hasMail: true },
      { outcome: 'mx', hasMail: true },
      { outcome: 'mx', hasMail: true },
      { outcome: 'mx', hasMail: true },
    ]);
    expect(active).toBe(0);
  });
});
