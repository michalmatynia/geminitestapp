import { describe, expect, it } from 'vitest';

import {
  checkKangurMobileNativeLocalExpoPort,
  createKangurMobileNativeLocalChecklistHint,
  createKangurMobileNativeLocalDependencyHint,
  createKangurMobileNativeLocalLaunchEnv,
  createKangurMobileNativeLocalPortHint,
  createKangurMobileNativeLocalPortConflictHint,
  createKangurMobileNativeLocalPrepareHint,
  createKangurMobileNativeLocalReadinessHint,
  createKangurMobileNativeLocalPrepareFailureMessage,
  createKangurMobileNativeLocalPlan,
  parseKangurMobileNativeLocalOptions,
} from './run-kangur-mobile-native-local';

describe('parseKangurMobileNativeLocalOptions', () => {
  it('defaults to device without optional flags', () => {
    expect(parseKangurMobileNativeLocalOptions([])).toEqual({
      dryRun: false,
      skipPrepare: false,
      target: 'device',
    });
  });

  it('parses target, dry-run, and skip-prepare flags', () => {
    expect(
      parseKangurMobileNativeLocalOptions([
        '--target',
        'android-emulator',
        '--dry-run',
        '--skip-prepare',
      ]),
    ).toEqual({
      dryRun: true,
      skipPrepare: true,
      target: 'android-emulator',
    });
  });

  it('accepts inline target arguments', () => {
    expect(
      parseKangurMobileNativeLocalOptions([
        '--target=ios-simulator',
        '--dry-run',
      ]),
    ).toEqual({
      dryRun: true,
      skipPrepare: false,
      target: 'ios-simulator',
    });
  });

  it('rejects unknown arguments', () => {
    expect(() =>
      parseKangurMobileNativeLocalOptions(['--verbose']),
    ).toThrow(/Unknown argument/);
  });
});

describe('createKangurMobileNativeLocalPlan', () => {
  it('maps iOS simulator validation to prepare and ios start scripts', () => {
    expect(createKangurMobileNativeLocalPlan('ios-simulator')).toEqual({
      rootChecklistScript: 'checklist:mobile:native:runtime:ios',
      rootDependencyScript: 'check:mobile:native:deps',
      rootPortScript: 'check:mobile:native:port',
      prepareScript: 'prepare:runtime:ios',
      rootPrepareScript: 'prepare:mobile:runtime:ios',
      rootReadinessScript: 'check:mobile:native:runtime:ios',
      rootStartScript: 'dev:mobile:ios:local',
      workspaceChecklistScript: 'checklist:native:runtime:ios',
      workspaceDependencyScript: 'check:native:deps',
      workspacePortScript: 'check:native:port',
      workspaceReadinessScript: 'check:native:runtime:ios',
      startScript: 'ios',
      target: 'ios-simulator',
    });
  });

  it('maps android emulator validation to prepare and android start scripts', () => {
    expect(createKangurMobileNativeLocalPlan('android-emulator')).toEqual({
      rootChecklistScript: 'checklist:mobile:native:runtime:android',
      rootDependencyScript: 'check:mobile:native:deps',
      rootPortScript: 'check:mobile:native:port',
      prepareScript: 'prepare:runtime:android',
      rootPrepareScript: 'prepare:mobile:runtime:android',
      rootReadinessScript: 'check:mobile:native:runtime:android',
      rootStartScript: 'dev:mobile:android:local',
      workspaceChecklistScript: 'checklist:native:runtime:android',
      workspaceDependencyScript: 'check:native:deps',
      workspacePortScript: 'check:native:port',
      workspaceReadinessScript: 'check:native:runtime:android',
      startScript: 'android',
      target: 'android-emulator',
    });
  });

  it('maps device validation to prepare and dev start scripts', () => {
    expect(createKangurMobileNativeLocalPlan('device')).toEqual({
      rootChecklistScript: 'checklist:mobile:native:runtime:device',
      rootDependencyScript: 'check:mobile:native:deps',
      rootPortScript: 'check:mobile:native:port',
      prepareScript: 'prepare:runtime:device',
      rootPrepareScript: 'prepare:mobile:runtime:device',
      rootReadinessScript: 'check:mobile:native:runtime:device',
      rootStartScript: 'dev:mobile:device:local',
      workspaceChecklistScript: 'checklist:native:runtime:device',
      workspaceDependencyScript: 'check:native:deps',
      workspacePortScript: 'check:native:port',
      workspaceReadinessScript: 'check:native:runtime:device',
      startScript: 'dev',
      target: 'device',
    });
  });
});

