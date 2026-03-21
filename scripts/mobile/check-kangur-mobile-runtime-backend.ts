import { execFile } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import * as mobilePublicConfigSharedModule from '../../apps/mobile/src/config/mobilePublicConfig.shared';
import type {
  KangurMobilePublicConfig,
  KangurMobilePublicConfigSources,
} from '../../apps/mobile/src/config/mobilePublicConfig.shared';
import {
  isLoopbackHost,
  type KangurMobileRuntimeTarget,
} from './check-kangur-mobile-runtime-env';

export type KangurMobileRuntimeBackendReport = {
  apiUrl: string | null;
  probeUrl: string | null;
  status: 'error' | 'ok' | 'skipped';
  responseStatus: number | null;
};

export type KangurMobileRuntimeBackendCurlResult = {
  statusCode: number;
};

const ANDROID_EMULATOR_HOST = '10.0.2.2';

const getRuntimeBackendCheckCommand = (
  target: KangurMobileRuntimeTarget,
): string => {
  switch (target) {
    case 'ios-simulator':
      return 'npm run check:mobile:runtime:backend:ios';
    case 'android-emulator':
      return 'npm run check:mobile:runtime:backend:android';
    case 'device':
      return 'npm run check:mobile:runtime:backend:device';
  }
};

const getRuntimePrepareCommand = (
  target: KangurMobileRuntimeTarget,
): string => {
  switch (target) {
    case 'ios-simulator':
      return 'npm run prepare:mobile:runtime:ios';
    case 'android-emulator':
      return 'npm run prepare:mobile:runtime:android';
    case 'device':
      return 'npm run prepare:mobile:runtime:device';
  }
};

const getRuntimeLaunchCommand = (
  target: KangurMobileRuntimeTarget,
): string => {
  switch (target) {
    case 'ios-simulator':
      return 'npm run dev:mobile:ios:local';
    case 'android-emulator':
      return 'npm run dev:mobile:android:local';
    case 'device':
      return 'npm run dev:mobile:device:local';
  }
};

const getRuntimePortCheckCommand = (
  target: KangurMobileRuntimeTarget,
): string => {
  switch (target) {
    case 'ios-simulator':
    case 'android-emulator':
    case 'device':
      return 'npm run check:mobile:native:port';
  }
};

const getRuntimeChecklistCommand = (
  target: KangurMobileRuntimeTarget,
): string => {
  switch (target) {
    case 'ios-simulator':
      return 'npm run checklist:mobile:native:runtime:ios';
    case 'android-emulator':
      return 'npm run checklist:mobile:native:runtime:android';
    case 'device':
      return 'npm run checklist:mobile:native:runtime:device';
  }
};

type KangurMobilePublicConfigResolver = (
  sources: KangurMobilePublicConfigSources,
) => KangurMobilePublicConfig;

const mobilePublicConfigShared =
  'default' in mobilePublicConfigSharedModule &&
  mobilePublicConfigSharedModule.default &&
  typeof mobilePublicConfigSharedModule.default === 'object'
    ? (mobilePublicConfigSharedModule.default as {
        resolveKangurMobilePublicConfigFromSources?: KangurMobilePublicConfigResolver;
      })
    : mobilePublicConfigSharedModule;

const resolveKangurMobilePublicConfigFromSources =
  mobilePublicConfigShared.resolveKangurMobilePublicConfigFromSources;

const getKangurMobilePublicConfigResolver =
  (): KangurMobilePublicConfigResolver => {
    if (typeof resolveKangurMobilePublicConfigFromSources !== 'function') {
      throw new Error(
        '[kangur-mobile-runtime-backend] Missing resolveKangurMobilePublicConfigFromSources export.',
      );
    }

    return resolveKangurMobilePublicConfigFromSources;
  };

