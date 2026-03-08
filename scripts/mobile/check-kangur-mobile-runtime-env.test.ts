import { describe, expect, it } from 'vitest';

import {
  analyzeKangurMobileRuntimeEnv,
  parseRuntimeTarget,
} from './check-kangur-mobile-runtime-env';

describe('parseRuntimeTarget', () => {
  it('defaults to device when no target is provided', () => {
    expect(parseRuntimeTarget([])).toBe('device');
  });

  it('parses supported targets', () => {
    expect(parseRuntimeTarget(['--target', 'ios-simulator'])).toBe(
      'ios-simulator',
    );
    expect(parseRuntimeTarget(['--target=ios-simulator'])).toBe(
      'ios-simulator',
    );
    expect(parseRuntimeTarget(['--target', 'android-emulator'])).toBe(
      'android-emulator',
    );
    expect(parseRuntimeTarget(['--target', 'device'])).toBe('device');
  });

  it('rejects unknown targets', () => {
    expect(() => parseRuntimeTarget(['--target', 'tv'])).toThrow(
      /Invalid --target value/,
    );
  });
});

describe('analyzeKangurMobileRuntimeEnv', () => {
  it('accepts localhost for iOS simulator learner-session validation', () => {
    const report = analyzeKangurMobileRuntimeEnv(
      {
        EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
        EXPO_PUBLIC_KANGUR_AUTH_MODE: 'learner-session',
      },
      'ios-simulator',
    );

    expect(report.status).toBe('ok');
    expect(report.issues).toEqual([]);
  });

  it('rejects localhost for Android emulator validation', () => {
    const report = analyzeKangurMobileRuntimeEnv(
      {
        EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
        EXPO_PUBLIC_KANGUR_AUTH_MODE: 'learner-session',
      },
      'android-emulator',
    );

    expect(report.status).toBe('error');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('10.0.2.2'),
        }),
      ]),
    );
  });

  it('rejects loopback urls for physical devices', () => {
    const report = analyzeKangurMobileRuntimeEnv(
      {
        EXPO_PUBLIC_KANGUR_API_URL: 'http://127.0.0.1:3000',
        EXPO_PUBLIC_KANGUR_AUTH_MODE: 'learner-session',
      },
      'device',
    );

    expect(report.status).toBe('error');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('Physical devices'),
        }),
      ]),
    );
  });

  it('requires learner-session auth mode for native validation', () => {
    const report = analyzeKangurMobileRuntimeEnv(
      {
        EXPO_PUBLIC_KANGUR_API_URL: 'http://192.168.1.20:3000',
        EXPO_PUBLIC_KANGUR_AUTH_MODE: 'development',
      },
      'device',
    );

    expect(report.status).toBe('error');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('learner-session'),
        }),
      ]),
    );
  });

  it('warns when a physical device uses plain HTTP on a reachable host', () => {
    const report = analyzeKangurMobileRuntimeEnv(
      {
        EXPO_PUBLIC_KANGUR_API_URL: 'http://192.168.1.20:3000',
        EXPO_PUBLIC_KANGUR_AUTH_MODE: 'learner-session',
      },
      'device',
    );

    expect(report.status).toBe('ok');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'warning',
          message: expect.stringContaining('plain HTTP'),
        }),
      ]),
    );
  });
});
