import { describe, expect, it } from 'vitest';

import {
  buildIntegrationConnectionPlaywrightSettings,
  defaultIntegrationConnectionPlaywrightSettings,
  normalizeIntegrationPlaywrightPersonas,
  resolveIntegrationPlaywrightPersonaSettings,
} from './playwright-settings-baseline';

describe('playwright settings baseline', () => {
  it('uses the canonical Playwright defaults for humanized sessions', () => {
    expect(defaultIntegrationConnectionPlaywrightSettings).toMatchObject({
      identityProfile: 'default',
      headless: true,
      slowMo: 0,
      timeout: 30000,
      navigationTimeout: 30000,
      locale: '',
      timezoneId: '',
      humanizeMouse: true,
      mouseJitter: 5,
      clickDelayMin: 50,
      clickDelayMax: 150,
      inputDelayMin: 20,
      inputDelayMax: 80,
      actionDelayMin: 500,
      actionDelayMax: 1500,
      proxyEnabled: false,
      proxySessionAffinity: false,
      proxySessionMode: 'sticky',
      proxyProviderPreset: 'custom',
      emulateDevice: false,
      deviceName: 'Desktop Chrome',
    });
  });

  it('applies partial settings on top of the canonical baseline', () => {
    expect(
      buildIntegrationConnectionPlaywrightSettings({
        identityProfile: 'search',
        locale: 'en-US',
        slowMo: 125,
      })
    ).toMatchObject({
      identityProfile: 'search',
      locale: 'en-US',
      slowMo: 125,
      humanizeMouse: true,
      actionDelayMin: 500,
    });
  });

  it('normalizes stored personas against the canonical Playwright baseline', () => {
    const personas = normalizeIntegrationPlaywrightPersonas([
      {
        id: 'persona-1',
        name: ' Catalog runner ',
        settings: {
          identityProfile: 'search',
          locale: 'en-US',
          slowMo: 125,
        },
      },
    ]);

    expect(personas).toEqual([
      expect.objectContaining({
        id: 'persona-1',
        name: 'Catalog runner',
        settings: expect.objectContaining({
          identityProfile: 'search',
          locale: 'en-US',
          slowMo: 125,
          humanizeMouse: true,
          timeout: 30000,
          actionDelayMin: 500,
        }),
      }),
    ]);
  });

  it('resolves persona baselines against the canonical Playwright baseline', () => {
    const personas = normalizeIntegrationPlaywrightPersonas([
      {
        id: 'persona-1',
        name: 'Human runner',
        settings: {
          identityProfile: 'marketplace',
          humanizeMouse: false,
          timezoneId: 'Europe/Warsaw',
          slowMo: 125,
        },
      },
    ]);

    expect(resolveIntegrationPlaywrightPersonaSettings(personas, 'persona-1')).toMatchObject({
      humanizeMouse: false,
      identityProfile: 'marketplace',
      timezoneId: 'Europe/Warsaw',
      slowMo: 125,
      actionDelayMin: 500,
      deviceName: 'Desktop Chrome',
    });

    expect(resolveIntegrationPlaywrightPersonaSettings(personas, null)).toEqual(
      defaultIntegrationConnectionPlaywrightSettings
    );
  });
});
