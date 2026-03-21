import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DEFAULT_DEVICE = 'booted';
const DEFAULT_EXPO_URL = 'exp://127.0.0.1:8081';
const DEFAULT_OPERATION = 'clock';
const DEFAULT_OUTPUT_DIR = '/tmp/kangur-mobile-ios-debug-proof';
const DEFAULT_WAIT_MS = 8_000;
const MAX_TRANSIENT_SIMCTL_RETRIES = 3;

export type KangurMobileIosDebugProofOptions = {
  device: string;
  dryRun: boolean;
  expoUrl: string;
  operation: string;
  outputDir: string;
  step: KangurMobileIosDebugProofStepKey | null;
  waitMs: number;
};

export type KangurMobileIosDebugProofStepKey =
  | 'summary'
  | 'results'
  | 'leaderboard'
  | 'profile'
  | 'plan'
  | 'home';

export type KangurMobileIosDebugProofStep = {
  fileName: string;
  key: KangurMobileIosDebugProofStepKey;
  route: string;
  title: string;
};

export const shouldRetryKangurMobileIosDebugProofSimctl = (
  output: string,
): boolean =>
  output.includes('CoreSimulatorService connection became invalid') ||
  output.includes('Unable to locate device set') ||
  output.includes('Connection refused');

export const createKangurMobileIosDebugProofSimctlFailureHint = (
  output: string,
): string | null =>
  shouldRetryKangurMobileIosDebugProofSimctl(output)
    ? 'CoreSimulatorService stayed unavailable across the retry budget. Run "xcrun simctl list devices" once, confirm the simulator is still booted, and then rerun the proof command.'
    : null;

const parseInteger = (rawValue: string, flagName: string): number => {
  const value = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `[kangur-mobile-ios-debug-proof] Invalid ${flagName} value "${rawValue}". Expected a positive integer.`,
    );
  }

  return value;
};

const STEP_KEYS: KangurMobileIosDebugProofStepKey[] = [
  'summary',
  'results',
  'leaderboard',
  'profile',
  'plan',
  'home',
];

const parseStep = (rawValue: string): KangurMobileIosDebugProofStepKey => {
  const value = rawValue.trim().toLowerCase();
  if (STEP_KEYS.includes(value as KangurMobileIosDebugProofStepKey)) {
    return value as KangurMobileIosDebugProofStepKey;
  }

  throw new Error(
    `[kangur-mobile-ios-debug-proof] Invalid --step value "${rawValue}". Expected one of: ${STEP_KEYS.join(', ')}.`,
  );
};

const normalizeExpoUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/--') ? trimmed.slice(0, -3) : trimmed;
};

