import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/ai/server-settings', () => ({
  getSettingValue: vi.fn(),
}));

import { getSettingValue } from '@/shared/lib/ai/server-settings';

import {
  buildProductScannerEngineRequestOptions,
  resolveProductScannerHeadless,
} from './product-scanner-settings';

describe('product scanner engine request options', () => {
  it('uses Amazon scanner defaults when no persona is selected', () => {
    const result = buildProductScannerEngineRequestOptions({
      playwrightPersonaId: null,
      playwrightBrowser: 'chromium',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 240000,
      playwrightSettingsOverrides: {},
    });

    expect(result).toEqual({
      settingsOverrides: expect.objectContaining({
        headless: false,
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
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 240000,
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

  it('resolves headless from the selected persona baseline when no explicit override exists', async () => {
    vi.mocked(getSettingValue).mockResolvedValueOnce(
      JSON.stringify([
        {
          id: 'persona-1',
          name: 'Headed Persona',
          settings: {
            headless: false,
          },
        },
      ])
    );

    await expect(
      resolveProductScannerHeadless({
        playwrightPersonaId: 'persona-1',
        playwrightBrowser: 'chromium',
        captchaBehavior: 'auto_show_browser',
        manualVerificationTimeoutMs: 240000,
        playwrightSettingsOverrides: {},
      })
    ).resolves.toBe(false);
  });
});