export const parseKangurMobileRuntimeBackendTarget = (
  argv: string[] = process.argv.slice(2),
): KangurMobileRuntimeTarget => {
  const inlineTargetArgument = argv.find((argument) =>
    argument.startsWith('--target='),
  );
  if (inlineTargetArgument) {
    const value = inlineTargetArgument.slice('--target='.length).trim();
    if (
      value === 'ios-simulator' ||
      value === 'android-emulator' ||
      value === 'device'
    ) {
      return value;
    }

    throw new Error(
      `Invalid --target value "${value ?? ''}". Expected ios-simulator, android-emulator, or device.`,
    );
  }

  const targetIndex = argv.findIndex((argument) => argument === '--target');
  if (targetIndex === -1) {
    return 'ios-simulator';
  }

  const value = argv[targetIndex + 1]?.trim();
  if (
    value === 'ios-simulator' ||
    value === 'android-emulator' ||
    value === 'device'
  ) {
    return value;
  }

  throw new Error(
    `Invalid --target value "${value ?? ''}". Expected ios-simulator, android-emulator, or device.`,
  );
};

export const shouldUseKangurMobileRuntimeBackendLocalLaunchEnv = (
  argv: string[] = process.argv.slice(2),
): boolean => argv.includes('--local-launch-env');

const createApiUrlWithHostname = (
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

const detectKangurMobileLanHost = (): string | null => {
  const interfaces = networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (
        address.family === 'IPv4' &&
        !address.internal &&
        typeof address.address === 'string' &&
        address.address.trim().length > 0
      ) {
        return address.address.trim();
      }
    }
  }

  return null;
};

export const resolveKangurMobileRuntimeBackendApiUrl = (
  env: NodeJS.ProcessEnv,
  target: KangurMobileRuntimeTarget,
  {
    deviceLanHost = detectKangurMobileLanHost(),
    localLaunchEnv = false,
  }: {
    deviceLanHost?: string | null;
    localLaunchEnv?: boolean;
  } = {},
): string | null => {
  const config = getKangurMobilePublicConfigResolver()({
    envApiUrl: env['EXPO_PUBLIC_KANGUR_API_URL'],
    envAuthMode: env['EXPO_PUBLIC_KANGUR_AUTH_MODE'],
  });
  const apiUrl = config.apiUrl;

  if (!apiUrl || !localLaunchEnv) {
    return apiUrl;
  }

  try {
    const hostname = new URL(apiUrl).hostname.toLowerCase();

    if (target === 'android-emulator') {
      if (hostname === ANDROID_EMULATOR_HOST) {
        return createApiUrlWithHostname(apiUrl, 'localhost') ?? apiUrl;
      }

      return apiUrl;
    }

    if (
      target === 'device' &&
      deviceLanHost &&
      (isLoopbackHost(hostname) || hostname === ANDROID_EMULATOR_HOST)
    ) {
      return createApiUrlWithHostname(apiUrl, deviceLanHost) ?? apiUrl;
    }

    return apiUrl;
  } catch {
    return apiUrl;
  }
};

export const createKangurMobileRuntimeBackendProbeUrl = (
  apiUrl: string,
): string => `${apiUrl.replace(/\/$/, '')}/api/kangur/auth/me`;

export const shouldSkipKangurMobileRuntimeBackendProbe = (
  env: NodeJS.ProcessEnv = process.env,
): boolean => env['CODEX_SANDBOX_NETWORK_DISABLED'] === '1';

export const createKangurMobileRuntimeBackendNextSteps = (
  target: KangurMobileRuntimeTarget,
  status: KangurMobileRuntimeBackendReport['status'],
): string[] => {
  const backendCheckCommand = getRuntimeBackendCheckCommand(target);
  const portCheckCommand = getRuntimePortCheckCommand(target);
  const prepareCommand = getRuntimePrepareCommand(target);
  const launchCommand = getRuntimeLaunchCommand(target);
  const checklistCommand = getRuntimeChecklistCommand(target);

  const steps =
    status === 'skipped'
      ? [
          `Re-run ${backendCheckCommand} outside the Codex sandbox or in your normal shell before native validation.`,
        ]
      : [];

  return [
    ...steps,
    `Run ${prepareCommand} once the backend check is green for this target.`,
    `Run ${portCheckCommand} before ${launchCommand} so Expo does not stall on a port prompt.`,
    `Run ${launchCommand} to launch Expo for this target.`,
    `After Expo launches, run ${checklistCommand} for the learner-session validation flow.`,
  ];
};

