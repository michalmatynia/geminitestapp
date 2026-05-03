import { describe, expect, it } from 'vitest';

import {
  resolvePlaywrightHistoryBrowserMode,
  resolvePlaywrightListingEffectiveBrowserMode,
  resolvePlaywrightPersistedExternalListingId,
} from './listing-outcome';

describe('playwright listing outcome helpers', () => {
  it('resolves only the effective browser mode from result metadata', () => {
    expect(
      resolvePlaywrightListingEffectiveBrowserMode({
        metadata: {
          browserMode: 'headed',
          requestedBrowserMode: 'headless',
        },
      })
    ).toBe('headed');

    expect(
      resolvePlaywrightListingEffectiveBrowserMode({
        metadata: {
          requestedBrowserMode: 'headless',
        },
      })
    ).toBeNull();
  });

  it('prefers the effective browser mode from result metadata', () => {
    expect(
      resolvePlaywrightHistoryBrowserMode({
        metadata: {
          browserMode: 'headed',
          requestedBrowserMode: 'headless',
        },
      })
    ).toBe('headed');
  });

  it('falls back to requested browser mode and explicit fallback values', () => {
    expect(
      resolvePlaywrightHistoryBrowserMode({
        metadata: {
          requestedBrowserMode: ' headless ',
        },
      })
    ).toBe('headless');

    expect(
      resolvePlaywrightHistoryBrowserMode({
        metadata: {},
        fallback: ' connection_default ',
      })
    ).toBe('connection_default');
  });

  it('prefers fresh external listing ids and otherwise preserves the persisted one', () => {
    expect(
      resolvePlaywrightPersistedExternalListingId({
        existingExternalListingId: 'old-1',
        resultExternalListingId: 'new-1',
      })
    ).toBe('new-1');

    expect(
      resolvePlaywrightPersistedExternalListingId({
        existingExternalListingId: ' old-2 ',
        resultExternalListingId: null,
      })
    ).toBe('old-2');

    expect(
      resolvePlaywrightPersistedExternalListingId({
        existingExternalListingId: '',
        resultExternalListingId: null,
      })
    ).toBeNull();
  });
});