describe('createKangurMobileNativeLocalReadinessHint', () => {
  it('includes both root and workspace command variants', () => {
    const plan = createKangurMobileNativeLocalPlan('ios-simulator');

    expect(createKangurMobileNativeLocalReadinessHint(plan)).toContain(
      'npm run check:mobile:native:runtime:ios',
    );
    expect(createKangurMobileNativeLocalReadinessHint(plan)).toContain(
      'npm run check:native:runtime:ios',
    );
  });
});

describe('createKangurMobileNativeLocalPrepareHint', () => {
  it('includes both root prepare and start commands', () => {
    const plan = createKangurMobileNativeLocalPlan('ios-simulator');

    expect(createKangurMobileNativeLocalPrepareHint(plan)).toContain(
      'npm run prepare:mobile:runtime:ios',
    );
    expect(createKangurMobileNativeLocalPrepareHint(plan)).toContain(
      'npm run dev:mobile:ios:local',
    );
  });
});

describe('createKangurMobileNativeLocalDependencyHint', () => {
  it('includes both root and workspace dependency checks', () => {
    const plan = createKangurMobileNativeLocalPlan('ios-simulator');

    expect(createKangurMobileNativeLocalDependencyHint(plan)).toContain(
      'npm run check:mobile:native:deps',
    );
    expect(createKangurMobileNativeLocalDependencyHint(plan)).toContain(
      'npm run check:native:deps',
    );
  });
});

describe('createKangurMobileNativeLocalPortHint', () => {
  it('includes both root and workspace port checks', () => {
    const plan = createKangurMobileNativeLocalPlan('ios-simulator');

    expect(createKangurMobileNativeLocalPortHint(plan)).toContain(
      'npm run check:mobile:native:port',
    );
    expect(createKangurMobileNativeLocalPortHint(plan)).toContain(
      'npm run check:native:port',
    );
  });
});

describe('createKangurMobileNativeLocalChecklistHint', () => {
  it('includes both root and workspace checklist commands', () => {
    const plan = createKangurMobileNativeLocalPlan('ios-simulator');

    expect(createKangurMobileNativeLocalChecklistHint(plan)).toContain(
      'npm run checklist:mobile:native:runtime:ios',
    );
    expect(createKangurMobileNativeLocalChecklistHint(plan)).toContain(
      'npm run checklist:native:runtime:ios',
    );
  });
});

describe('createKangurMobileNativeLocalPortConflictHint', () => {
  it('points at the occupied Expo port and the lsof recovery command', () => {
    expect(createKangurMobileNativeLocalPortConflictHint()).toContain(
      'Port 8081 is already occupied.',
    );
    expect(createKangurMobileNativeLocalPortConflictHint()).toContain(
      'lsof -i tcp:8081',
    );
  });
});

