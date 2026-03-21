import { execFile, spawn } from 'node:child_process';
import { resolve } from 'node:path';
import {
  analyzeKangurMobileRuntimeEnv,
  isLoopbackHost,
  parseRuntimeTarget,
  type KangurMobileRuntimeTarget,
} from './check-kangur-mobile-runtime-env';
import {
  probeKangurMobileRuntimeBackend,
  shouldSkipKangurMobileRuntimeBackendProbe,
} from './check-kangur-mobile-runtime-backend';
import { detectKangurMobileLanHost } from './check-kangur-mobile-native-runtime-readiness';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const MOBILE_WORKSPACE_DIR = resolve(import.meta.dirname, '../../apps/mobile');
const ANDROID_EMULATOR_HOST = '10.0.2.2';
const DEFAULT_EXPO_DEV_SERVER_PORT = 8081;

export type KangurMobileNativeLocalOptions = {
  dryRun: boolean;
  skipPrepare: boolean;
  target: KangurMobileRuntimeTarget;
};

export type KangurMobileNativeLocalPlan = {
  rootChecklistScript:
    | 'checklist:mobile:native:runtime:ios'
    | 'checklist:mobile:native:runtime:android'
    | 'checklist:mobile:native:runtime:device';
  rootDependencyScript: 'check:mobile:native:deps';
  rootPortScript: 'check:mobile:native:port';
  prepareScript: 'prepare:runtime:ios' | 'prepare:runtime:android' | 'prepare:runtime:device';
  rootPrepareScript:
    | 'prepare:mobile:runtime:ios'
    | 'prepare:mobile:runtime:android'
    | 'prepare:mobile:runtime:device';
  rootReadinessScript:
    | 'check:mobile:native:runtime:ios'
    | 'check:mobile:native:runtime:android'
    | 'check:mobile:native:runtime:device';
  rootStartScript:
    | 'dev:mobile:ios:local'
    | 'dev:mobile:android:local'
    | 'dev:mobile:device:local';
  workspaceChecklistScript:
    | 'checklist:native:runtime:ios'
    | 'checklist:native:runtime:android'
    | 'checklist:native:runtime:device';
  workspaceDependencyScript: 'check:native:deps';
  workspacePortScript: 'check:native:port';
  workspaceReadinessScript:
    | 'check:native:runtime:ios'
    | 'check:native:runtime:android'
    | 'check:native:runtime:device';
  startScript: 'ios' | 'android' | 'dev';
  target: KangurMobileRuntimeTarget;
};

export type KangurMobileNativeLocalLaunchEnvResolution = {
  env: NodeJS.ProcessEnv;
  notices: string[];
};

export type KangurMobileNativeLocalExpoPortReport = {
  port: number;
  status: 'free' | 'occupied';
};

