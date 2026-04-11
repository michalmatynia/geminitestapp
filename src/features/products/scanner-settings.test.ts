import { describe, expect, it } from 'vitest';

import { defaultIntegrationConnectionPlaywrightSettings } from '@/features/integrations/utils/playwright-connection-settings';

import {
  buildPersistedProductScannerSettings,
  buildProductScannerSettingsDraft,
  parseProductScannerSettings,
} from './scanner-settings';

describe('product scanner settings helpers', () => {
  const personas = [
    {
      id: 'persona-1',
      settings: {
        ...defaultIntegrationConnectionPlaywrightSettings,
        headless: false,
        slowMo: 25,
      },
    },
  ] as const;

  it('builds an effective draft from persona baseline plus explicit overrides', () => {
    const draft = buildProductScannerSettingsDraft(
      {
        playwrightPersonaId: 'persona-1',
        playwrightBrowser: 'chrome',
        playwrightSettingsOverrides: {
          timeout: 45000,
        },
      },
      personas
    );

    expect(draft).toEqual({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      playwrightSettings: expect.objectContaining({
        headless: false,
        slowMo: 25,
        timeout: 45000,
      }),
    });
  });

  it('persists only explicit overrides when the draft matches the selected persona baseline', () => {
    const persisted = buildPersistedProductScannerSettings(
      {
        playwrightPersonaId: 'persona-1',
        playwrightBrowser: 'brave',
        playwrightSettings: {
          ...defaultIntegrationConnectionPlaywrightSettings,
          headless: false,
          slowMo: 25,
        },
      },
      personas
    );

    expect(persisted).toEqual({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'brave',
      playwrightSettingsOverrides: {},
    });
  });

  it('migrates legacy persisted full settings into overrides', () => {
    const settings = parseProductScannerSettings(
      JSON.stringify({
        playwrightPersonaId: 'persona-1',
        playwrightBrowser: 'chrome',
        playwrightSettings: {
          ...defaultIntegrationConnectionPlaywrightSettings,
          headless: false,
          timeout: 45000,
        },
      })
    );

    expect(settings).toEqual({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      playwrightSettingsOverrides: expect.objectContaining({
        headless: false,
        timeout: 45000,
      }),
    });

    expect(
      buildProductScannerSettingsDraft(settings, personas).playwrightSettings
    ).toEqual(
      expect.objectContaining({
        headless: false,
        slowMo: 0,
        timeout: 45000,
      })
    );
  });
});
