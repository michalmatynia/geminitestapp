import { describe, expect, it } from 'vitest';

import {
  createKangurMobileNativeValidationChecklist,
  createKangurMobileNativeValidationChecklistSection,
  parseKangurMobileNativeValidationChecklistTarget,
} from './print-kangur-mobile-native-validation-checklist';

describe('parseKangurMobileNativeValidationChecklistTarget', () => {
  it('defaults to all when no target is provided', () => {
    expect(parseKangurMobileNativeValidationChecklistTarget([])).toBe('all');
  });

  it('parses supported targets', () => {
    expect(
      parseKangurMobileNativeValidationChecklistTarget([
        '--target',
        'ios-simulator',
      ]),
    ).toBe('ios-simulator');
    expect(
      parseKangurMobileNativeValidationChecklistTarget([
        '--target=android-emulator',
      ]),
    ).toBe('android-emulator');
    expect(
      parseKangurMobileNativeValidationChecklistTarget(['--target=device']),
    ).toBe('device');
  });
});

describe('createKangurMobileNativeValidationChecklistSection', () => {
  it('builds Android emulator commands and notes', () => {
    const section =
      createKangurMobileNativeValidationChecklistSection('android-emulator');

    expect(section).toEqual(
      expect.objectContaining({
        backendCommand: 'npm run check:mobile:runtime:backend:android',
        dependencyCommand: 'npm run check:mobile:native:deps',
        launchCommand: 'npm run dev:mobile:android:local',
        portCommand: 'npm run check:mobile:native:port',
        prepareCommand: 'npm run prepare:mobile:runtime:android',
        readinessCommand: 'npm run check:mobile:native:runtime:android',
        title: 'Android emulator',
      }),
    );
    expect(section.notes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('10.0.2.2'),
        expect.stringContaining('host-side localhost'),
        expect.stringContaining('ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"'),
        expect.stringContaining(
          'PATH="$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"',
        ),
      ]),
    );
  });

  it('includes the shared learner-session validation steps', () => {
    const section =
      createKangurMobileNativeValidationChecklistSection('ios-simulator');

    expect(section.validationSteps).toEqual(
      expect.arrayContaining([
        expect.stringContaining('learner-session'),
        expect.stringContaining('synced'),
        expect.stringContaining('daily plan'),
        expect.stringContaining('Fully close and reopen the app'),
        expect.stringContaining('normal manual non-debug practice run'),
        expect.stringContaining('ordinary in-app navigation flow'),
      ]),
    );
  });

  it('includes the verified iOS simulator direct fallback commands', () => {
    const section =
      createKangurMobileNativeValidationChecklistSection('ios-simulator');

    expect(section.manualFallbackCommands).toEqual(
      expect.arrayContaining([
        expect.stringContaining("debugRedirectTo=home"),
        expect.stringContaining('xcrun simctl io booted screenshot'),
        expect.stringContaining("debugRedirectTo=results"),
        expect.stringContaining("'exp://127.0.0.1:8081/--/results'"),
        expect.stringContaining("'exp://127.0.0.1:8081/--/leaderboard'"),
        expect.stringContaining("terminate booted host.exp.Exponent"),
      ]),
    );
  });
});

describe('createKangurMobileNativeValidationChecklist', () => {
  it('returns all three sections for the all target', () => {
    const checklist = createKangurMobileNativeValidationChecklist('all');

    expect(checklist.map((section) => section.title)).toEqual([
      'iOS simulator',
      'Android emulator',
      'Physical device',
    ]);
  });
});