const replaceApiUrlHostname = (
  apiUrl: string,
  hostname: string,
): string | null => {
  try {
    const url = new URL(apiUrl);
    url.hostname = hostname;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

export const createKangurMobileNativeLocalLaunchEnv = (
  baseEnv: NodeJS.ProcessEnv,
  target: KangurMobileRuntimeTarget,
  {
    deviceLanHost = detectKangurMobileLanHost(),
  }: {
    deviceLanHost?: string | null;
  } = {},
): KangurMobileNativeLocalLaunchEnvResolution => {
  const env = {
    ...baseEnv,
  };
  const notices: string[] = [];
  const apiUrl = env['EXPO_PUBLIC_KANGUR_API_URL']?.trim();

  if (!env['EXPO_OFFLINE']?.trim()) {
    env['EXPO_OFFLINE'] = '1';
    notices.push(
      'defaulted EXPO_OFFLINE=1 for local native launch so Expo uses anonymous manifest signatures and skips the Expo account prompt.',
    );
  }

  if (!apiUrl) {
    return {
      env,
      notices,
    };
  }

  if (target === 'android-emulator') {
    try {
      const hostname = new URL(apiUrl).hostname.toLowerCase();
      if (isLoopbackHost(hostname)) {
        const normalizedApiUrl =
          replaceApiUrlHostname(apiUrl, ANDROID_EMULATOR_HOST);
        if (normalizedApiUrl && normalizedApiUrl !== apiUrl) {
          env['EXPO_PUBLIC_KANGUR_API_URL'] = normalizedApiUrl;
          notices.push(
            `normalized EXPO_PUBLIC_KANGUR_API_URL from ${apiUrl} to ${normalizedApiUrl} for Android emulator access.`,
          );
        }
      }
    } catch {
      // Leave invalid URL handling to the runtime env analyzer.
    }
  }

  if (target === 'device') {
    try {
      const hostname = new URL(apiUrl).hostname.toLowerCase();
      if (
        deviceLanHost &&
        (isLoopbackHost(hostname) || hostname === ANDROID_EMULATOR_HOST)
      ) {
        const normalizedApiUrl =
          replaceApiUrlHostname(apiUrl, deviceLanHost);
        if (normalizedApiUrl && normalizedApiUrl !== apiUrl) {
          env['EXPO_PUBLIC_KANGUR_API_URL'] = normalizedApiUrl;
          notices.push(
            `normalized EXPO_PUBLIC_KANGUR_API_URL from ${apiUrl} to ${normalizedApiUrl} for physical-device access.`,
          );
        }
      }
    } catch {
      // Leave invalid URL handling to the runtime env analyzer.
    }
  }

  return {
    env,
    notices,
  };
};

export const createKangurMobileNativeLocalReadinessHint = (
  plan: KangurMobileNativeLocalPlan,
): string =>
  `Run "npm run ${plan.rootReadinessScript}" from the repo root or "npm run ${plan.workspaceReadinessScript}" in apps/mobile for the full scoped readiness report.`;

export const createKangurMobileNativeLocalDependencyHint = (
  plan: KangurMobileNativeLocalPlan,
): string =>
  `Run "npm run ${plan.rootDependencyScript}" from the repo root or "npm run ${plan.workspaceDependencyScript}" in apps/mobile to preflight native Expo and React Native dependencies before launch.`;

export const createKangurMobileNativeLocalPortHint = (
  plan: KangurMobileNativeLocalPlan,
): string =>
  `Run "npm run ${plan.rootPortScript}" from the repo root or "npm run ${plan.workspacePortScript}" in apps/mobile to confirm Expo port 8081 is free before launch.`;

export const createKangurMobileNativeLocalPrepareHint = (
  plan: KangurMobileNativeLocalPlan,
): string =>
  `Then re-run "npm run ${plan.rootPrepareScript}" or "npm run ${plan.rootStartScript}".`;

export const createKangurMobileNativeLocalChecklistHint = (
  plan: KangurMobileNativeLocalPlan,
): string =>
  `After Expo launches, use "npm run ${plan.rootChecklistScript}" from the repo root or "npm run ${plan.workspaceChecklistScript}" in apps/mobile for the native learner-session validation checklist.`;

export const createKangurMobileNativeLocalPortConflictHint = (
  port = DEFAULT_EXPO_DEV_SERVER_PORT,
): string =>
  `Port ${port} is already occupied. Stop the existing Expo/dev server on that port or run "lsof -i tcp:${port}" to identify it, then re-run the native launch.`;

export const createKangurMobileNativeLocalPrepareFailureMessage = (
  plan: KangurMobileNativeLocalPlan,
  error: unknown,
): string => {
  const details = error instanceof Error ? error.message : String(error);
  return `[kangur-mobile-native-local] ${plan.rootPrepareScript} failed for ${plan.target}. ${createKangurMobileNativeLocalReadinessHint(plan)} ${createKangurMobileNativeLocalDependencyHint(plan)} ${createKangurMobileNativeLocalPrepareHint(plan)}\n${details}`;
};

export const checkKangurMobileNativeLocalExpoPort = (
  port = DEFAULT_EXPO_DEV_SERVER_PORT,
): Promise<KangurMobileNativeLocalExpoPortReport> =>
  new Promise((resolvePromise, rejectPromise) => {
    execFile('lsof', ['-i', `tcp:${port}`], (error, stdout) => {
      if (!error) {
        resolvePromise({
          port,
          status: stdout.trim().length > 0 ? 'occupied' : 'free',
        });
        return;
      }

      const execError = error as NodeJS.ErrnoException;
      const exitCode =
        typeof (execError as { code?: unknown }).code === 'number'
          ? (execError as { code?: number }).code
          : undefined;

      if (exitCode === 1) {
        resolvePromise({
          port,
          status: 'free',
        });
        return;
      }

      rejectPromise(execError);
    });
  });

export const parseKangurMobileNativeLocalOptions = (
  args: string[] = process.argv.slice(2),
): KangurMobileNativeLocalOptions => {
  const target = parseRuntimeTarget(args);
  let dryRun = false;
  let skipPrepare = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument) {
      continue;
    }

    if (argument === '--target') {
      index += 1;
      continue;
    }

    if (argument === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (argument === '--skip-prepare') {
      skipPrepare = true;
      continue;
    }

    if (argument.startsWith('--target=')) {
      continue;
    }

    throw new Error(
      `[kangur-mobile-native-local] Unknown argument "${argument}".`,
    );
  }

  return {
    dryRun,
    skipPrepare,
    target,
  };
};

export const createKangurMobileNativeLocalPlan = (
  target: KangurMobileRuntimeTarget,
): KangurMobileNativeLocalPlan => {
  switch (target) {
    case 'ios-simulator':
      return {
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
        target,
      };
    case 'android-emulator':
      return {
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
        target,
      };
    case 'device':
      return {
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
        target,
      };
  }
};

const runWorkspaceScript = (
  scriptName: string,
  {
    env = process.env,
    longRunning = false,
  }: {
    env?: NodeJS.ProcessEnv;
    longRunning?: boolean;
  } = {},
): Promise<void> =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(npmCommand, ['run', scriptName], {
      cwd: MOBILE_WORKSPACE_DIR,
      env,
      stdio: 'inherit',
    });

    child.on('error', rejectPromise);
    child.on('exit', (code, signal) => {
      if (signal) {
        if (longRunning) {
          process.kill(process.pid, signal);
          return;
        }

        rejectPromise(
          new Error(
            `[kangur-mobile-native-local] Script "${scriptName}" exited with signal ${signal}.`,
          ),
        );
        return;
      }

      if (code !== 0) {
        rejectPromise(
          new Error(
            `[kangur-mobile-native-local] Script "${scriptName}" exited with code ${code ?? 1}.`,
          ),
        );
        return;
      }

      resolvePromise();
    });
  });

