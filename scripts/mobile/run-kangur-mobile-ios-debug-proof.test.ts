import { describe, expect, it } from 'vitest';

import {
  buildKangurMobileIosDebugProofSteps,
  buildKangurMobileIosDebugProofManualCommands,
  createKangurMobileIosDebugProofSimctlFailureHint,
  createKangurMobileIosDebugProofUrl,
  parseKangurMobileIosDebugProofOptions,
  shouldRetryKangurMobileIosDebugProofSimctl,
} from './run-kangur-mobile-ios-debug-proof';

describe('parseKangurMobileIosDebugProofOptions', () => {
  it('parses explicit args and normalizes the Expo URL', () => {
    expect(
      parseKangurMobileIosDebugProofOptions([
        '--device',
        'booted',
        '--expo-url',
        'exp://127.0.0.1:8081/--',
        '--operation',
        'calendar',
        '--output-dir',
        '/tmp/kangur-proof',
        '--step',
        'results',
        '--wait-ms',
        '5000',
      ]),
    ).toEqual({
      device: 'booted',
      dryRun: false,
      expoUrl: 'exp://127.0.0.1:8081',
      operation: 'calendar',
      outputDir: '/tmp/kangur-proof',
      step: 'results',
      waitMs: 5000,
    });
  });

  it('supports the dry-run flag', () => {
    expect(
      parseKangurMobileIosDebugProofOptions(['--dry-run']).dryRun,
    ).toBe(true);
  });

  it('defaults to all steps when --step is omitted', () => {
    expect(parseKangurMobileIosDebugProofOptions([]).step).toBeNull();
  });

  it('rejects unknown steps', () => {
    expect(() =>
      parseKangurMobileIosDebugProofOptions(['--step', 'unknown']),
    ).toThrowError('Invalid --step value');
  });
});

describe('buildKangurMobileIosDebugProofSteps', () => {
  it('creates the native proof route sequence in the expected order', () => {
    expect(buildKangurMobileIosDebugProofSteps('clock')).toEqual([
      expect.objectContaining({
        fileName: '01-practice-summary.png',
        route: '/practice?operation=clock&debugAutoComplete=perfect',
      }),
      expect.objectContaining({
        fileName: '02-results.png',
        route:
          '/practice?operation=clock&debugAutoComplete=perfect&debugRedirectTo=results',
      }),
      expect.objectContaining({
        fileName: '03-leaderboard.png',
        route:
          '/practice?operation=clock&debugAutoComplete=perfect&debugRedirectTo=leaderboard',
      }),
      expect.objectContaining({
        fileName: '04-profile.png',
        route:
          '/practice?operation=clock&debugAutoComplete=perfect&debugRedirectTo=profile',
      }),
      expect.objectContaining({
        fileName: '05-plan.png',
        route:
          '/practice?operation=clock&debugAutoComplete=perfect&debugRedirectTo=plan',
      }),
      expect.objectContaining({
        fileName: '06-home.png',
        route:
          '/practice?operation=clock&debugAutoComplete=perfect&debugRedirectTo=home',
      }),
    ]);
  });

  it('filters the proof sequence to a single requested step', () => {
    expect(buildKangurMobileIosDebugProofSteps('clock', 'home')).toEqual([
      expect.objectContaining({
        fileName: '06-home.png',
        key: 'home',
        route:
          '/practice?operation=clock&debugAutoComplete=perfect&debugRedirectTo=home',
      }),
    ]);
  });
});

describe('createKangurMobileIosDebugProofUrl', () => {
  it('builds an Expo deep link for the given route', () => {
    expect(
      createKangurMobileIosDebugProofUrl(
        'exp://127.0.0.1:8081/--',
        '/practice?operation=clock',
      ),
    ).toBe('exp://127.0.0.1:8081/--/practice?operation=clock');
  });
});

describe('buildKangurMobileIosDebugProofManualCommands', () => {
  it('creates the direct simctl fallback command chain', () => {
    expect(
      buildKangurMobileIosDebugProofManualCommands({
        device: 'booted',
        screenshotPath: '/tmp/proof-home.png',
        url: 'exp://127.0.0.1:8081/--/practice?operation=clock',
        waitMs: 8000,
      }),
    ).toEqual([
      "xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/practice?operation=clock'",
      'sleep 8',
      'xcrun simctl io booted screenshot /tmp/proof-home.png',
    ]);
  });
});

describe('shouldRetryKangurMobileIosDebugProofSimctl', () => {
  it('detects the transient CoreSimulatorService failure output', () => {
    expect(
      shouldRetryKangurMobileIosDebugProofSimctl(
        'CoreSimulatorService connection became invalid. Unable to locate device set.',
      ),
    ).toBe(true);
  });

  it('returns false for unrelated output', () => {
    expect(
      shouldRetryKangurMobileIosDebugProofSimctl('Wrote screenshot to file.'),
    ).toBe(false);
  });
});

describe('createKangurMobileIosDebugProofSimctlFailureHint', () => {
  it('returns a recovery hint for repeated CoreSimulatorService failures', () => {
    expect(
      createKangurMobileIosDebugProofSimctlFailureHint(
        'CoreSimulatorService connection became invalid. Unable to locate device set.',
      ),
    ).toContain('Run "xcrun simctl list devices" once');
  });

  it('returns null for unrelated simctl failures', () => {
    expect(
      createKangurMobileIosDebugProofSimctlFailureHint('Permission denied.'),
    ).toBeNull();
  });
});
