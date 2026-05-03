import { describe, expect, it } from 'vitest';

import {
  normalizeIntegrationPlaywrightPersonas,
  resolveIntegrationPlaywrightPersonaSettings,
} from './playwright-settings-baseline';
import { extractIntegrationConnectionPlaywrightSettingsOverrides } from './playwright-legacy-connection-overrides';

describe('playwright legacy connection overrides', () => {
  it('extracts explicit legacy connection overrides only', () => {
    expect(
      extractIntegrationConnectionPlaywrightSettingsOverrides({
        playwrightHumanizeMouse: false,
        playwrightIdentityProfile: 'marketplace',
        playwrightClickDelayMin: 10,
        playwrightActionDelayMax: 900,
        playwrightTimezoneId: 'Europe/Warsaw',
        playwrightProxySessionAffinity: true,
        playwrightProxySessionMode: 'rotate',
        playwrightProxyProviderPreset: 'brightdata',
      })
    ).toMatchObject({
      humanizeMouse: false,
      identityProfile: 'marketplace',
      clickDelayMin: 10,
      actionDelayMax: 900,
      proxySessionAffinity: true,
      proxySessionMode: 'rotate',
      proxyProviderPreset: 'brightdata',
      timezoneId: 'Europe/Warsaw',
    });
  });

  it('keeps persona baselines separate from extracted legacy connection overrides', () => {
    const personas = normalizeIntegrationPlaywrightPersonas([
      {
        id: 'persona-1',
        name: 'Human runner',
        settings: {
          identityProfile: 'search',
          humanizeMouse: false,
          locale: 'en-US',
          slowMo: 125,
          actionDelayMin: 700,
        },
      },
    ]);

    expect(resolveIntegrationPlaywrightPersonaSettings(personas, 'persona-1')).toMatchObject({
      locale: 'en-US',
      identityProfile: 'search',
      slowMo: 125,
      humanizeMouse: false,
      actionDelayMin: 700,
    });

    expect(
      extractIntegrationConnectionPlaywrightSettingsOverrides({
        playwrightPersonaId: 'persona-1',
        playwrightClickDelayMin: 10,
        playwrightActionDelayMax: 900,
      })
    ).toMatchObject({
      clickDelayMin: 10,
      actionDelayMax: 900,
    });
  });
});
