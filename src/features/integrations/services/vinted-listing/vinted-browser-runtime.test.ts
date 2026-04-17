import { describe, expect, it } from 'vitest';

import {
  buildVintedHistoryFields,
  resolveEffectiveBrowserPreferenceFromLabel,
  resolveEffectiveVintedBrowserMode,
  resolveRequestedVintedBrowserMode,
  resolveRequestedVintedBrowserPreference,
} from './vinted-browser-runtime';

describe('vinted-browser-runtime', () => {
  it('defaults user-triggered runs to headed Brave even when generic Playwright defaults are headless/auto', () => {
    expect(
      resolveRequestedVintedBrowserMode({
        requestedBrowserMode: undefined,
        source: 'api',
      })
    ).toBe('headed');

    expect(
      resolveRequestedVintedBrowserPreference({
        requestedBrowserPreference: undefined,
        source: 'manual',
      })
    ).toBe('brave');
  });

  it('preserves scheduler/runtime fallbacks and launch metadata normalization', () => {
    expect(
      resolveRequestedVintedBrowserMode({
        requestedBrowserMode: undefined,
        source: 'scheduler',
      })
    ).toBe('connection_default');

    expect(
      resolveRequestedVintedBrowserPreference({
        requestedBrowserPreference: undefined,
        source: 'scheduler',
      })
    ).toBeUndefined();

    expect(
      resolveEffectiveVintedBrowserMode({
        requestedBrowserMode: 'connection_default',
        connectionHeadless: false,
      })
    ).toBe('headed');

    expect(
      resolveEffectiveBrowserPreferenceFromLabel({
        launchLabel: 'Chromium (bundled)',
        requestedBrowserPreference: 'brave',
      })
    ).toBe('chromium');

    expect(buildVintedHistoryFields('headed')).toEqual(['browser_mode:headed']);
  });
});
