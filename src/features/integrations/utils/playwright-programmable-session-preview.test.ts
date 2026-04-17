import { describe, expect, it } from 'vitest';

import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
  type PlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import { defaultIntegrationConnectionPlaywrightSettings } from './playwright-connection-settings';

import {
  applyActionExecutionSettingsToPlaywrightSettings,
  buildProgrammableSessionPreview,
} from './playwright-programmable-session-preview';

const buildAction = (
  overrides: Partial<PlaywrightAction>
): PlaywrightAction =>
  normalizePlaywrightAction({
    id: 'action-1',
    name: 'Action 1',
    description: null,
    runtimeKey: null,
    blocks: [],
    stepSetIds: [],
    personaId: null,
    executionSettings: defaultPlaywrightActionExecutionSettings,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z',
    ...overrides,
  });

describe('playwright programmable session preview', () => {
  it('applies action-owned execution settings on top of the persona baseline', () => {
    const result = applyActionExecutionSettingsToPlaywrightSettings({
      baseSettings: defaultIntegrationConnectionPlaywrightSettings,
      action: buildAction({
        executionSettings: {
          headless: false,
          slowMo: 120,
          timeout: 45_000,
          navigationTimeout: 46_000,
          locale: 'sv-SE',
          timezoneId: 'Europe/Stockholm',
          emulateDevice: true,
          deviceName: 'Pixel 7',
        },
      }),
    });

    expect(result).toMatchObject({
      headless: false,
      slowMo: 120,
      timeout: 45_000,
      navigationTimeout: 46_000,
      locale: 'sv-SE',
      timezoneId: 'Europe/Stockholm',
      emulateDevice: true,
      deviceName: 'Pixel 7',
    });
  });

  it('builds an effective session preview from the selected action plus connection overrides', () => {
    const preview = buildProgrammableSessionPreview({
      actions: [
        buildAction({
          id: 'custom-programmable-action',
          name: 'Custom Programmable Session',
          executionSettings: {
            headless: false,
            browserPreference: 'brave',
            slowMo: 80,
            timeout: 35_000,
            navigationTimeout: 36_000,
            locale: 'en-GB',
          },
          blocks: [
            {
              id: 'custom-programmable-action__browser_preparation',
              kind: 'runtime_step',
              refId: 'browser_preparation',
              enabled: true,
              label: null,
              config: {
                viewportWidth: 1440,
                viewportHeight: 900,
                settleDelayMs: 1200,
                permissions: ['geolocation'],
              },
            },
          ],
        }),
      ],
      selectedActionId: 'custom-programmable-action',
      defaultRuntimeKey: 'playwright_programmable_listing',
      personaBaseline: defaultIntegrationConnectionPlaywrightSettings,
      currentSettings: {
        ...defaultIntegrationConnectionPlaywrightSettings,
        locale: 'pl-PL',
        timezoneId: 'Europe/Warsaw',
        humanizeMouse: false,
      },
    });

    expect(preview.isDefault).toBe(false);
    expect(preview.action.id).toBe('custom-programmable-action');
    expect(preview.actionSettingsSummary).toEqual(
      expect.arrayContaining([
        'Headed',
        'Browser: brave',
        'SlowMo: 80ms',
        'Timeout: 35000ms',
        'Navigation timeout: 36000ms',
        'Locale: en-GB',
      ])
    );
    expect(preview.browserPreparationSummary).toEqual(
      expect.arrayContaining([
        'Viewport: 1440x900',
        'Settle delay: 1200ms',
        'Permissions: geolocation',
      ])
    );
    expect(preview.effectiveSummary).toEqual(
      expect.arrayContaining([
        'Headed',
        'Browser: brave',
        'Locale: pl-PL',
        'Timezone: Europe/Warsaw',
        'SlowMo: 80ms',
      ])
    );
    expect(preview.overrideSummary).toEqual(
      expect.arrayContaining(['Locale', 'Timezone', 'Humanize mouse'])
    );
  });
});
