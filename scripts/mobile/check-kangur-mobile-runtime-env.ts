import * as mobilePublicConfigSharedModule from '../../apps/mobile/src/config/mobilePublicConfig.shared.ts';
import type {
  KangurMobilePublicConfig,
  KangurMobilePublicConfigSources,
} from '../../apps/mobile/src/config/mobilePublicConfig.shared.ts';

export type KangurMobileRuntimeTarget =
  | 'ios-simulator'
  | 'android-emulator'
  | 'device';

export type KangurMobileRuntimeEnvIssue = {
  level: 'error' | 'warning';
  message: string;
};

export type KangurMobileRuntimeEnvReport = {
  issues: KangurMobileRuntimeEnvIssue[];
  resolved: {
    apiUrl: string | null;
    authMode: 'development' | 'learner-session';
    hostname: string | null;
    target: KangurMobileRuntimeTarget;
  };
  status: 'error' | 'ok';
};

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const ANDROID_EMULATOR_HOST = '10.0.2.2';

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

export const parseRuntimeTarget = (
  argv: string[],
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
    return 'device';
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

export const isLoopbackHost = (hostname: string | null): boolean =>
  hostname !== null && LOOPBACK_HOSTS.has(hostname);

const addIssue = (
  issues: KangurMobileRuntimeEnvIssue[],
  level: KangurMobileRuntimeEnvIssue['level'],
  message: string,
): void => {
  issues.push({ level, message });
};

export const analyzeKangurMobileRuntimeEnv = (
  env: NodeJS.ProcessEnv,
  target: KangurMobileRuntimeTarget = 'device',
): KangurMobileRuntimeEnvReport => {
  const config = resolveKangurMobilePublicConfigFromSources({
    envApiUrl: env.EXPO_PUBLIC_KANGUR_API_URL,
    envAuthMode: env.EXPO_PUBLIC_KANGUR_AUTH_MODE,
  });
  const issues: KangurMobileRuntimeEnvIssue[] = [];

  if (config.authMode !== 'learner-session') {
    addIssue(
      issues,
      'error',
      'EXPO_PUBLIC_KANGUR_AUTH_MODE must be set to learner-session for native learner-session validation.',
    );
  }

  if (!config.apiUrl) {
    addIssue(
      issues,
      'error',
      'EXPO_PUBLIC_KANGUR_API_URL is required for native runtime validation.',
    );

    return {
      issues,
      resolved: {
        apiUrl: null,
        authMode: config.authMode,
        hostname: null,
        target,
      },
      status: 'error',
    };
  }

  let hostname: string | null = null;
  try {
    hostname = new URL(config.apiUrl).hostname.toLowerCase();
  } catch {
    addIssue(
      issues,
      'error',
      `EXPO_PUBLIC_KANGUR_API_URL is not a valid URL: "${config.apiUrl}".`,
    );
  }

  if (hostname) {
    if (target === 'android-emulator' && isLoopbackHost(hostname)) {
      addIssue(
        issues,
        'error',
        'localhost/127.0.0.1 will not reach the host machine from the Android emulator. Use http://10.0.2.2:3000 or an explicit reachable API origin.',
      );
    }

    if (
      target === 'ios-simulator' &&
      hostname === ANDROID_EMULATOR_HOST
    ) {
      addIssue(
        issues,
        'warning',
        '10.0.2.2 is the Android emulator host alias. Use localhost for iOS simulator validation unless you intentionally route through another origin.',
      );
    }

    if (
      target === 'device' &&
      (isLoopbackHost(hostname) || hostname === ANDROID_EMULATOR_HOST)
    ) {
      addIssue(
        issues,
        'error',
        'Physical devices cannot reach localhost or 10.0.2.2 on your development machine. Use a LAN IP or tunnel URL for EXPO_PUBLIC_KANGUR_API_URL.',
      );
    }

    if (
      target === 'device' &&
      !isLoopbackHost(hostname) &&
      hostname !== ANDROID_EMULATOR_HOST &&
      config.apiUrl.startsWith('http://')
    ) {
      addIssue(
        issues,
        'warning',
        'Using plain HTTP on a physical device is fine for local validation, but confirm the device can reach that host on the same network.',
      );
    }
  }

  return {
    issues,
    resolved: {
      apiUrl: config.apiUrl,
      authMode: config.authMode,
      hostname,
      target,
    },
    status: issues.some((issue) => issue.level === 'error') ? 'error' : 'ok',
  };
};

export const runKangurMobileRuntimeEnvCheck = (): void => {
  const target = parseRuntimeTarget(process.argv.slice(2));
  const report = analyzeKangurMobileRuntimeEnv(process.env, target);

  console.log(
    `[kangur-mobile-runtime-env] target=${report.resolved.target} status=${report.status}`,
  );
  console.log(
    `authMode=${report.resolved.authMode} apiUrl=${report.resolved.apiUrl ?? 'unset'} hostname=${report.resolved.hostname ?? 'unset'}`,
  );

  if (report.issues.length === 0) {
    console.log('[kangur-mobile-runtime-env] No issues detected.');
  } else {
    for (const issue of report.issues) {
      const prefix = issue.level === 'error' ? 'ERROR' : 'WARN';
      console.log(`[kangur-mobile-runtime-env] ${prefix} ${issue.message}`);
    }
  }

  if (report.status === 'error') {
    process.exit(1);
  }
};

if (process.argv[1]?.includes('check-kangur-mobile-runtime-env.ts')) {
  runKangurMobileRuntimeEnvCheck();
}