export const runKangurMobileNativeLocal = async (
  options: KangurMobileNativeLocalOptions = parseKangurMobileNativeLocalOptions(),
): Promise<void> => {
  const launchEnv = createKangurMobileNativeLocalLaunchEnv(
    process.env,
    options.target,
  );
  const report = analyzeKangurMobileRuntimeEnv(launchEnv.env, options.target);
  const plan = createKangurMobileNativeLocalPlan(options.target);

  console.log(
    `[kangur-mobile-native-local] target=${plan.target} readiness=${plan.rootReadinessScript} deps=${plan.rootDependencyScript} port=${plan.rootPortScript} prepare=${options.skipPrepare ? 'skipped' : plan.rootPrepareScript} start=${plan.rootStartScript} checklist=${plan.rootChecklistScript}`,
  );
  for (const notice of launchEnv.notices) {
    console.log(`[kangur-mobile-native-local] NOTICE ${notice}`);
  }

  if (report.status === 'error') {
    for (const issue of report.issues) {
      const prefix = issue.level === 'error' ? 'ERROR' : 'WARN';
      console.log(`[kangur-mobile-native-local] ${prefix} ${issue.message}`);
    }
    throw new Error(
      `[kangur-mobile-native-local] Runtime env validation failed before launching Expo. ${createKangurMobileNativeLocalReadinessHint(plan)} ${createKangurMobileNativeLocalPrepareHint(plan)}`,
    );
  }

  if (options.dryRun) {
    console.log(
      `[kangur-mobile-native-local] dry-run apiUrl=${report.resolved.apiUrl} authMode=${report.resolved.authMode} readiness=${plan.rootReadinessScript} deps=${plan.rootDependencyScript} port=${plan.rootPortScript} prepare=${plan.rootPrepareScript} start=${plan.rootStartScript} checklist=${plan.rootChecklistScript}`,
    );
    console.log(
      `[kangur-mobile-native-local] ${createKangurMobileNativeLocalChecklistHint(plan)}`,
    );
    return;
  }

  if (!options.skipPrepare) {
    try {
      await runWorkspaceScript(plan.prepareScript, {
        env: launchEnv.env,
      });
    } catch (error) {
      throw new Error(
        createKangurMobileNativeLocalPrepareFailureMessage(plan, error),
      );
    }
  }

  if (report.resolved.apiUrl) {
    if (shouldSkipKangurMobileRuntimeBackendProbe()) {
      console.log(
        `[kangur-mobile-native-local] skipping live backend probe for ${report.resolved.apiUrl} because CODEX_SANDBOX_NETWORK_DISABLED=1 in this environment`,
      );
    } else {
      await probeKangurMobileRuntimeBackend(report.resolved.apiUrl);
    }
  }

  const expoPortReport = await checkKangurMobileNativeLocalExpoPort();
  if (expoPortReport.status === 'occupied') {
    throw new Error(
      `[kangur-mobile-native-local] ${createKangurMobileNativeLocalPortConflictHint(
        expoPortReport.port,
      )}`,
    );
  }

  console.log(
    `[kangur-mobile-native-local] ${createKangurMobileNativeLocalChecklistHint(plan)}`,
  );
  await runWorkspaceScript(plan.startScript, {
    env: launchEnv.env,
    longRunning: true,
  });
};

if (process.argv[1]?.includes('run-kangur-mobile-native-local.ts')) {
  runKangurMobileNativeLocal().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
