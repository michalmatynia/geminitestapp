import { describe, expect, it } from 'vitest';

import { analyzeKangurMobileAndroidToolchain } from './check-kangur-mobile-android-toolchain';

describe('analyzeKangurMobileAndroidToolchain', () => {
  it('passes when adb and emulator are available', () => {
    expect(
      analyzeKangurMobileAndroidToolchain({
        adbAvailable: true,
        androidHome: '/Users/test/Library/Android/sdk',
        androidSdkRoot: '/Users/test/Library/Android/sdk',
        emulatorAvailable: true,
      }),
    ).toEqual({
      issues: [],
      nextSteps: [],
      resolved: {
        androidHome: '/Users/test/Library/Android/sdk',
        androidSdkRoot: '/Users/test/Library/Android/sdk',
      },
      status: 'ok',
    });
  });

  it('fails when adb and emulator are both unavailable', () => {
    const report = analyzeKangurMobileAndroidToolchain({
      adbAvailable: false,
      androidHome: null,
      androidSdkRoot: null,
      emulatorAvailable: false,
    });

    expect(report.status).toBe('error');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'warning',
          message: expect.stringContaining('ANDROID_SDK_ROOT and ANDROID_HOME are both unset'),
        }),
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('adb is unavailable'),
        }),
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('emulator is unavailable'),
        }),
      ]),
    );
    expect(report.nextSteps).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Install Android Studio'),
        expect.stringContaining('export ANDROID_SDK_ROOT='),
        expect.stringContaining('export PATH="$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"'),
        'Re-run npm run check:mobile:android:toolchain.',
        'Then run npm run check:mobile:native:runtime:android.',
        'Then run npm run dev:mobile:android:local.',
      ]),
    );
  });

  it('warns when ANDROID_SDK_ROOT and ANDROID_HOME differ', () => {
    const report = analyzeKangurMobileAndroidToolchain({
      adbAvailable: true,
      androidHome: '/sdk-home',
      androidSdkRoot: '/sdk-root',
      emulatorAvailable: true,
    });

    expect(report.status).toBe('ok');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'warning',
          message: expect.stringContaining('point to different locations'),
        }),
      ]),
    );
    expect(report.nextSteps).toEqual([]);
  });
});
