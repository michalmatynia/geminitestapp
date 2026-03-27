import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/lib/api-client';

import {
  buildImageSelection,
  formatDatetimeDisplay,
  formatDatetimeLocal,
  isTransientError,
  matchesImageAsset,
  mergeImageAssets,
  parseDatetimeLocal,
  resolveImagePreview,
  withRetry,
} from './AdminKangurSocialPage.Constants';

describe('AdminKangurSocialPage.Constants', () => {
  it('formats and parses datetime values safely', () => {
    expect(formatDatetimeLocal('2026-03-27T10:15:00.000Z')).toBe('2026-03-27T10:15');
    expect(formatDatetimeLocal('not-a-date')).toBe('');
    expect(formatDatetimeDisplay('2026-03-27T10:15:00.000Z')).toContain('2026');
    expect(formatDatetimeDisplay('')).toBe('');
    expect(parseDatetimeLocal('2026-03-27T10:15')).toBe(
      new Date('2026-03-27T10:15').toISOString()
    );
    expect(parseDatetimeLocal('   ')).toBeNull();
  });

  it('builds, merges, and matches image selections', () => {
    const first = buildImageSelection('/uploads/first.png');
    const second = buildImageSelection('/uploads/second.png');

    expect(first).toEqual({
      id: '/uploads/first.png',
      filepath: '/uploads/first.png',
      url: '/uploads/first.png',
      filename: 'first.png',
    });
    expect(
      resolveImagePreview({
        url: '/var/tmp/libapp-uploads/kangur/social-addons/shot.png',
      })
    ).toBe('/api/kangur/social-image-addons/serve?filename=shot.png');

    const merged = mergeImageAssets([first], [first, second]);
    expect(merged).toEqual([first, second]);
    expect(matchesImageAsset(first, { id: '/uploads/first.png' })).toBe(true);
    expect(matchesImageAsset(first, second)).toBe(false);
  });

  it('retries only transient failures', async () => {
    const transientError = new ApiError('retry later', 503);
    const attempt = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce('ok');

    await expect(
      withRetry(attempt, {
        maxAttempts: 2,
        delayMs: 0,
      })
    ).resolves.toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(2);

    expect(isTransientError(new ApiError('timeout', 504))).toBe(true);
    expect(isTransientError(new Error('Failed to fetch resource'))).toBe(true);
    expect(isTransientError(new Error('validation failed'))).toBe(false);
  });
});
