import { describe, expect, it } from 'vitest';

import { defaultIntegrationConnectionPlaywrightSettings } from './playwright-connection-settings';
import { toPlaywrightConnectionOverridePayload } from './playwright-connection-payload';

describe('playwright-connection-payload', () => {
  it('only persists Playwright fields that differ from the selected baseline', () => {
    expect(
      toPlaywrightConnectionOverridePayload({
        settings: {
          ...defaultIntegrationConnectionPlaywrightSettings,
          slowMo: 125,
          clickDelayMax: 220,
        },
        baselineSettings: defaultIntegrationConnectionPlaywrightSettings,
      })
    ).toEqual({
      playwrightSlowMo: 125,
      playwrightClickDelayMax: 220,
    });
  });

  it('requests override reset when settings match the baseline exactly', () => {
    expect(
      toPlaywrightConnectionOverridePayload({
        settings: defaultIntegrationConnectionPlaywrightSettings,
        baselineSettings: defaultIntegrationConnectionPlaywrightSettings,
        includeResetFlag: true,
      })
    ).toEqual({
      resetPlaywrightOverrides: true,
    });
  });
});
