import { describe, expect, it } from 'vitest';

import {
  createKangurMobileNativeRuntimeEnvForTarget,
  resolveKangurMobileNativeRuntimeBackendApiUrl,
  createKangurMobileNativeRuntimeReadinessReport,
  createKangurMobileNativeRuntimeReadinessScopedReport,
  parseKangurMobileNativeRuntimeReadinessScope,
  shouldUseKangurMobileLocalLaunchEnv,
} from './check-kangur-mobile-native-runtime-readiness';

describe('parseKangurMobileNativeRuntimeReadinessScope', () => {
  it('defaults to all when no target is provided', () => {
    expect(parseKangurMobileNativeRuntimeReadinessScope([])).toBe('all');
  });

  it('parses supported targets', () => {
    expect(
      parseKangurMobileNativeRuntimeReadinessScope(['--target', 'ios-simulator']),
    ).toBe('ios-simulator');
    expect(
      parseKangurMobileNativeRuntimeReadinessScope(['--target=android-emulator']),
    ).toBe('android-emulator');
    expect(
      parseKangurMobileNativeRuntimeReadinessScope(['--target', 'device']),
    ).toBe('device');
  });

  it('rejects unknown targets', () => {
    expect(() =>
      parseKangurMobileNativeRuntimeReadinessScope(['--target', 'tv']),
    ).toThrow(/Invalid --target value/);
  });
});

describe('shouldUseKangurMobileLocalLaunchEnv', () => {
  it('detects the local launch env flag', () => {
    expect(
      shouldUseKangurMobileLocalLaunchEnv(['--target', 'android-emulator', '--local-launch-env']),
    ).toBe(true);
    expect(shouldUseKangurMobileLocalLaunchEnv(['--target', 'android-emulator'])).toBe(
      false,
    );
  });
});

describe('createKangurMobileNativeRuntimeEnvForTarget', () => {
  it('normalizes localhost to 10.0.2.2 for android local-launch checks', () => {
    expect(
      createKangurMobileNativeRuntimeEnvForTarget(
        {
          EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
        },
        'android-emulator',
        {
          localLaunchEnv: true,
        },
      ).EXPO_PUBLIC_KANGUR_API_URL,
    ).toBe('http://10.0.2.2:3000');
  });

  it('normalizes localhost to the LAN host for device local-launch checks', () => {
    expect(
      createKangurMobileNativeRuntimeEnvForTarget(
        {
          EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
        },
        'device',
        {
          deviceLanHost: '192.168.1.20',
          localLaunchEnv: true,
        },
      ).EXPO_PUBLIC_KANGUR_API_URL,
    ).toBe('http://192.168.1.20:3000');
  });

  it('leaves env unchanged when local-launch mode is off', () => {
    expect(
      createKangurMobileNativeRuntimeEnvForTarget(
        {
          EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
        },
        'android-emulator',
      ).EXPO_PUBLIC_KANGUR_API_URL,
    ).toBe('http://localhost:3000');
  });
});

describe('resolveKangurMobileNativeRuntimeBackendApiUrl', () => {
  it('keeps localhost for android host-side backend probes', () => {
    expect(
      resolveKangurMobileNativeRuntimeBackendApiUrl(
        {
          EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
        },
        'android-emulator',
        {
          localLaunchEnv: true,
        },
      ),
    ).toBe('http://localhost:3000');
  });

  it('converts 10.0.2.2 back to localhost for android host-side probes', () => {
    expect(
      resolveKangurMobileNativeRuntimeBackendApiUrl(
        {
          EXPO_PUBLIC_KANGUR_API_URL: 'http://10.0.2.2:3000',
        },
        'android-emulator',
        {
          localLaunchEnv: true,
        },
      ),
    ).toBe('http://localhost:3000');
  });

  it('uses the LAN host for device backend probes when local-launch mode is on', () => {
    expect(
      resolveKangurMobileNativeRuntimeBackendApiUrl(
        {
          EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
        },
        'device',
        {
          deviceLanHost: '192.168.1.20',
          localLaunchEnv: true,
        },
      ),
    ).toBe('http://192.168.1.20:3000');
  });
});