describe('createKangurMobileNativeLocalLaunchEnv', () => {
  it('defaults Expo offline mode for local native launches', () => {
    const resolution = createKangurMobileNativeLocalLaunchEnv(
      {
        EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
      },
      'ios-simulator',
    );

    expect(resolution.env.EXPO_OFFLINE).toBe('1');
    expect(resolution.notices).toContain(
      'defaulted EXPO_OFFLINE=1 for local native launch so Expo uses anonymous manifest signatures and skips the Expo account prompt.',
    );
  });

  it('keeps an explicit Expo offline value unchanged', () => {
    const resolution = createKangurMobileNativeLocalLaunchEnv(
      {
        EXPO_OFFLINE: '0',
        EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
      },
      'ios-simulator',
    );

    expect(resolution.env.EXPO_OFFLINE).toBe('0');
    expect(resolution.notices).not.toContain(
      'defaulted EXPO_OFFLINE=1 for local native launch so Expo uses anonymous manifest signatures and skips the Expo account prompt.',
    );
  });

  it('normalizes localhost api urls for the Android emulator', () => {
    const resolution = createKangurMobileNativeLocalLaunchEnv(
      {
        EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
      },
      'android-emulator',
    );

    expect(resolution.env.EXPO_PUBLIC_KANGUR_API_URL).toBe(
      'http://10.0.2.2:3000',
    );
    expect(resolution.notices).toContain(
      'normalized EXPO_PUBLIC_KANGUR_API_URL from http://localhost:3000 to http://10.0.2.2:3000 for Android emulator access.',
    );
  });

  it('keeps iOS simulator env values unchanged', () => {
    const resolution = createKangurMobileNativeLocalLaunchEnv(
      {
        EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
      },
      'ios-simulator',
    );

    expect(resolution.env.EXPO_PUBLIC_KANGUR_API_URL).toBe(
      'http://localhost:3000',
    );
    expect(resolution.notices).toEqual([
      'defaulted EXPO_OFFLINE=1 for local native launch so Expo uses anonymous manifest signatures and skips the Expo account prompt.',
    ]);
  });

  it('normalizes localhost api urls for physical-device launches when a LAN IP is available', () => {
    const resolution = createKangurMobileNativeLocalLaunchEnv(
      {
        EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
      },
      'device',
      {
        deviceLanHost: '192.168.1.20',
      },
    );

    expect(resolution.env.EXPO_PUBLIC_KANGUR_API_URL).toBe(
      'http://192.168.1.20:3000',
    );
    expect(resolution.notices).toContain(
      'normalized EXPO_PUBLIC_KANGUR_API_URL from http://localhost:3000 to http://192.168.1.20:3000 for physical-device access.',
    );
  });

  it('leaves physical-device env unchanged when no LAN IP is available', () => {
    const resolution = createKangurMobileNativeLocalLaunchEnv(
      {
        EXPO_PUBLIC_KANGUR_API_URL: 'http://localhost:3000',
      },
      'device',
      {
        deviceLanHost: null,
      },
    );

    expect(resolution.env.EXPO_PUBLIC_KANGUR_API_URL).toBe(
      'http://localhost:3000',
    );
    expect(resolution.notices).toEqual([
      'defaulted EXPO_OFFLINE=1 for local native launch so Expo uses anonymous manifest signatures and skips the Expo account prompt.',
    ]);
  });
});

describe('checkKangurMobileNativeLocalExpoPort', () => {
  it('reports free when no local server is listening on the probe port', async () => {
    const report = await checkKangurMobileNativeLocalExpoPort(65531);

    expect(report).toEqual({
      port: 65531,
      status: 'free',
    });
  });
});

describe('createKangurMobileNativeLocalPrepareFailureMessage', () => {
  it('includes the target-specific readiness command', () => {
    const plan = createKangurMobileNativeLocalPlan('ios-simulator');

    const message = createKangurMobileNativeLocalPrepareFailureMessage(
      plan,
      new Error('[kangur-mobile-native-local] Script "prepare:runtime:ios" exited with code 1.'),
    );

    expect(message).toContain('prepare:mobile:runtime:ios failed for ios-simulator');
    expect(message).toContain(
      'Run "npm run check:mobile:native:runtime:ios" from the repo root',
    );
    expect(message).toContain(
      'Run "npm run check:mobile:native:deps" from the repo root',
    );
    expect(message).toContain(
      'Then re-run "npm run prepare:mobile:runtime:ios" or "npm run dev:mobile:ios:local".',
    );
  });
});
