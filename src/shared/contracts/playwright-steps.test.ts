import { describe, expect, it } from 'vitest';

import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
  playwrightActionSchema,
  type PlaywrightAction,
} from './playwright-steps';

describe('playwright action normalization', () => {
  it('hydrates legacy step-set-only actions into ordered action blocks', () => {
    const parsed = playwrightActionSchema.parse({
      id: 'action_legacy',
      name: 'Legacy action',
      description: null,
      runtimeKey: null,
      stepSetIds: ['set_auth', 'set_list'],
      personaId: null,
      createdAt: '2026-04-16T08:00:00.000Z',
      updatedAt: '2026-04-16T08:00:00.000Z',
    });

    const normalized = normalizePlaywrightAction(parsed);

    expect(normalized.blocks).toEqual([
      {
        id: 'action_legacy__step_set__0',
        kind: 'step_set',
        refId: 'set_auth',
        enabled: true,
        label: null,
        config: {
          viewportWidth: null,
          viewportHeight: null,
          settleDelayMs: null,
          locale: null,
          timezoneId: null,
          userAgent: null,
          colorScheme: null,
          reducedMotion: null,
          geolocationLatitude: null,
          geolocationLongitude: null,
          permissions: [],
        },
      },
      {
        id: 'action_legacy__step_set__1',
        kind: 'step_set',
        refId: 'set_list',
        enabled: true,
        label: null,
        config: {
          viewportWidth: null,
          viewportHeight: null,
          settleDelayMs: null,
          locale: null,
          timezoneId: null,
          userAgent: null,
          colorScheme: null,
          reducedMotion: null,
          geolocationLatitude: null,
          geolocationLongitude: null,
          permissions: [],
        },
      },
    ]);
    expect(normalized.stepSetIds).toEqual(['set_auth', 'set_list']);
    expect(normalized.executionSettings).toEqual(defaultPlaywrightActionExecutionSettings);
  });

  it('derives legacy stepSetIds from step-set blocks while preserving direct step blocks', () => {
    const action: PlaywrightAction = {
      id: 'action_mixed',
      name: 'Mixed action',
      description: null,
      runtimeKey: 'tradera_quicklist_list',
      blocks: [
        {
          id: 'block_step',
          kind: 'step',
          refId: 'step_login',
          enabled: true,
          label: null,
          config: {
            viewportWidth: null,
            viewportHeight: null,
            settleDelayMs: null,
            locale: null,
            timezoneId: null,
            userAgent: null,
            colorScheme: null,
            reducedMotion: null,
            geolocationLatitude: null,
            geolocationLongitude: null,
            permissions: [],
          },
        },
        {
          id: 'block_set',
          kind: 'step_set',
          refId: 'set_publish',
          enabled: false,
          label: 'Publish bundle',
          config: {
            viewportWidth: 1440,
            viewportHeight: 900,
            settleDelayMs: null,
            locale: null,
            timezoneId: null,
            userAgent: null,
            colorScheme: null,
            reducedMotion: null,
            geolocationLatitude: null,
            geolocationLongitude: null,
            permissions: [],
          },
        },
      ],
      stepSetIds: [],
      personaId: 'persona_1',
      executionSettings: {
        ...defaultPlaywrightActionExecutionSettings,
        headless: false,
        emulateDevice: true,
        deviceName: 'Pixel 7',
      },
      createdAt: '2026-04-16T08:00:00.000Z',
      updatedAt: '2026-04-16T08:00:00.000Z',
    };

    const normalized = normalizePlaywrightAction(action);

    expect(normalized.blocks).toEqual(action.blocks);
    expect(normalized.stepSetIds).toEqual(['set_publish']);
    expect(normalized.runtimeKey).toBe('tradera_quicklist_list');
    expect(normalized.executionSettings.headless).toBe(false);
    expect(normalized.executionSettings.deviceName).toBe('Pixel 7');
  });

  it('normalizes extended execution settings for proxy and humanization controls', () => {
    const parsed = playwrightActionSchema.parse({
      id: 'action_extended',
      name: 'Extended action',
      description: null,
      runtimeKey: null,
      blocks: [],
      stepSetIds: [],
      personaId: null,
      executionSettings: {
        identityProfile: 'marketplace',
        headless: false,
        locale: '  pl-PL  ',
        timezoneId: '  Europe/Warsaw  ',
        humanizeMouse: true,
        mouseJitter: 7,
        clickDelayMin: 30,
        clickDelayMax: 120,
        inputDelayMin: 10,
        inputDelayMax: 60,
        actionDelayMin: 300,
        actionDelayMax: 900,
        proxyEnabled: true,
        proxyServer: '  http://proxy.internal  ',
        proxyUsername: '  proxy-user  ',
        proxyPassword: '  proxy-pass  ',
        proxySessionAffinity: true,
        proxySessionMode: 'rotate',
        proxyProviderPreset: 'brightdata',
      },
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    });

    const normalized = normalizePlaywrightAction(parsed);

    expect(normalized.executionSettings).toMatchObject({
      identityProfile: 'marketplace',
      headless: false,
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw',
      humanizeMouse: true,
      mouseJitter: 7,
      clickDelayMin: 30,
      clickDelayMax: 120,
      inputDelayMin: 10,
      inputDelayMax: 60,
      actionDelayMin: 300,
      actionDelayMax: 900,
      proxyEnabled: true,
      proxyServer: 'http://proxy.internal',
      proxyUsername: 'proxy-user',
      proxyPassword: 'proxy-pass',
      proxySessionAffinity: true,
      proxySessionMode: 'rotate',
      proxyProviderPreset: 'brightdata',
    });
  });
});
