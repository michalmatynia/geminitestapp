import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildProductScannerEngineRequestOptions } from './product-scanner-settings';

describe('product scanner engine request options', () => {
  it('uses integration-style default settings when no persona is selected', () => {
    const result = buildProductScannerEngineRequestOptions({
      playwrightPersonaId: null,
      playwrightBrowser: 'chromium',
      playwrightSettingsOverrides: {},
    });

    expect(result).toEqual({
      settingsOverrides: expect.objectContaining({
        headless: true,
        slowMo: 0,
        timeout: 30000,
        navigationTimeout: 30000,
        humanizeMouse: true,
      }),
    });
  });

  it('sends only explicit overrides when a persona is selected', () => {
    const result = buildProductScannerEngineRequestOptions({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      playwrightSettingsOverrides: {
        headless: false,
        timeout: 45000,
      },
    });

    expect(result).toEqual({
      personaId: 'persona-1',
      settingsOverrides: {
        headless: false,
        timeout: 45000,
      },
      launchOptions: {
        channel: 'chrome',
      },
    });
  });
});
