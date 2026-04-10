import { describe, expect, it } from 'vitest';

import {
  buildIntegrationConnectionPlaywrightSettings,
  defaultIntegrationConnectionPlaywrightSettings,
  normalizeIntegrationPlaywrightPersonas,
  resolveIntegrationConnectionPlaywrightBrowserWithPersona,
  resolveIntegrationConnectionPlaywrightSettings,
  resolveIntegrationConnectionPlaywrightSettingsWithPersona,
  resolveIntegrationPlaywrightPersonaBrowser,
  resolveIntegrationPlaywrightPersonaSettings,
} from './playwright-connection-settings';

describe('playwright connection settings', () => {
  it('uses the canonical integration defaults for humanized Playwright connections', () => {
    expect(defaultIntegrationConnectionPlaywrightSettings).toMatchObject({
      headless: true,
      slowMo: 0,
      timeout: 30000,
      navigationTimeout: 30000,
      humanizeMouse: true,
      mouseJitter: 5,
      clickDelayMin: 50,
      clickDelayMax: 150,
      inputDelayMin: 20,
      inputDelayMax: 80,
      actionDelayMin: 500,
      actionDelayMax: 1500,
      proxyEnabled: false,
      emulateDevice: false,
      deviceName: 'Desktop Chrome',
    });
  });

  it('applies partial persona or connection overrides on top of the canonical integration defaults', () => {
    expect(
      buildIntegrationConnectionPlaywrightSettings({
        slowMo: 125,
      })
    ).toMatchObject({
      slowMo: 125,
      humanizeMouse: true,
      actionDelayMin: 500,
    });

    expect(
      resolveIntegrationConnectionPlaywrightSettings({
        playwrightHumanizeMouse: false,
        playwrightClickDelayMin: 10,
        playwrightActionDelayMax: 900,
      })
    ).toMatchObject({
      humanizeMouse: false,
      clickDelayMin: 10,
      clickDelayMax: 150,
      actionDelayMin: 500,
      actionDelayMax: 900,
    });
  });

  it('normalizes stored personas against the canonical integration defaults', () => {
    const personas = normalizeIntegrationPlaywrightPersonas([
      {
        id: 'persona-1',
        name: ' Catalog runner ',
        settings: {
          slowMo: 125,
        },
      },
    ]);

    expect(personas).toEqual([
      expect.objectContaining({
        id: 'persona-1',
        name: 'Catalog runner',
        settings: expect.objectContaining({
          slowMo: 125,
          humanizeMouse: true,
          timeout: 30000,
          actionDelayMin: 500,
        }),
      }),
    ]);
  });

  it('resolves persona baselines against the canonical integration defaults', () => {
    const personas = normalizeIntegrationPlaywrightPersonas([
      {
        id: 'persona-1',
        name: 'Human runner',
        settings: {
          humanizeMouse: false,
          slowMo: 125,
        },
      },
    ]);

    expect(resolveIntegrationPlaywrightPersonaSettings(personas, 'persona-1')).toMatchObject({
      humanizeMouse: false,
      slowMo: 125,
      actionDelayMin: 500,
      deviceName: 'Desktop Chrome',
    });

    expect(resolveIntegrationPlaywrightPersonaSettings(personas, null)).toEqual(
      defaultIntegrationConnectionPlaywrightSettings
    );
  });

  it('resolves connection settings from persona baseline plus explicit connection overrides', () => {
    const personas = normalizeIntegrationPlaywrightPersonas([
      {
        id: 'persona-1',
        name: 'Human runner',
        settings: {
          humanizeMouse: false,
          slowMo: 125,
          actionDelayMin: 700,
        },
      },
    ]);

    expect(
      resolveIntegrationConnectionPlaywrightSettingsWithPersona(
        {
          playwrightPersonaId: 'persona-1',
          playwrightClickDelayMin: 10,
          playwrightActionDelayMax: 900,
        },
        personas
      )
    ).toMatchObject({
      slowMo: 125,
      humanizeMouse: false,
      clickDelayMin: 10,
      clickDelayMax: 150,
      actionDelayMin: 700,
      actionDelayMax: 900,
    });
  });

  it('resolves browser from the persona baseline and lets explicit connection overrides win', () => {
    const personas = normalizeIntegrationPlaywrightPersonas([
      {
        id: 'persona-1',
        name: 'Chrome runner',
        settings: {
          browser: 'chrome',
        } as never,
      },
    ]);

    expect(resolveIntegrationPlaywrightPersonaBrowser(personas, 'persona-1')).toBe('chrome');
    expect(
      resolveIntegrationConnectionPlaywrightBrowserWithPersona(
        {
          playwrightPersonaId: 'persona-1',
        },
        personas
      )
    ).toBe('chrome');
    expect(
      resolveIntegrationConnectionPlaywrightBrowserWithPersona(
        {
          playwrightPersonaId: 'persona-1',
          playwrightBrowser: 'brave',
        },
        personas
      )
    ).toBe('brave');
  });
});
