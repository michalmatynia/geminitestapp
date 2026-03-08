import { spawnSync } from 'node:child_process';

export type KangurMobileAndroidToolchainIssue = {
  level: 'error' | 'warning';
  message: string;
};

export type KangurMobileAndroidToolchainReport = {
  issues: KangurMobileAndroidToolchainIssue[];
  resolved: {
    androidHome: string | null;
    androidSdkRoot: string | null;
  };
  status: 'error' | 'ok';
};

export type KangurMobileAndroidToolchainState = {
  adbAvailable: boolean;
  androidHome: string | null;
  androidSdkRoot: string | null;
  emulatorAvailable: boolean;
};

const addIssue = (
  issues: KangurMobileAndroidToolchainIssue[],
  level: KangurMobileAndroidToolchainIssue['level'],
  message: string,
): void => {
  issues.push({ level, message });
};

export const analyzeKangurMobileAndroidToolchain = (
  state: KangurMobileAndroidToolchainState,
): KangurMobileAndroidToolchainReport => {
  const issues: KangurMobileAndroidToolchainIssue[] = [];

  if (!state.androidSdkRoot && !state.androidHome) {
    addIssue(
      issues,
      'warning',
      'ANDROID_SDK_ROOT and ANDROID_HOME are both unset. Android Studio can still work if adb/emulator are on PATH, but setting ANDROID_SDK_ROOT is recommended for predictable local validation.',
    );
  }

  if (
    state.androidSdkRoot &&
    state.androidHome &&
    state.androidSdkRoot !== state.androidHome
  ) {
    addIssue(
      issues,
      'warning',
      'ANDROID_SDK_ROOT and ANDROID_HOME point to different locations. Keep them aligned to avoid Android SDK tool resolution issues.',
    );
  }

  if (!state.adbAvailable) {
    addIssue(
      issues,
      'error',
      'adb is unavailable. Install Android platform-tools or add the Android SDK platform-tools directory to PATH before launching Expo on Android.',
    );
  }

  if (!state.emulatorAvailable) {
    addIssue(
      issues,
      'error',
      'emulator is unavailable. Install the Android Emulator via Android Studio and make sure the emulator binary is on PATH before launching Expo on Android.',
    );
  }

  return {
    issues,
    resolved: {
      androidHome: state.androidHome,
      androidSdkRoot: state.androidSdkRoot,
    },
    status: issues.some((issue) => issue.level === 'error') ? 'error' : 'ok',
  };
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

export const runKangurMobileAndroidToolchainCheck = (): void => {
  const adb = runCommand('adb', ['version']);
  const emulator = runCommand('emulator', ['-version']);
  const report = analyzeKangurMobileAndroidToolchain({
    adbAvailable: adb.ok,
    androidHome: process.env.ANDROID_HOME?.trim() || null,
    androidSdkRoot: process.env.ANDROID_SDK_ROOT?.trim() || null,
    emulatorAvailable: emulator.ok,
  });

  console.log(
    `[kangur-mobile-android-toolchain] status=${report.status} sdkRoot=${report.resolved.androidSdkRoot ?? 'unset'} androidHome=${report.resolved.androidHome ?? 'unset'}`,
  );

  if (report.issues.length === 0) {
    console.log('[kangur-mobile-android-toolchain] No issues detected.');
  } else {
    for (const issue of report.issues) {
      const prefix = issue.level === 'error' ? 'ERROR' : 'WARN';
      console.log(`[kangur-mobile-android-toolchain] ${prefix} ${issue.message}`);
    }
  }

  if (report.status === 'error') {
    process.exit(1);
  }
};

if (process.argv[1]?.includes('check-kangur-mobile-android-toolchain.ts')) {
  runKangurMobileAndroidToolchainCheck();
}
