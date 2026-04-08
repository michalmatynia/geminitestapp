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
        connection: {
          playwrightHeadless: true,
        } as never,
      })
    ).toBe('headed');

    expect(
      resolveRequestedVintedBrowserPreference({
        requestedBrowserPreference: undefined,
        source: 'manual',
        connection: {
          playwrightBrowser: 'auto',
        } as never,
      })
    ).toBe('brave');
  });

  it('preserves scheduler/runtime fallbacks and launch metadata normalization', () => {
    expect(
      resolveRequestedVintedBrowserMode({
        requestedBrowserMode: undefined,
        source: 'scheduler',
        connection: {
          playwrightHeadless: true,
        } as never,
      })
    ).toBe('headless');

    expect(
      resolveRequestedVintedBrowserPreference({
        requestedBrowserPreference: undefined,
        source: 'scheduler',
        connection: {
          playwrightBrowser: 'chromium',
        } as never,
      })
    ).toBe('chromium');

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
