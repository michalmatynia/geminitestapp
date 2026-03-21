import type { KangurMobileRuntimeTarget } from './check-kangur-mobile-runtime-env';

export type KangurMobileNativeValidationChecklistTarget =
  | 'all'
  | KangurMobileRuntimeTarget;

export type KangurMobileNativeValidationChecklistSection = {
  backendCommand: string;
  dependencyCommand: string;
  launchCommand: string;
  manualFallbackCommands?: string[];
  notes: string[];
  portCommand: string;
  prepareCommand: string;
  readinessCommand: string;
  title: string;
  validationSteps: string[];
};

const TARGETS: KangurMobileRuntimeTarget[] = [
  'ios-simulator',
  'android-emulator',
  'device',
];

const COMMON_VALIDATION_STEPS = [
  'Sign in with a learner-session account from the mobile home screen.',
  'Complete one short practice run, preferably clock or logical_patterns, and confirm the completion state settles at synced.',
  'Confirm the new result appears on the home dashboard, daily plan, profile history, results, and leaderboard.',
  'Fully close and reopen the app, then confirm learner-session auth, score history, focus cards, and lesson mastery persist.',
  'Treat auth transport, storage persistence, or synced score refresh failures as blockers before more feature work.',
] as const;

const IOS_SIMULATOR_VALIDATION_STEPS = [
  ...COMMON_VALIDATION_STEPS,
  'For the remaining ordinary-route proof, complete one normal manual non-debug practice run in Expo Go instead of using debugAutoComplete.',
  'After that manual run, re-check home through the ordinary in-app navigation flow, not through the dev-only proof redirect.',
] as const;

const IOS_SIMULATOR_MANUAL_FALLBACK_COMMANDS = [
  "xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/practice?operation=clock&debugAutoComplete=perfect&debugRedirectTo=home'",
  'sleep 8',
  'xcrun simctl io booted screenshot /tmp/kangur-mobile-ios-debug-proof/06-home.png',
  "xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/practice?operation=clock&debugAutoComplete=perfect&debugRedirectTo=results'",
  'sleep 8',
  'xcrun simctl io booted screenshot /tmp/kangur-mobile-ios-debug-proof/02-results.png',
  "xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/results'",
  "xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/profile'",
  "xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/plan'",
  "xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/leaderboard'",
  "xcrun simctl terminate booted host.exp.Exponent && xcrun simctl openurl booted 'exp://127.0.0.1:8081'",
] as const;

const getTargetCommands = (target: KangurMobileRuntimeTarget) => {
  switch (target) {
    case 'ios-simulator':
      return {
        backendCommand: 'npm run check:mobile:runtime:backend:ios',
        dependencyCommand: 'npm run check:mobile:native:deps',
        launchCommand: 'npm run dev:mobile:ios:local',
        portCommand: 'npm run check:mobile:native:port',
        prepareCommand: 'npm run prepare:mobile:runtime:ios',
        readinessCommand: 'npm run check:mobile:native:runtime:ios',
      };
    case 'android-emulator':
      return {
        backendCommand: 'npm run check:mobile:runtime:backend:android',
        dependencyCommand: 'npm run check:mobile:native:deps',
        launchCommand: 'npm run dev:mobile:android:local',
        portCommand: 'npm run check:mobile:native:port',
        prepareCommand: 'npm run prepare:mobile:runtime:android',
        readinessCommand: 'npm run check:mobile:native:runtime:android',
      };
    case 'device':
      return {
        backendCommand: 'npm run check:mobile:runtime:backend:device',
        dependencyCommand: 'npm run check:mobile:native:deps',
        launchCommand: 'npm run dev:mobile:device:local',
        portCommand: 'npm run check:mobile:native:port',
        prepareCommand: 'npm run prepare:mobile:runtime:device',
        readinessCommand: 'npm run check:mobile:native:runtime:device',
      };
  }
};

