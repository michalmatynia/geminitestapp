import { describe, expect, it } from 'vitest';

import { defaultIntegrationConnectionPlaywrightSettings } from '@/features/integrations/utils/playwright-connection-settings';

import {
  buildPersistedProductScannerSettings,
  buildProductScannerSettingsDraft,
  createDefaultProductScannerSettings,
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
        captchaBehavior: 'auto_show_browser',
        manualVerificationTimeoutMs: 180000,
        amazonCandidateEvaluator: {
          mode: 'brain_default',
          modelId: null,
          threshold: 0.8,
          onlyForAmbiguousCandidates: false,
          systemPrompt: null,
        },
        playwrightSettingsOverrides: {
          timeout: 45000,
        },
      },
      personas
    );

    expect(draft).toEqual({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 180000,
      amazonCandidateEvaluator: {
        mode: 'brain_default',
        modelId: null,
        threshold: 0.8,
        onlyForAmbiguousCandidates: false,
        systemPrompt: null,
      },
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
        captchaBehavior: 'fail',
        manualVerificationTimeoutMs: 120000,
        amazonCandidateEvaluator: {
          mode: 'model_override',
          modelId: 'gpt-4.1',
          threshold: 0.9,
          onlyForAmbiguousCandidates: false,
          systemPrompt: null,
        },
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
      captchaBehavior: 'fail',
      manualVerificationTimeoutMs: 120000,
      playwrightSettingsOverrides: {},
      amazonCandidateEvaluator: {
        mode: 'model_override',
        modelId: 'gpt-4.1',
        threshold: 0.9,
        onlyForAmbiguousCandidates: false,
        systemPrompt: null,
      },
    });
  });

  it('migrates legacy persisted full settings into overrides', () => {
    const settings = parseProductScannerSettings(
      JSON.stringify({
        playwrightPersonaId: 'persona-1',
        playwrightBrowser: 'chrome',
        manualVerificationTimeoutMs: 60000,
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
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 60000,
      amazonCandidateEvaluator: {
        mode: 'disabled',
        modelId: null,
        threshold: 0.7,
        onlyForAmbiguousCandidates: true,
        systemPrompt: null,
      },
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

  it('uses headed Amazon scanner defaults when no persona is selected', () => {
    const draft = buildProductScannerSettingsDraft(createDefaultProductScannerSettings(), null);

    expect(draft.playwrightBrowser).toBe('auto');
    expect(draft.playwrightSettings).toEqual(
      expect.objectContaining({
        headless: false,
        humanizeMouse: true,
        deviceName: 'Desktop Chrome',
      })
    );

    expect(buildPersistedProductScannerSettings(draft, null)).toEqual({
      playwrightPersonaId: null,
      playwrightBrowser: 'auto',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 240000,
      playwrightSettingsOverrides: {},
      amazonCandidateEvaluator: {
        mode: 'disabled',
        modelId: null,
        threshold: 0.7,
        onlyForAmbiguousCandidates: true,
        systemPrompt: null,
      },
    });
  });
});
