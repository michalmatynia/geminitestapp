import { describe, expect, it } from 'vitest';

import {
  extractExpoDevelopmentHost,
  resolveKangurMobileApiBaseUrl,
} from './kangurRuntimeApiBaseUrl';

describe('extractExpoDevelopmentHost', () => {
  it('extracts the hostname from Expo hostUri values', () => {
    expect(
      extractExpoDevelopmentHost({
        hostUri: '192.168.0.33:8081',
      }),
    ).toBe('192.168.0.33');
  });

  it('falls back to the Expo linking URI when hostUri is missing', () => {
    expect(
      extractExpoDevelopmentHost({
        hostUri: null,
        linkingUri: 'exp://192.168.0.44:8081/--/',
      }),
    ).toBe('192.168.0.44');
  });
});

describe('resolveKangurMobileApiBaseUrl', () => {
  it('keeps explicit reachable env URLs unchanged', () => {
    expect(
      resolveKangurMobileApiBaseUrl({
        configuredApiBaseUrl: 'https://kangur.example.com',
        developmentHost: '192.168.0.33',
        platformOs: 'ios',
      }),
    ).toEqual({
      apiBaseUrl: 'https://kangur.example.com',
      apiBaseUrlSource: 'env',
    });
  });

  it('rewrites loopback env URLs to the Expo development host on native devices', () => {
    expect(
      resolveKangurMobileApiBaseUrl({
        configuredApiBaseUrl: 'http://localhost:3000',
        developmentHost: '192.168.0.33',
        platformOs: 'ios',
      }),
    ).toEqual({
      apiBaseUrl: 'http://192.168.0.33:3000',
      apiBaseUrlSource: 'expo-development-host',
    });
  });

  it('normalizes Android localhost env URLs to the emulator host when no Expo LAN host exists', () => {
    expect(
      resolveKangurMobileApiBaseUrl({
        configuredApiBaseUrl: 'http://localhost:3000',
        developmentHost: null,
        platformOs: 'android',
      }),
    ).toEqual({
      apiBaseUrl: 'http://10.0.2.2:3000',
      apiBaseUrlSource: 'android-emulator-default',
    });
  });

  it('derives the default native API URL from the Expo development host when env is unset', () => {
    expect(
      resolveKangurMobileApiBaseUrl({
        configuredApiBaseUrl: null,
        developmentHost: '192.168.0.33',
        platformOs: 'android',
      }),
    ).toEqual({
      apiBaseUrl: 'http://192.168.0.33:3000',
      apiBaseUrlSource: 'expo-development-host-default',
    });
  });

  it('keeps web defaults stable when env is unset', () => {
    expect(
      resolveKangurMobileApiBaseUrl({
        configuredApiBaseUrl: null,
        developmentHost: '192.168.0.33',
        platformOs: 'web',
      }),
    ).toEqual({
      apiBaseUrl: 'http://localhost:3000',
      apiBaseUrlSource: 'localhost-default',
    });
  });
});
