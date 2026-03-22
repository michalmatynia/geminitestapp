import { describe, expect, it } from 'vitest';

import { createKangurMobileNativeHostReport } from './check-kangur-mobile-native-host';

describe('createKangurMobileNativeHostReport', () => {
  it('reports ok when both iOS and Android toolchains are ready', () => {
    expect(
      createKangurMobileNativeHostReport({
        androidState: {
          adbAvailable: true,
          androidHome: '/sdk',
          androidSdkRoot: '/sdk',
          emulatorAvailable: true,
        },
        iosState: {
          developerDir: '/Applications/Xcode.app/Contents/Developer',
          simctlAvailable: true,
          xcodebuildAvailable: true,
        },
      }),
    ).toEqual({
      android: {
        issues: [],
        nextSteps: [],
        resolved: {
          androidHome: '/sdk',
          androidSdkRoot: '/sdk',
        },
        status: 'ok',
      },
      ios: {
        issues: [],
        resolved: {
          developerDir: '/Applications/Xcode.app/Contents/Developer',
        },
        status: 'ok',
      },
      nextSteps: [],
      status: 'ok',
    });
  });

  it('reports error when either platform toolchain is blocked', () => {
    const report = createKangurMobileNativeHostReport({
      androidState: {
        adbAvailable: false,
        androidHome: null,
        androidSdkRoot: null,
        emulatorAvailable: false,
      },
      iosState: {
        developerDir: '/Applications/Xcode.app/Contents/Developer',
        simctlAvailable: true,
        xcodebuildAvailable: true,
      },
    });

    expect(report.status).toBe('error');
    expect(report.ios.status).toBe('ok');
    expect(report.android.status).toBe('error');
    expect(report.nextSteps).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Install Android Studio'),
        expect.stringContaining('Set ANDROID_SDK_ROOT'),
        expect.stringContaining('check:mobile:android:toolchain'),
      ]),
    );
  });
});