describe('createKangurMobileNativeRuntimeReadinessReport', () => {
  it('reports ok when host, runtime, and backend are all ready', () => {
    expect(
      createKangurMobileNativeRuntimeReadinessReport({
        backend: {
          apiUrl: 'http://localhost:3000',
          probeUrl: 'http://localhost:3000/api/kangur/auth/me',
          responseStatus: 401,
          status: 'ok',
        },
        host: {
          android: {
            issues: [],
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
        },
        runtime: {
          'android-emulator': {
            issues: [],
            resolved: {
              apiUrl: 'http://10.0.2.2:3000',
              authMode: 'learner-session',
              hostname: '10.0.2.2',
              target: 'android-emulator',
            },
            status: 'ok',
          },
          device: {
            issues: [],
            resolved: {
              apiUrl: 'http://192.168.1.20:3000',
              authMode: 'learner-session',
              hostname: '192.168.1.20',
              target: 'device',
            },
            status: 'ok',
          },
          'ios-simulator': {
            issues: [],
            resolved: {
              apiUrl: 'http://localhost:3000',
              authMode: 'learner-session',
              hostname: 'localhost',
              target: 'ios-simulator',
            },
            status: 'ok',
          },
        },
      }),
    ).toEqual({
      backend: {
        apiUrl: 'http://localhost:3000',
        probeUrl: 'http://localhost:3000/api/kangur/auth/me',
        responseStatus: 401,
        status: 'ok',
      },
      host: {
        android: {
          issues: [],
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
      },
      nextSteps: [],
      runtime: {
        'android-emulator': {
          issues: [],
          resolved: {
            apiUrl: 'http://10.0.2.2:3000',
            authMode: 'learner-session',
            hostname: '10.0.2.2',
            target: 'android-emulator',
          },
          status: 'ok',
        },
        device: {
          issues: [],
          resolved: {
            apiUrl: 'http://192.168.1.20:3000',
            authMode: 'learner-session',
            hostname: '192.168.1.20',
            target: 'device',
          },
          status: 'ok',
        },
        'ios-simulator': {
          issues: [],
          resolved: {
            apiUrl: 'http://localhost:3000',
            authMode: 'learner-session',
            hostname: 'localhost',
            target: 'ios-simulator',
          },
          status: 'ok',
        },
      },
      status: 'ok',
    });
  });

  it('reports warning when the backend probe is skipped in the sandbox', () => {
    const report = createKangurMobileNativeRuntimeReadinessReport({
      backend: {
        apiUrl: 'http://localhost:3000',
        probeUrl: 'http://localhost:3000/api/kangur/auth/me',
        responseStatus: null,
        status: 'skipped',
      },
      host: {
        android: {
          issues: [],
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
      },
      runtime: {
        'android-emulator': {
          issues: [],
          resolved: {
            apiUrl: 'http://10.0.2.2:3000',
            authMode: 'learner-session',
            hostname: '10.0.2.2',
            target: 'android-emulator',
          },
          status: 'ok',
        },
        device: {
          issues: [],
          resolved: {
            apiUrl: 'http://192.168.1.20:3000',
            authMode: 'learner-session',
            hostname: '192.168.1.20',
            target: 'device',
          },
          status: 'ok',
        },
        'ios-simulator': {
          issues: [],
          resolved: {
            apiUrl: 'http://localhost:3000',
            authMode: 'learner-session',
            hostname: 'localhost',
            target: 'ios-simulator',
          },
          status: 'ok',
        },
      },
    });

    expect(report.status).toBe('warning');
    expect(report.nextSteps).toContain(
      'Re-run npm run check:mobile:runtime:backend outside the Codex sandbox or in your normal shell before native validation.',
    );
  });

  it('reports error when host, runtime, or backend checks are blocked', () => {
    const report = createKangurMobileNativeRuntimeReadinessReport({
      backend: {
        apiUrl: 'http://localhost:3000',
        probeUrl: 'http://localhost:3000/api/kangur/auth/me',
        responseStatus: null,
        status: 'error',
      },
      host: {
        android: {
          issues: [
            {
              level: 'error',
              message: 'adb is unavailable',
            },
          ],
          resolved: {
            androidHome: null,
            androidSdkRoot: null,
          },
          status: 'error',
        },
        ios: {
          issues: [],
          resolved: {
            developerDir: '/Applications/Xcode.app/Contents/Developer',
          },
          status: 'ok',
        },
        nextSteps: ['Install Android Studio with Android platform-tools and the Android Emulator.'],
        status: 'error',
      },
      runtime: {
        'android-emulator': {
          issues: [
            {
              level: 'error',
              message: 'Use http://10.0.2.2:3000.',
            },
          ],
          resolved: {
            apiUrl: 'http://localhost:3000',
            authMode: 'learner-session',
            hostname: 'localhost',
            target: 'android-emulator',
          },
          status: 'error',
        },
        device: {
          issues: [],
          resolved: {
            apiUrl: 'http://192.168.1.20:3000',
            authMode: 'learner-session',
            hostname: '192.168.1.20',
            target: 'device',
          },
          status: 'ok',
        },
        'ios-simulator': {
          issues: [],
          resolved: {
            apiUrl: 'http://localhost:3000',
            authMode: 'learner-session',
            hostname: 'localhost',
            target: 'ios-simulator',
          },
          status: 'ok',
        },
      },
    }, {
      deviceLanHost: '192.168.1.20',
    });

    expect(report.status).toBe('error');
    expect(report.nextSteps).toEqual(
      expect.arrayContaining([
        'Install Android Studio with Android platform-tools and the Android Emulator.',
        'Set EXPO_PUBLIC_KANGUR_API_URL=http://10.0.2.2:3000 for Android emulator validation, then re-run npm run check:mobile:runtime:android.',
        'Start the Kangur backend, confirm EXPO_PUBLIC_KANGUR_API_URL, then re-run npm run check:mobile:runtime:backend.',
      ]),
    );
  });

  it('suggests a LAN IP for device validation when localhost is configured', () => {
    const report = createKangurMobileNativeRuntimeReadinessReport({
      backend: {
        apiUrl: 'http://localhost:3000',
        probeUrl: 'http://localhost:3000/api/kangur/auth/me',
        responseStatus: 401,
        status: 'ok',
      },
      host: {
        android: {
          issues: [],
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
      },
      runtime: {
        'android-emulator': {
          issues: [],
          resolved: {
            apiUrl: 'http://10.0.2.2:3000',
            authMode: 'learner-session',
            hostname: '10.0.2.2',
            target: 'android-emulator',
          },
          status: 'ok',
        },
        device: {
          issues: [
            {
              level: 'error',
              message: 'Physical devices cannot reach localhost.',
            },
          ],
          resolved: {
            apiUrl: 'http://localhost:3000',
            authMode: 'learner-session',
            hostname: 'localhost',
            target: 'device',
          },
          status: 'error',
        },
        'ios-simulator': {
          issues: [],
          resolved: {
            apiUrl: 'http://localhost:3000',
            authMode: 'learner-session',
            hostname: 'localhost',
            target: 'ios-simulator',
          },
          status: 'ok',
        },
      },
    }, {
      deviceLanHost: '192.168.1.20',
    });

    expect(report.nextSteps).toContain(
      'Set EXPO_PUBLIC_KANGUR_API_URL=http://192.168.1.20:3000 for physical-device validation, then re-run npm run check:mobile:runtime:device.',
    );
  });
});

describe('createKangurMobileNativeRuntimeReadinessScopedReport', () => {
  it('limits ios scope to iOS host/runtime concerns', () => {
    const fullReport = createKangurMobileNativeRuntimeReadinessReport({
      backend: {
        apiUrl: 'http://localhost:3000',
        probeUrl: 'http://localhost:3000/api/kangur/auth/me',
        responseStatus: null,
        status: 'skipped',
      },
      host: {
        android: {
          issues: [
            {
              level: 'error',
              message: 'adb is unavailable',
            },
          ],
          resolved: {
            androidHome: null,
            androidSdkRoot: null,
          },
          status: 'error',
        },
        ios: {
          issues: [],
          resolved: {
            developerDir: '/Applications/Xcode.app/Contents/Developer',
          },
          status: 'ok',
        },
        nextSteps: [
          'Install Android Studio with Android platform-tools and the Android Emulator.',
        ],
        status: 'error',
      },
      runtime: {
        'android-emulator': {
          issues: [
            {
              level: 'error',
              message: 'Use http://10.0.2.2:3000.',
            },
          ],
          resolved: {
            apiUrl: 'http://localhost:3000',
            authMode: 'learner-session',
            hostname: 'localhost',
            target: 'android-emulator',
          },
          status: 'error',
        },
        device: {
          issues: [
            {
              level: 'error',
              message: 'Use LAN IP.',
            },
          ],
          resolved: {
            apiUrl: 'http://localhost:3000',
            authMode: 'learner-session',
            hostname: 'localhost',
            target: 'device',
          },
          status: 'error',
        },
        'ios-simulator': {
          issues: [],
          resolved: {
            apiUrl: 'http://localhost:3000',
            authMode: 'learner-session',
            hostname: 'localhost',
            target: 'ios-simulator',
          },
          status: 'ok',
        },
      },
    }, {
      deviceLanHost: '192.168.1.20',
    });

    const scopedReport = createKangurMobileNativeRuntimeReadinessScopedReport(
      fullReport,
      'ios-simulator',
      {
        deviceLanHost: '192.168.1.20',
      },
    );

    expect(scopedReport.status).toBe('warning');
    expect(scopedReport.host.status).toBe('ok');
    expect(scopedReport.runtime).toEqual({
      'ios-simulator': {
        issues: [],
        resolved: {
          apiUrl: 'http://localhost:3000',
          authMode: 'learner-session',
          hostname: 'localhost',
          target: 'ios-simulator',
        },
        status: 'ok',
      },
    });
    expect(scopedReport.nextSteps).toEqual([
      'Re-run npm run check:mobile:runtime:backend:ios outside the Codex sandbox or in your normal shell before native validation.',
      'Run npm run prepare:mobile:runtime:ios once the backend check is green for this target.',
      'Run npm run check:mobile:native:port before npm run dev:mobile:ios:local so Expo does not stall on a port prompt.',
      'Run npm run dev:mobile:ios:local to launch Expo for this target.',
      'After Expo launches, run npm run checklist:mobile:native:runtime:ios for the learner-session validation flow.',
    ]);
  });

  it('adds the target-specific checklist step for a launchable device scope', () => {
    const fullReport = createKangurMobileNativeRuntimeReadinessReport(
      {
        backend: {
          apiUrl: 'http://192.168.1.20:3000',
          probeUrl: 'http://192.168.1.20:3000/api/kangur/auth/me',
          responseStatus: null,
          status: 'skipped',
        },
        host: {
          android: {
            issues: [],
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
        },
        runtime: {
          'android-emulator': {
            issues: [],
            resolved: {
              apiUrl: 'http://10.0.2.2:3000',
              authMode: 'learner-session',
              hostname: '10.0.2.2',
              target: 'android-emulator',
            },
            status: 'ok',
          },
          device: {
            issues: [
              {
                level: 'warning',
                message:
                  'Using plain HTTP on a physical device is fine for local validation.',
              },
            ],
            resolved: {
              apiUrl: 'http://192.168.1.20:3000',
              authMode: 'learner-session',
              hostname: '192.168.1.20',
              target: 'device',
            },
            status: 'ok',
          },
          'ios-simulator': {
            issues: [],
            resolved: {
              apiUrl: 'http://localhost:3000',
              authMode: 'learner-session',
              hostname: 'localhost',
              target: 'ios-simulator',
            },
            status: 'ok',
          },
        },
      },
      {
        deviceLanHost: '192.168.1.20',
      },
    );

    const scopedReport = createKangurMobileNativeRuntimeReadinessScopedReport(
      fullReport,
      'device',
      {
        deviceLanHost: '192.168.1.20',
      },
    );

    expect(scopedReport.nextSteps).toEqual([
      'Re-run npm run check:mobile:runtime:backend:device outside the Codex sandbox or in your normal shell before native validation.',
      'Run npm run prepare:mobile:runtime:device once the backend check is green for this target.',
      'Run npm run check:mobile:native:port before npm run dev:mobile:device:local so Expo does not stall on a port prompt.',
      'Run npm run dev:mobile:device:local to launch Expo for this target.',
      'After Expo launches, run npm run checklist:mobile:native:runtime:device for the learner-session validation flow.',
    ]);
  });
});
