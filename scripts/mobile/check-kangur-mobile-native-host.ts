import { spawnSync } from 'node:child_process';
import {
  analyzeKangurMobileAndroidToolchain,
  type KangurMobileAndroidToolchainReport,
  type KangurMobileAndroidToolchainState,
} from './check-kangur-mobile-android-toolchain';
import {
  analyzeKangurMobileIosToolchain,
  collectKangurMobileIosToolchainState,
  type KangurMobileIosToolchainReport,
} from './check-kangur-mobile-ios-toolchain';

export type KangurMobileNativeHostReport = {
  android: KangurMobileAndroidToolchainReport;
  ios: KangurMobileIosToolchainReport;
  nextSteps: string[];
  status: 'error' | 'ok';
};

const runCommand = (
  command: string,
  args: string[],
): {
  ok: boolean;
  output: string;
} => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
  });

  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  return {
    ok: result.status === 0,
    output,
  };
};

export const collectKangurMobileAndroidToolchainState =
  (env: NodeJS.ProcessEnv = process.env): KangurMobileAndroidToolchainState => {
    const adb = runCommand('adb', ['version']);
    const emulator = runCommand('emulator', ['-version']);

    return {
      adbAvailable: adb.ok,
      androidHome: env['ANDROID_HOME']?.trim() || null,
      androidSdkRoot: env['ANDROID_SDK_ROOT']?.trim() || null,
      emulatorAvailable: emulator.ok,
    };
  };

export const createKangurMobileNativeHostReport = (
  {
    androidState,
    iosState,
  }: {
    androidState: KangurMobileAndroidToolchainState;
    iosState: KangurMobileIosToolchainState;
  },
): KangurMobileNativeHostReport => {
  const ios = analyzeKangurMobileIosToolchain(iosState);
  const android = analyzeKangurMobileAndroidToolchain(androidState);
  const nextSteps: string[] = [];

  if (ios.status === 'error') {
    nextSteps.push('Install full Xcode if it is missing.');
    nextSteps.push(
      'Run sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer.',
    );
    nextSteps.push('Re-run npm run check:mobile:ios:toolchain.');
  }

  if (android.status === 'error') {
    nextSteps.push(
      'Install Android Studio with Android platform-tools and the Android Emulator.',
    );
    nextSteps.push(
      'Set ANDROID_SDK_ROOT (and optionally ANDROID_HOME) to your Android SDK location.',
    );
    nextSteps.push('Re-run npm run check:mobile:android:toolchain.');
  }

  return {
    android,
    ios,
    nextSteps,
    status:
      ios.status === 'error' || android.status === 'error' ? 'error' : 'ok',
  };
};

export const runKangurMobileNativeHostCheck = (): void => {
  const report = createKangurMobileNativeHostReport({
    androidState: collectKangurMobileAndroidToolchainState(),
    iosState: collectKangurMobileIosToolchainState(),
  });

  console.log(
    `[kangur-mobile-native-host] status=${report.status}`,
  );
  console.log(
    `[kangur-mobile-native-host] ios=${report.ios.status} android=${report.android.status}`,
  );

  const sections: Array<{
    issues: Array<{ level: 'error' | 'warning'; message: string }>;
    label: 'iOS' | 'Android';
  }> = [
    {
      issues: report.ios.issues,
      label: 'iOS',
    },
    {
      issues: report.android.issues,
      label: 'Android',
    },
  ];

  for (const section of sections) {
    if (section.issues.length === 0) {
      console.log(`[kangur-mobile-native-host] ${section.label}: no issues detected.`);
      continue;
    }

    for (const issue of section.issues) {
      const prefix = issue.level === 'error' ? 'ERROR' : 'WARN';
      console.log(
        `[kangur-mobile-native-host] ${section.label} ${prefix} ${issue.message}`,
      );
    }
  }

  if (report.nextSteps.length > 0) {
    console.log('[kangur-mobile-native-host] Suggested next steps:');
    for (const step of report.nextSteps) {
      console.log(`[kangur-mobile-native-host] NEXT ${step}`);
    }
  }

  if (report.status === 'error') {
    process.exit(1);
  }
};

if (process.argv[1]?.includes('check-kangur-mobile-native-host.ts')) {
  runKangurMobileNativeHostCheck();
}
