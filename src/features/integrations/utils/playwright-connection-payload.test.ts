import { describe, expect, it } from 'vitest';

import { defaultIntegrationConnectionPlaywrightSettings } from './playwright-connection-settings';
import { toPlaywrightConnectionOverridePayload } from './playwright-connection-payload';

describe('playwright-connection-payload', () => {
  it('only persists Playwright fields that differ from the selected baseline', () => {
    expect(
      toPlaywrightConnectionOverridePayload({
        settings: {
          ...defaultIntegrationConnectionPlaywrightSettings,
          identityProfile: 'search',
          locale: 'en-US',
          slowMo: 125,
          clickDelayMax: 220,
          proxySessionAffinity: true,
          proxySessionMode: 'rotate',
          proxyProviderPreset: 'brightdata',
        },
        baselineSettings: defaultIntegrationConnectionPlaywrightSettings,
      })
    ).toEqual({
      playwrightIdentityProfile: 'search',
      playwrightLocale: 'en-US',
      playwrightSlowMo: 125,
      playwrightClickDelayMax: 220,
      playwrightProxySessionAffinity: true,
      playwrightProxySessionMode: 'rotate',
      playwrightProxyProviderPreset: 'brightdata',
    });
  });

  it('persists cleared locale and timezone overrides when they move back to empty values', () => {
    expect(
      toPlaywrightConnectionOverridePayload({
        settings: {
          ...defaultIntegrationConnectionPlaywrightSettings,
          identityProfile: 'default',
          locale: '',
          timezoneId: '',
        },
        baselineSettings: {
          ...defaultIntegrationConnectionPlaywrightSettings,
          identityProfile: 'marketplace',
          locale: 'en-US',
          timezoneId: 'Europe/Warsaw',
        },
      })
    ).toEqual({
      playwrightIdentityProfile: 'default',
      playwrightLocale: '',
      playwrightTimezoneId: '',
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
