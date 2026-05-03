import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_CHROMIUM_ANTI_DETECTION_ARGS,
  DEFAULT_CHROMIUM_ANTI_DETECTION_IGNORED_DEFAULT_ARGS,
  DEFAULT_CHROMIUM_ANTI_DETECTION_USER_AGENT,
  SEARCH_CHROMIUM_ANTI_DETECTION_USER_AGENT,
  buildChromiumAntiDetectionContextOptions,
  buildChromiumAntiDetectionLaunchOptions,
  installChromiumAntiDetectionInitScript,
  resolveChromiumAntiDetectionRuntimeBehavior,
} from './anti-detection';

describe('buildChromiumAntiDetectionLaunchOptions', () => {
  it('adds safe Chromium stealth launch defaults without dropping existing values', () => {
    expect(
      buildChromiumAntiDetectionLaunchOptions({
        channel: 'chrome',
        args: ['--window-size=1440,900'],
        ignoreDefaultArgs: ['--mute-audio'],
      })
    ).toEqual({
      channel: 'chrome',
      args: ['--window-size=1440,900', ...DEFAULT_CHROMIUM_ANTI_DETECTION_ARGS],
      ignoreDefaultArgs: [
        '--mute-audio',
        ...DEFAULT_CHROMIUM_ANTI_DETECTION_IGNORED_DEFAULT_ARGS,
      ],
    });
  });

  it('respects explicit ignoreDefaultArgs=true', () => {
    expect(
      buildChromiumAntiDetectionLaunchOptions({
        ignoreDefaultArgs: true,
      }).ignoreDefaultArgs
    ).toBe(true);
  });
});

describe('buildChromiumAntiDetectionContextOptions', () => {
  it('provides a realistic user agent and locale-aligned accept-language header', () => {
    expect(
      buildChromiumAntiDetectionContextOptions({
        locale: 'en-US',
      })
    ).toEqual({
      locale: 'en-US',
      userAgent: DEFAULT_CHROMIUM_ANTI_DETECTION_USER_AGENT,
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  });

  it('preserves explicit user agent and accept-language header', () => {
    expect(
      buildChromiumAntiDetectionContextOptions({
        userAgent: 'Custom UA',
        locale: 'de-DE',
        extraHTTPHeaders: {
          'Accept-Language': 'de-DE,de;q=0.8',
        },
      })
    ).toEqual({
      userAgent: 'Custom UA',
      locale: 'de-DE',
      extraHTTPHeaders: {
        'Accept-Language': 'de-DE,de;q=0.8',
      },
    });
  });

  it('fills hostile target defaults from the selected identity profile when values are unset', () => {
    expect(
      buildChromiumAntiDetectionContextOptions({}, 'search')
    ).toEqual({
      locale: 'en-US',
      timezoneId: 'America/New_York',
      userAgent: SEARCH_CHROMIUM_ANTI_DETECTION_USER_AGENT,
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  });
});

describe('installChromiumAntiDetectionInitScript', () => {
  it('installs a single init script with derived navigator metadata', async () => {
    const addInitScript = vi.fn(async () => undefined);

    await installChromiumAntiDetectionInitScript(
      { addInitScript } as never,
      {
        locale: 'pl-PL',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      }
    );

    expect(addInitScript).toHaveBeenCalledTimes(1);
    expect(addInitScript).toHaveBeenCalledWith(expect.any(Function), {
      locale: 'pl-PL',
      navigatorLanguages: ['pl-PL', 'pl'],
      navigatorPlatform: 'Win32',
      userAgentDataPlatform: 'Windows',
      webGlIdentity: {
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
      },
      brands: [
        { brand: 'Chromium', version: '131' },
        { brand: 'Google Chrome', version: '131' },
        { brand: 'Not_A Brand', version: '24' },
      ],
    });
  });
});

describe('resolveChromiumAntiDetectionRuntimeBehavior', () => {
  it('prewarms generic hostile search profiles on the same origin before the real start url', () => {
    expect(
      resolveChromiumAntiDetectionRuntimeBehavior({
        identityProfile: 'search',
        startUrl: 'https://allowed.example.com/search?q=lamp',
      })
    ).toEqual({
      prewarmUrl: 'https://allowed.example.com/',
      prewarmWaitMs: 1400,
      postStartUrlWaitMs: 900,
      launchCooldownMs: 2200,
    });
  });

  it('uses a stronger pacing profile for Google-owned search origins', () => {
    expect(
      resolveChromiumAntiDetectionRuntimeBehavior({
        identityProfile: 'search',
        startUrl: 'https://www.google.com/imghp?hl=en',
      })
    ).toEqual({
      prewarmUrl: 'https://www.google.com/',
      prewarmWaitMs: 2200,
      postStartUrlWaitMs: 1400,
      launchCooldownMs: 3200,
    });
  });

  it('skips prewarm for default profiles and localhost targets', () => {
    expect(
      resolveChromiumAntiDetectionRuntimeBehavior({
        identityProfile: 'default',
        startUrl: 'https://www.amazon.com/dp/B00TEST123',
      })
    ).toEqual({
      prewarmUrl: null,
      prewarmWaitMs: 600,
      postStartUrlWaitMs: 450,
      launchCooldownMs: 1200,
    });
    expect(
      resolveChromiumAntiDetectionRuntimeBehavior({
        identityProfile: 'marketplace',
        startUrl: 'http://localhost:3000/test',
      })
    ).toEqual({
      prewarmUrl: null,
      prewarmWaitMs: 1100,
      postStartUrlWaitMs: 750,
      launchCooldownMs: 1800,
    });
  });
});
