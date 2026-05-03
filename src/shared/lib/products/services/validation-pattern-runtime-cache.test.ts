/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getProductDataProvider: vi.fn(),
  getValidationPatternRepository: vi.fn(),
  ensureDefaultProductValidationPatterns: vi.fn(),
}));

vi.mock('./product-provider', () => ({
  getProductDataProvider: mocks.getProductDataProvider,
}));

vi.mock('./validation-pattern-repository', () => ({
  getValidationPatternRepository: mocks.getValidationPatternRepository,
}));

vi.mock('./validation-pattern-defaults', () => ({
  ensureDefaultProductValidationPatterns: mocks.ensureDefaultProductValidationPatterns,
}));

import {
  invalidateValidationPatternRuntimeCache,
  listValidationPatternsCached,
} from './validation-pattern-runtime-cache';

describe('validation-pattern-runtime-cache', () => {
  beforeEach(() => {
    invalidateValidationPatternRuntimeCache();
    mocks.getProductDataProvider.mockReset().mockResolvedValue('mongodb');
    mocks.ensureDefaultProductValidationPatterns.mockReset();
    mocks.getValidationPatternRepository.mockReset().mockResolvedValue({
      listPatterns: vi.fn(),
      createPattern: vi.fn(),
    });
    mocks.ensureDefaultProductValidationPatterns.mockImplementation(
      async ({
        repository,
      }: {
        repository: {
          listPatterns: () => Promise<Array<{ id: string; label: string }>>;
        };
      }) => ({
        patterns: await repository.listPatterns(),
        createdPatternIds: [],
      })
    );
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T19:45:00.000Z'));
  });

  afterEach(() => {
    invalidateValidationPatternRuntimeCache();
    vi.useRealTimers();
  });

  it('caches patterns by provider until the ttl expires', async () => {
    const listPatterns = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'pattern-1', label: 'Alpha' }])
      .mockResolvedValueOnce([{ id: 'pattern-2', label: 'Beta' }]);
    mocks.getValidationPatternRepository
      .mockResolvedValueOnce({ listPatterns, createPattern: vi.fn() })
      .mockResolvedValueOnce({ listPatterns, createPattern: vi.fn() });

    const first = await listValidationPatternsCached();
    const second = await listValidationPatternsCached();

    vi.advanceTimersByTime(15_001);
    const third = await listValidationPatternsCached();

    expect(first).toEqual([{ id: 'pattern-1', label: 'Alpha' }]);
    expect(second).toEqual(first);
    expect(third).toEqual([{ id: 'pattern-2', label: 'Beta' }]);
    expect(mocks.getProductDataProvider).toHaveBeenCalledTimes(3);
    expect(mocks.getValidationPatternRepository).toHaveBeenCalledTimes(2);
    expect(mocks.getValidationPatternRepository).toHaveBeenNthCalledWith(1, 'mongodb');
    expect(mocks.getValidationPatternRepository).toHaveBeenNthCalledWith(2, 'mongodb');
    expect(mocks.ensureDefaultProductValidationPatterns).toHaveBeenCalledTimes(2);
  });

  it('reuses a single inflight fetch for concurrent requests', async () => {
    let resolvePatterns: ((value: Array<{ id: string; label: string }>) => void) | undefined;
    const pending = new Promise<Array<{ id: string; label: string }>>((resolve) => {
      resolvePatterns = resolve;
    });
    const listPatterns = vi.fn().mockReturnValueOnce(pending);
    mocks.getValidationPatternRepository.mockResolvedValueOnce({
      listPatterns,
      createPattern: vi.fn(),
    });

    const first = listValidationPatternsCached({ providerOverride: 'mongodb' as never });
    const second = listValidationPatternsCached({ providerOverride: 'mongodb' as never });

    expect(mocks.getValidationPatternRepository).toHaveBeenCalledTimes(1);

    resolvePatterns?.([{ id: 'pattern-3', label: 'Gamma' }]);

    await expect(Promise.all([first, second])).resolves.toEqual([
      [{ id: 'pattern-3', label: 'Gamma' }],
      [{ id: 'pattern-3', label: 'Gamma' }],
    ]);
    expect(listPatterns).toHaveBeenCalledTimes(1);
    expect(mocks.ensureDefaultProductValidationPatterns).toHaveBeenCalledTimes(1);
  });

  it('invalidates provider-specific and global cache entries', async () => {
    const listPatterns = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'provider-a-1', label: 'A1' }])
      .mockResolvedValueOnce([{ id: 'provider-b-1', label: 'B1' }])
      .mockResolvedValueOnce([{ id: 'provider-a-2', label: 'A2' }])
      .mockResolvedValueOnce([{ id: 'provider-b-2', label: 'B2' }]);
    mocks.getValidationPatternRepository
      .mockResolvedValueOnce({ listPatterns, createPattern: vi.fn() })
      .mockResolvedValueOnce({ listPatterns, createPattern: vi.fn() })
      .mockResolvedValueOnce({ listPatterns, createPattern: vi.fn() })
      .mockResolvedValueOnce({ listPatterns, createPattern: vi.fn() });

    await listValidationPatternsCached({ providerOverride: 'provider-a' as never });
    await listValidationPatternsCached({ providerOverride: 'provider-b' as never });

    invalidateValidationPatternRuntimeCache('provider-a' as never);

    const providerAAfterInvalidate = await listValidationPatternsCached({
      providerOverride: 'provider-a' as never,
    });
    const providerBCached = await listValidationPatternsCached({
      providerOverride: 'provider-b' as never,
    });

    invalidateValidationPatternRuntimeCache();

    const providerBAfterGlobalInvalidate = await listValidationPatternsCached({
      providerOverride: 'provider-b' as never,
    });

    expect(providerAAfterInvalidate).toEqual([{ id: 'provider-a-2', label: 'A2' }]);
    expect(providerBCached).toEqual([{ id: 'provider-b-1', label: 'B1' }]);
    expect(providerBAfterGlobalInvalidate).toEqual([{ id: 'provider-b-2', label: 'B2' }]);
    expect(mocks.getValidationPatternRepository).toHaveBeenCalledTimes(4);
    expect(mocks.ensureDefaultProductValidationPatterns).toHaveBeenCalledTimes(4);
  });
});
