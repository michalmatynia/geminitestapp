import { describe, expect, it, vi } from 'vitest';

import {
  executeMongoWriteWithRetry,
  isMongoSingleWriterConflictError,
} from './mongo-write-retry';

describe('mongo write retry', () => {
  it('detects single-writer adapter conflicts from the adapter error text', () => {
    expect(
      isMongoSingleWriterConflictError(
        new Error('Another write batch or compaction is already active')
      )
    ).toBe(true);
    expect(
      isMongoSingleWriterConflictError(
        new Error('Only a single write operations is allowed at a time')
      )
    ).toBe(true);
    expect(isMongoSingleWriterConflictError(new Error('duplicate key'))).toBe(false);
  });

  it('retries a write that temporarily fails with the single-writer conflict', async () => {
    const write = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(
        new Error('Another write batch or compaction is already active')
      )
      .mockResolvedValueOnce('ok');

    await expect(
      executeMongoWriteWithRetry(write, {
        queueKey: 'retry-success',
        retryDelayMs: 0,
        maxRetryDelayMs: 0,
      })
    ).resolves.toBe('ok');

    expect(write).toHaveBeenCalledTimes(2);
  });

  it('does not retry unrelated Mongo write errors', async () => {
    const write = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error('duplicate key'));

    await expect(
      executeMongoWriteWithRetry(write, {
        queueKey: 'no-retry-unrelated',
        retryDelayMs: 0,
        maxRetryDelayMs: 0,
      })
    ).rejects.toThrow('duplicate key');

    expect(write).toHaveBeenCalledTimes(1);
  });

  it('rethrows after exhausting the retry budget', async () => {
    const error = new Error('Only a single write operations is allowed at a time');
    const write = vi.fn<() => Promise<string>>().mockRejectedValue(error);

    await expect(
      executeMongoWriteWithRetry(write, {
        maxAttempts: 3,
        queueKey: 'retry-exhausted',
        retryDelayMs: 0,
        maxRetryDelayMs: 0,
      })
    ).rejects.toBe(error);

    expect(write).toHaveBeenCalledTimes(3);
  });

  it('serializes writes that share the same queue key', async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | null = null;
    let markFirstStarted: (() => void) | null = null;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });

    const first = executeMongoWriteWithRetry(
      async () => {
        order.push('first:start');
        markFirstStarted?.();
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
        order.push('first:end');
        return 'first';
      },
      {
        queueKey: 'shared-queue',
        retryDelayMs: 0,
        maxRetryDelayMs: 0,
      }
    );

    const second = executeMongoWriteWithRetry(
      async () => {
        order.push('second:start');
        order.push('second:end');
        return 'second';
      },
      {
        queueKey: 'shared-queue',
        retryDelayMs: 0,
        maxRetryDelayMs: 0,
      }
    );

    await firstStarted;
    expect(order).toEqual(['first:start']);

    releaseFirst?.();
    await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second']);
    expect(order).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
  });
});