export const parseKangurMobileIosDebugProofOptions = (
  args: string[] = process.argv.slice(2),
): KangurMobileIosDebugProofOptions => {
  let device = DEFAULT_DEVICE;
  let dryRun = false;
  let expoUrl =
    process.env['KANGUR_MOBILE_NATIVE_PROOF_EXPO_URL']?.trim() ||
    DEFAULT_EXPO_URL;
  let operation =
    process.env['KANGUR_MOBILE_NATIVE_PROOF_OPERATION']?.trim() ||
    DEFAULT_OPERATION;
  let outputDir =
    process.env['KANGUR_MOBILE_NATIVE_PROOF_OUTPUT_DIR']?.trim() ||
    DEFAULT_OUTPUT_DIR;
  let step = process.env['KANGUR_MOBILE_NATIVE_PROOF_STEP']?.trim()
    ? parseStep(process.env['KANGUR_MOBILE_NATIVE_PROOF_STEP'])
    : null;
  let waitMs = DEFAULT_WAIT_MS;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument) {
      continue;
    }

    if (argument === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (argument === '--device') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('[kangur-mobile-ios-debug-proof] Missing value for --device.');
      }
      device = value;
      index += 1;
      continue;
    }

    if (argument === '--expo-url') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('[kangur-mobile-ios-debug-proof] Missing value for --expo-url.');
      }
      expoUrl = value;
      index += 1;
      continue;
    }

    if (argument === '--operation') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('[kangur-mobile-ios-debug-proof] Missing value for --operation.');
      }
      operation = value;
      index += 1;
      continue;
    }

    if (argument === '--output-dir') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('[kangur-mobile-ios-debug-proof] Missing value for --output-dir.');
      }
      outputDir = value;
      index += 1;
      continue;
    }

    if (argument === '--step') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('[kangur-mobile-ios-debug-proof] Missing value for --step.');
      }
      step = parseStep(value);
      index += 1;
      continue;
    }

    if (argument === '--wait-ms') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('[kangur-mobile-ios-debug-proof] Missing value for --wait-ms.');
      }
      waitMs = parseInteger(value, '--wait-ms');
      index += 1;
      continue;
    }

    if (argument.startsWith('--device=')) {
      device = argument.slice('--device='.length);
      continue;
    }

    if (argument.startsWith('--expo-url=')) {
      expoUrl = argument.slice('--expo-url='.length);
      continue;
    }

    if (argument.startsWith('--operation=')) {
      operation = argument.slice('--operation='.length);
      continue;
    }

    if (argument.startsWith('--output-dir=')) {
      outputDir = argument.slice('--output-dir='.length);
      continue;
    }

    if (argument.startsWith('--step=')) {
      step = parseStep(argument.slice('--step='.length));
      continue;
    }

    if (argument.startsWith('--wait-ms=')) {
      waitMs = parseInteger(argument.slice('--wait-ms='.length), '--wait-ms');
      continue;
    }

    throw new Error(
      `[kangur-mobile-ios-debug-proof] Unknown argument "${argument}".`,
    );
  }

  return {
    device,
    dryRun,
    expoUrl: normalizeExpoUrl(expoUrl),
    operation: operation.trim() || DEFAULT_OPERATION,
    outputDir: resolve(outputDir),
    step,
    waitMs,
  };
};

export const buildKangurMobileIosDebugProofSteps = (
  operation: string,
  step: KangurMobileIosDebugProofStepKey | null = null,
): KangurMobileIosDebugProofStep[] => {
  const steps: KangurMobileIosDebugProofStep[] = [
    {
      fileName: '01-practice-summary.png',
      key: 'summary',
      route: `/practice?operation=${operation}&debugAutoComplete=perfect`,
      title: 'synced summary',
    },
    {
      fileName: '02-results.png',
      key: 'results',
      route: `/practice?operation=${operation}&debugAutoComplete=perfect&debugRedirectTo=results`,
      title: 'results',
    },
    {
      fileName: '03-leaderboard.png',
      key: 'leaderboard',
      route: `/practice?operation=${operation}&debugAutoComplete=perfect&debugRedirectTo=leaderboard`,
      title: 'leaderboard',
    },
    {
      fileName: '04-profile.png',
      key: 'profile',
      route: `/practice?operation=${operation}&debugAutoComplete=perfect&debugRedirectTo=profile`,
      title: 'profile',
    },
    {
      fileName: '05-plan.png',
      key: 'plan',
      route: `/practice?operation=${operation}&debugAutoComplete=perfect&debugRedirectTo=plan`,
      title: 'plan',
    },
    {
      fileName: '06-home.png',
      key: 'home',
      route: `/practice?operation=${operation}&debugAutoComplete=perfect&debugRedirectTo=home`,
      title: 'home',
    },
  ];

  return step ? steps.filter((candidate) => candidate.key === step) : steps;
};

export const createKangurMobileIosDebugProofUrl = (
  expoUrl: string,
  route: string,
): string => `${normalizeExpoUrl(expoUrl)}/--${route}`;

export const buildKangurMobileIosDebugProofManualCommands = ({
  device,
  screenshotPath,
  url,
  waitMs,
}: {
  device: string;
  screenshotPath: string;
  url: string;
  waitMs: number;
}): string[] => [
  `xcrun simctl openurl ${device} '${url}'`,
  `sleep ${Math.ceil(waitMs / 1000)}`,
  `xcrun simctl io ${device} screenshot ${screenshotPath}`,
];

const wait = async (durationMs: number): Promise<void> => {
  await new Promise<void>((resolvePromise) => {
    setTimeout(resolvePromise, durationMs);
  });
};