export const parseKangurMobileNativeValidationChecklistTarget = (
  argv: string[] = process.argv.slice(2),
): KangurMobileNativeValidationChecklistTarget => {
  const inlineTargetArgument = argv.find((argument) =>
    argument.startsWith('--target='),
  );

  if (inlineTargetArgument) {
    const value = inlineTargetArgument.slice('--target='.length).trim();
    if (
      value === 'all' ||
      value === 'ios-simulator' ||
      value === 'android-emulator' ||
      value === 'device'
    ) {
      return value;
    }

    throw new Error(
      `Invalid --target value "${value ?? ''}". Expected all, ios-simulator, android-emulator, or device.`,
    );
  }

  const targetIndex = argv.findIndex((argument) => argument === '--target');
  if (targetIndex === -1) {
    return 'all';
  }

  const value = argv[targetIndex + 1]?.trim();
  if (
    value === 'all' ||
    value === 'ios-simulator' ||
    value === 'android-emulator' ||
    value === 'device'
  ) {
    return value;
  }

  throw new Error(
    `Invalid --target value "${value ?? ''}". Expected all, ios-simulator, android-emulator, or device.`,
  );
};

export const createKangurMobileNativeValidationChecklistSection = (
  target: KangurMobileRuntimeTarget,
): KangurMobileNativeValidationChecklistSection => {
  const commands = getTargetCommands(target);

  switch (target) {
    case 'ios-simulator':
      return {
        ...commands,
        manualFallbackCommands: [...IOS_SIMULATOR_MANUAL_FALLBACK_COMMANDS],
        notes: [
          'Use this target first once full Xcode and simctl are available.',
          'The simulator uses localhost directly for the Kangur backend.',
          'There is still no safe tap automation in this environment, so the last ordinary-route proof step remains manual in Expo Go.',
          'If scripted proof mode flakes on CoreSimulatorService, use the direct simctl fallback commands below from a normal shell.',
        ],
        title: 'iOS simulator',
        validationSteps: [...IOS_SIMULATOR_VALIDATION_STEPS],
      };
    case 'android-emulator':
      return {
        ...commands,
        notes: [
          'The local launcher normalizes localhost to 10.0.2.2 for emulator runtime traffic.',
          'The backend check still probes host-side localhost before launch.',
          'If the Android SDK is not configured yet on macOS, export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk".',
          'Also export PATH="$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH" before rerunning the checked Android flow.',
        ],
        title: 'Android emulator',
        validationSteps: [...COMMON_VALIDATION_STEPS],
      };
    case 'device':
      return {
        ...commands,
        notes: [
          'The local launcher normalizes localhost or 10.0.2.2 to the detected LAN IP for physical-device traffic.',
          'Plain HTTP is acceptable for local validation, but the device must be on the same network as the backend host.',
        ],
        title: 'Physical device',
        validationSteps: [...COMMON_VALIDATION_STEPS],
      };
  }
};

export const createKangurMobileNativeValidationChecklist = (
  target: KangurMobileNativeValidationChecklistTarget,
): KangurMobileNativeValidationChecklistSection[] => {
  if (target === 'all') {
    return TARGETS.map((runtimeTarget) =>
      createKangurMobileNativeValidationChecklistSection(runtimeTarget),
    );
  }

  return [createKangurMobileNativeValidationChecklistSection(target)];
};

const renderKangurMobileNativeValidationChecklist = (
  target: KangurMobileNativeValidationChecklistTarget,
): string => {
  const sections = createKangurMobileNativeValidationChecklist(target);

  return sections
    .flatMap((section) => [
      `[kangur-mobile-native-checklist] target=${section.title}`,
      `[kangur-mobile-native-checklist] Run ${section.readinessCommand}`,
      `[kangur-mobile-native-checklist] Run ${section.dependencyCommand}`,
      `[kangur-mobile-native-checklist] Run ${section.backendCommand}`,
      `[kangur-mobile-native-checklist] Run ${section.prepareCommand}`,
      `[kangur-mobile-native-checklist] Run ${section.portCommand}`,
      `[kangur-mobile-native-checklist] Run ${section.launchCommand}`,
      ...section.notes.map(
        (note) => `[kangur-mobile-native-checklist] NOTE ${note}`,
      ),
      ...(section.manualFallbackCommands ?? []).map(
        (command) =>
          `[kangur-mobile-native-checklist] FALLBACK ${command}`,
      ),
      ...section.validationSteps.map(
        (step, index) =>
          `[kangur-mobile-native-checklist] STEP ${index + 1} ${step}`,
      ),
    ])
    .join('\n');
};

const isMainModule = process.argv[1]
  ? import.meta.url === new URL(`file://${process.argv[1]}`).href
  : false;

if (isMainModule) {
  try {
    const target = parseKangurMobileNativeValidationChecklistTarget();
    console.log(renderKangurMobileNativeValidationChecklist(target));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
