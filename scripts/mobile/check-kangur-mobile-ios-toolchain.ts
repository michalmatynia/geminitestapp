import { spawnSync } from 'node:child_process';

export type KangurMobileIosToolchainIssue = {
  level: 'error' | 'warning';
  message: string;
};

export type KangurMobileIosToolchainReport = {
  issues: KangurMobileIosToolchainIssue[];
  resolved: {
    developerDir: string | null;
  };
  status: 'error' | 'ok';
};

export type KangurMobileIosToolchainState = {
  simctlHasAvailableDevices?: boolean;
  developerDir: string | null;
  simctlAvailable: boolean;
  simctlLicenseBlocked?: boolean;
  simctlTransientFailure?: boolean;
  xcodebuildAvailable: boolean;
};

const COMMAND_LINE_TOOLS_DIR = '/Library/Developer/CommandLineTools';
const FULL_XCODE_DIR = '/Applications/Xcode.app/Contents/Developer';
const MAX_TRANSIENT_SIMCTL_RETRIES = 5;
const TRANSIENT_SIMCTL_RETRY_DELAY_MS = 1000;

const addIssue = (
  issues: KangurMobileIosToolchainIssue[],
  level: KangurMobileIosToolchainIssue['level'],
  message: string,
): void => {
  issues.push({ level, message });
};

const isTransientSimctlFailure = (output: string): boolean =>
  output.includes('CoreSimulatorService connection became invalid') ||
  output.includes('Unable to locate device set') ||
  output.includes('Connection refused');

export const analyzeKangurMobileIosToolchain = (
  state: KangurMobileIosToolchainState,
): KangurMobileIosToolchainReport => {
  const issues: KangurMobileIosToolchainIssue[] = [];

  if (!state.developerDir) {
    addIssue(
      issues,
      'error',
      'xcode-select does not report an active developer directory. Install Xcode and run xcode-select --switch /Applications/Xcode.app/Contents/Developer.',
    );
  } else if (state.developerDir === COMMAND_LINE_TOOLS_DIR) {
    addIssue(
      issues,
      'error',
      `xcode-select currently points to ${COMMAND_LINE_TOOLS_DIR}. Full Xcode is required for iOS Simulator launches. Install Xcode, then run xcode-select --switch ${FULL_XCODE_DIR}.`,
    );
  }

  if (!state.xcodebuildAvailable) {
    addIssue(
      issues,
      'error',
      'xcodebuild is unavailable. Full Xcode must be installed before Expo can launch the iOS Simulator.',
    );
  }

  if (!state.simctlAvailable) {
    if (state.simctlLicenseBlocked) {
      addIssue(
        issues,
        'error',
        'xcrun simctl is blocked because the Xcode license has not been accepted yet. Run sudo xcodebuild -license in Terminal, accept the license, then re-run the iOS toolchain check.',
      );
    } else if (state.simctlTransientFailure) {
      addIssue(
        issues,
        'warning',
        'xcrun simctl hit a transient CoreSimulatorService failure. Run xcrun simctl list devices once, confirm the simulator is still available, then re-run the iOS toolchain check.',
      );
    } else {
      addIssue(
        issues,
        'error',
        'xcrun simctl is unavailable. Install Xcode and make sure the active developer directory points at the full Xcode app.',
      );
    }
  } else if (state.simctlHasAvailableDevices === false) {
    addIssue(
      issues,
      'error',
      'xcrun simctl is available, but no iOS devices are currently available in Simulator.app. Install an iOS Simulator runtime in Xcode and create or download at least one simulator device, then re-run the iOS toolchain check.',
    );
  }

  return {
    issues,
    resolved: {
      developerDir: state.developerDir,
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

const runSimctlAvailableDevices = (): {
  ok: boolean;
  output: string;
} => {
  runCommand('xcrun', ['simctl', 'list', 'devices']);
  let lastResult = runCommand('xcrun', ['simctl', 'list', 'devices', 'available']);

  for (
    let attempt = 1;
    attempt < MAX_TRANSIENT_SIMCTL_RETRIES &&
    !lastResult.ok &&
    isTransientSimctlFailure(lastResult.output);
    attempt += 1
  ) {
    runCommand('xcrun', ['simctl', 'list', 'devices']);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, TRANSIENT_SIMCTL_RETRY_DELAY_MS);
    lastResult = runCommand('xcrun', ['simctl', 'list', 'devices', 'available']);
  }

  return lastResult;
};

export const collectKangurMobileIosToolchainState =
  (): KangurMobileIosToolchainState => {
    const xcodeSelect = runCommand('xcode-select', ['-p']);
    const developerDir = xcodeSelect.ok ? xcodeSelect.output.trim() : null;
    const xcodebuild = runCommand('xcodebuild', ['-version']);
    const simctl = runSimctlAvailableDevices();
    const simctlLicenseBlocked =
      /have not agreed to the Xcode license agreements/i.test(simctl.output);
    const simctlTransientFailure =
      !simctl.ok && isTransientSimctlFailure(simctl.output);
    const simctlHasAvailableDevices =
      simctl.ok && /\([0-9A-Fa-f-]{36}\)/.test(simctl.output);

    return {
      developerDir,
      simctlAvailable: simctl.ok,
      simctlHasAvailableDevices,
      simctlLicenseBlocked,
      simctlTransientFailure,
      xcodebuildAvailable: xcodebuild.ok,
    };
  };

export const runKangurMobileIosToolchainCheck = (): void => {
  const toolchainState = collectKangurMobileIosToolchainState();
  const report = analyzeKangurMobileIosToolchain(toolchainState);

  console.log(
    `[kangur-mobile-ios-toolchain] status=${report.status} developerDir=${report.resolved.developerDir ?? 'unset'}`,
  );

  if (report.issues.length === 0) {
    console.log('[kangur-mobile-ios-toolchain] No issues detected.');
  } else {
    for (const issue of report.issues) {
      const prefix = issue.level === 'error' ? 'ERROR' : 'WARN';
      console.log(`[kangur-mobile-ios-toolchain] ${prefix} ${issue.message}`);
    }
  }

  if (report.status === 'error') {
    process.exit(1);
  }
};

if (process.argv[1]?.includes('check-kangur-mobile-ios-toolchain.ts')) {
  runKangurMobileIosToolchainCheck();
}