const runSimctlRecoveryProbe = async (): Promise<void> => {
  await new Promise<void>((resolvePromise) => {
    const child = spawn('xcrun', ['simctl', 'list', 'devices'], {
      stdio: 'ignore',
    });

    child.on('error', () => {
      resolvePromise();
    });

    child.on('exit', () => {
      resolvePromise();
    });
  });
};

const resyncSimctlBeforeOpen = async (): Promise<void> => {
  await runSimctlRecoveryProbe();
  await wait(1000);
};

const runCommand = async (
  args: string[],
  attempt = 0,
): Promise<void> => {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn('xcrun', ['simctl', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let combinedOutput = '';

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      combinedOutput += text;
      process.stdout.write(chunk);
    });

    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      combinedOutput += text;
      process.stderr.write(chunk);
    });

    child.on('error', rejectPromise);
    child.on('exit', async (code, signal) => {
      if (signal) {
        rejectPromise(
          new Error(
            `[kangur-mobile-ios-debug-proof] xcrun simctl ${args.join(
              ' ',
            )} exited with signal ${signal}.`,
          ),
        );
        return;
      }

      if (code !== 0) {
        if (
          attempt < MAX_TRANSIENT_SIMCTL_RETRIES - 1 &&
          shouldRetryKangurMobileIosDebugProofSimctl(combinedOutput)
        ) {
          process.stderr.write(
            `[kangur-mobile-ios-debug-proof] transient CoreSimulatorService failure detected on attempt ${attempt + 1}/${MAX_TRANSIENT_SIMCTL_RETRIES}; resyncing and retrying.\n`,
          );
          try {
            await runSimctlRecoveryProbe();
            await wait(1500);
            await runCommand(args, attempt + 1);
            resolvePromise();
          } catch (error) {
            rejectPromise(error);
          }
          return;
        }

        const failureHint =
          createKangurMobileIosDebugProofSimctlFailureHint(combinedOutput);
        rejectPromise(
          new Error(
            `[kangur-mobile-ios-debug-proof] xcrun simctl ${args.join(
              ' ',
            )} exited with code ${code ?? 1}.${failureHint ? ` ${failureHint}` : ''}`,
          ),
        );
        return;
      }

      resolvePromise();
    });
  });
};

const main = async (): Promise<void> => {
  const options = parseKangurMobileIosDebugProofOptions();
  const steps = buildKangurMobileIosDebugProofSteps(
    options.operation,
    options.step,
  );

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          ...options,
          steps: steps.map((step) => ({
            file: join(options.outputDir, step.fileName),
            key: step.key,
            manualCommands: buildKangurMobileIosDebugProofManualCommands({
              device: options.device,
              screenshotPath: join(options.outputDir, step.fileName),
              url: createKangurMobileIosDebugProofUrl(options.expoUrl, step.route),
              waitMs: options.waitMs,
            }),
            title: step.title,
            url: createKangurMobileIosDebugProofUrl(options.expoUrl, step.route),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  await mkdir(options.outputDir, { recursive: true });

  for (const step of steps) {
    const url = createKangurMobileIosDebugProofUrl(options.expoUrl, step.route);
    const screenshotPath = join(options.outputDir, step.fileName);

    console.log(
      `[kangur-mobile-ios-debug-proof] resyncing simulator services before ${step.title}`,
    );
    await resyncSimctlBeforeOpen();
    console.log(`[kangur-mobile-ios-debug-proof] opening ${step.title}: ${url}`);
    await runCommand(['openurl', options.device, url]);
    await wait(options.waitMs);
    console.log(
      `[kangur-mobile-ios-debug-proof] capturing ${step.title}: ${screenshotPath}`,
    );
    await runCommand(['io', options.device, 'screenshot', screenshotPath]);
  }

  console.log(
    `[kangur-mobile-ios-debug-proof] wrote ${steps.length} screenshots to ${options.outputDir}`,
  );
};

const entryPointUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (entryPointUrl && import.meta.url === entryPointUrl) {
  void main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : `[kangur-mobile-ios-debug-proof] ${String(error)}`,
    );
    process.exitCode = 1;
  });
}