export const probeKangurMobileRuntimeBackendWithCurl = (
  apiUrl: string,
): Promise<KangurMobileRuntimeBackendCurlResult> =>
  new Promise((resolve, reject) => {
    const probeUrl = createKangurMobileRuntimeBackendProbeUrl(apiUrl);
    execFile(
      'curl',
      ['-sS', '-o', '/dev/null', '-w', '%{http_code}', probeUrl],
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        const statusCode = Number.parseInt(stdout.trim(), 10);
        if (!Number.isInteger(statusCode)) {
          reject(
            new Error(
              `[kangur-mobile-runtime-backend] Unexpected curl status output "${stdout.trim()}".`,
            ),
          );
          return;
        }

        resolve({
          statusCode,
        });
      },
    );
  });

export const probeKangurMobileRuntimeBackend = async (
  apiUrl: string,
  probeImpl: (
    apiUrl: string,
  ) => Promise<KangurMobileRuntimeBackendCurlResult> =
    probeKangurMobileRuntimeBackendWithCurl,
): Promise<KangurMobileRuntimeBackendReport> => {
  const probeUrl = createKangurMobileRuntimeBackendProbeUrl(apiUrl);
  let result: KangurMobileRuntimeBackendCurlResult;

  try {
    result = await probeImpl(apiUrl);
  } catch {
    throw new Error(
      `[kangur-mobile-runtime-backend] Could not reach the Kangur backend at ${apiUrl}. Start the local backend or update EXPO_PUBLIC_KANGUR_API_URL before launching native validation.`,
    );
  }

  if (result.statusCode >= 500) {
    throw new Error(
      `[kangur-mobile-runtime-backend] The Kangur backend at ${apiUrl} responded with ${result.statusCode}. Fix the backend before launching native validation.`,
    );
  }

  return {
    apiUrl,
    probeUrl,
    responseStatus: result.statusCode,
    status: 'ok',
  };
};

export const runKangurMobileRuntimeBackendCheck = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  const target = parseKangurMobileRuntimeBackendTarget(argv);
  const localLaunchEnv = shouldUseKangurMobileRuntimeBackendLocalLaunchEnv(argv);
  const apiUrl = resolveKangurMobileRuntimeBackendApiUrl(process.env, target, {
    localLaunchEnv,
  });

  if (!apiUrl) {
    throw new Error(
      '[kangur-mobile-runtime-backend] EXPO_PUBLIC_KANGUR_API_URL is required before checking backend reachability.',
    );
  }

  if (shouldSkipKangurMobileRuntimeBackendProbe()) {
    console.log(
      `[kangur-mobile-runtime-backend] target=${target} localLaunchEnv=${localLaunchEnv ? 'on' : 'off'} status=skipped apiUrl=${apiUrl} reason=codex-sandbox-network-disabled`,
    );
    console.log('[kangur-mobile-runtime-backend] Suggested next steps:');
    for (const step of createKangurMobileRuntimeBackendNextSteps(target, 'skipped')) {
      console.log(`[kangur-mobile-runtime-backend] NEXT ${step}`);
    }
    return;
  }

  const report = await probeKangurMobileRuntimeBackend(apiUrl);
  console.log(
    `[kangur-mobile-runtime-backend] target=${target} localLaunchEnv=${localLaunchEnv ? 'on' : 'off'} status=${report.status} apiUrl=${report.apiUrl} probe=${report.probeUrl} responseStatus=${report.responseStatus}`,
  );
  console.log('[kangur-mobile-runtime-backend] Suggested next steps:');
  for (const step of createKangurMobileRuntimeBackendNextSteps(target, report.status)) {
    console.log(`[kangur-mobile-runtime-backend] NEXT ${step}`);
  }
};

if (process.argv[1]?.includes('check-kangur-mobile-runtime-backend.ts')) {
  runKangurMobileRuntimeBackendCheck().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
