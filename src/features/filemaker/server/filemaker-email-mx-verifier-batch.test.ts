import { describe, expect, it, vi } from 'vitest';

import { mapWithConcurrency } from './filemaker-email-mx-verifier-batch';

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

describe('mapWithConcurrency', () => {
  it('preserves input order while mapping concurrently', async () => {
    await expect(
      mapWithConcurrency([3, 1, 2], async (value) => `item:${value}`, 2)
    ).resolves.toEqual(['item:3', 'item:1', 'item:2']);
  });

  it('limits active mapper calls', async () => {
    const releases: Deferred[] = [];
    let active = 0;
    let peakActive = 0;
    const mapper = vi.fn(async (value: number) => {
      active += 1;
      peakActive = Math.max(peakActive, active);
      const release = createDeferred();
      releases.push(release);
      await release.promise;
      active -= 1;
      return value * 2;
    });

    const mapped = mapWithConcurrency([1, 2, 3, 4], mapper, 2);
    await waitForMockCallCount(mapper, 2);
    expect(mapper).toHaveBeenCalledTimes(2);
    expect(peakActive).toBe(2);

    releases.splice(0).forEach((release) => release.resolve());
    await waitForMockCallCount(mapper, 4);
    expect(mapper).toHaveBeenCalledTimes(4);
    expect(peakActive).toBe(2);

    releases.splice(0).forEach((release) => release.resolve());
    await expect(mapped).resolves.toEqual([2, 4, 6, 8]);
    expect(active).toBe(0);
  });

  it('normalizes invalid concurrency values to one', async () => {
    const calls: number[] = [];
    await expect(
      mapWithConcurrency([1, 2, 3], async (value) => {
        calls.push(value);
        return value;
      }, 0)
    ).resolves.toEqual([1, 2, 3]);
    expect(calls).toEqual([1, 2, 3]);
  });
});
