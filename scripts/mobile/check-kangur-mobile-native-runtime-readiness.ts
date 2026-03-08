import { networkInterfaces } from 'node:os';
import {
  analyzeKangurMobileRuntimeEnv,
  isLoopbackHost,
  type KangurMobileRuntimeEnvReport,
  type KangurMobileRuntimeTarget,
} from './check-kangur-mobile-runtime-env.ts';
import {
  collectKangurMobileAndroidToolchainState,
  collectKangurMobileIosToolchainState,
  createKangurMobileNativeHostReport,
  type KangurMobileNativeHostReport,
} from './check-kangur-mobile-native-host.ts';
import {
  createKangurMobileRuntimeBackendProbeUrl,
  probeKangurMobileRuntimeBackend,
  shouldSkipKangurMobileRuntimeBackendProbe,
  type KangurMobileRuntimeBackendReport,
} from './check-kangur-mobile-runtime-backend.ts';

export type KangurMobileNativeRuntimeReadinessReport = {
  backend: KangurMobileRuntimeBackendReport;
  host: KangurMobileNativeHostReport;
  nextSteps: string[];
  runtime: Record<KangurMobileRuntimeTarget, KangurMobileRuntimeEnvReport>;
  status: 'error' | 'ok' | 'warning';
};

export type KangurMobileNativeRuntimeReadinessScope =
  | 'all'
  | KangurMobileRuntimeTarget;

export type KangurMobileNativeRuntimeReadinessScopedReport = {
  backend: KangurMobileRuntimeBackendReport;
  host: {
    issues: Array<{ level: 'error' | 'warning'; message: string }>;
    status: 'error' | 'ok';
  };
  nextSteps: string[];
  runtime: Partial<Record<KangurMobileRuntimeTarget, KangurMobileRuntimeEnvReport>>;
  scope: KangurMobileNativeRuntimeReadinessScope;
  status: 'error' | 'ok' | 'warning';
};

export type KangurMobileNativeRuntimeBackendProbeTarget =
  | 'ios-simulator'
  | 'android-emulator'
  | 'device';

const RUNTIME_TARGETS: KangurMobileRuntimeTarget[] = [
  'ios-simulator',
  'android-emulator',
  'device',
];

const ANDROID_EMULATOR_HOST = '10.0.2.2';
const IOS_HOST_NEXT_STEPS = [
  'Install full Xcode if it is missing.',
  'Run sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer.',
  'Re-run npm run check:mobile:ios:toolchain.',
] as const;
const ANDROID_HOST_NEXT_STEPS = [
  'Install Android Studio with Android platform-tools and the Android Emulator.',
  'Set ANDROID_SDK_ROOT (and optionally ANDROID_HOME) to your Android SDK location.',
  'Re-run npm run check:mobile:android:toolchain.',
] as const;

const getRuntimeCheckCommand = (target: KangurMobileRuntimeTarget): string => {
  switch (target) {
    case 'ios-simulator':
      return 'npm run check:mobile:runtime:ios';
    case 'android-emulator':
      return 'npm run check:mobile:runtime:android';
    case 'device':
      return 'npm run check:mobile:runtime:device';
  }
};

const getRuntimeBackendCheckCommand = (
  scope: KangurMobileNativeRuntimeReadinessScope,
): string => {
  switch (scope) {
    case 'ios-simulator':
      return 'npm run check:mobile:runtime:backend:ios';
    case 'android-emulator':
      return 'npm run check:mobile:runtime:backend:android';
    case 'device':
      return 'npm run check:mobile:runtime:backend:device';
    case 'all':
      return 'npm run check:mobile:runtime:backend';
  }
};

const getRuntimeChecklistCommand = (
  scope: Exclude<KangurMobileNativeRuntimeReadinessScope, 'all'>,
): string => {
  switch (scope) {
    case 'ios-simulator':
      return 'npm run checklist:mobile:native:runtime:ios';
    case 'android-emulator':
      return 'npm run checklist:mobile:native:runtime:android';
    case 'device':
      return 'npm run checklist:mobile:native:runtime:device';
  }
};

const getRuntimePrepareCommand = (
  scope: Exclude<KangurMobileNativeRuntimeReadinessScope, 'all'>,
): string => {
  switch (scope) {
    case 'ios-simulator':
      return 'npm run prepare:mobile:runtime:ios';
    case 'android-emulator':
      return 'npm run prepare:mobile:runtime:android';
    case 'device':
      return 'npm run prepare:mobile:runtime:device';
  }
};

const getRuntimeLaunchCommand = (
  scope: Exclude<KangurMobileNativeRuntimeReadinessScope, 'all'>,
): string => {
  switch (scope) {
    case 'ios-simulator':
      return 'npm run dev:mobile:ios:local';
    case 'android-emulator':
      return 'npm run dev:mobile:android:local';
    case 'device':
      return 'npm run dev:mobile:device:local';
  }
};

export const parseKangurMobileNativeRuntimeReadinessScope = (
  argv: string[] = process.argv.slice(2),
): KangurMobileNativeRuntimeReadinessScope => {
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
    return 'all';
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

export const shouldUseKangurMobileLocalLaunchEnv = (
  argv: string[] = process.argv.slice(2),
): boolean => argv.includes('--local-launch-env');

const createBackendErrorReport = (
  apiUrl: string | null,
): KangurMobileRuntimeBackendReport => ({
  apiUrl,
  probeUrl: apiUrl ? createKangurMobileRuntimeBackendProbeUrl(apiUrl) : null,
  responseStatus: null,
  status: 'error',
});

const createBackendSkippedReport = (
  apiUrl: string,
): KangurMobileRuntimeBackendReport => ({
  apiUrl,
  probeUrl: createKangurMobileRuntimeBackendProbeUrl(apiUrl),
  responseStatus: null,
  status: 'skipped',
});

const dedupeSteps = (steps: string[]): string[] => [...new Set(steps)];

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

export const detectKangurMobileLanHost = (): string | null => {
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

export const createKangurMobileNativeRuntimeEnvForTarget = (
  baseEnv: NodeJS.ProcessEnv,
  target: KangurMobileRuntimeTarget,
  {
    deviceLanHost = detectKangurMobileLanHost(),
    localLaunchEnv = false,
  }: {
    deviceLanHost?: string | null;
    localLaunchEnv?: boolean;
  } = {},
): NodeJS.ProcessEnv => {
  if (!localLaunchEnv) {
    return baseEnv;
  }

  const env = {
    ...baseEnv,
  };
  const apiUrl = env.EXPO_PUBLIC_KANGUR_API_URL?.trim();

  if (!apiUrl) {
    return env;
  }

  try {
    const hostname = new URL(apiUrl).hostname.toLowerCase();

    if (target === 'android-emulator' && isLoopbackHost(hostname)) {
      const normalizedApiUrl =
        createApiUrlWithHostname(apiUrl, ANDROID_EMULATOR_HOST);
      if (normalizedApiUrl) {
        env.EXPO_PUBLIC_KANGUR_API_URL = normalizedApiUrl;
      }
    }

    if (
      target === 'device' &&
      deviceLanHost &&
      (isLoopbackHost(hostname) || hostname === ANDROID_EMULATOR_HOST)
    ) {
      const normalizedApiUrl =
        createApiUrlWithHostname(apiUrl, deviceLanHost);
      if (normalizedApiUrl) {
        env.EXPO_PUBLIC_KANGUR_API_URL = normalizedApiUrl;
      }
    }
  } catch {
    return env;
  }

  return env;
};

export const resolveKangurMobileNativeRuntimeBackendApiUrl = (
  baseEnv: NodeJS.ProcessEnv,
  target: KangurMobileNativeRuntimeBackendProbeTarget,
  {
    deviceLanHost = detectKangurMobileLanHost(),
    localLaunchEnv = false,
  }: {
    deviceLanHost?: string | null;
    localLaunchEnv?: boolean;
  } = {},
): string | null => {
  const apiUrl = baseEnv.EXPO_PUBLIC_KANGUR_API_URL?.trim();
  if (!apiUrl) {
    return null;
  }

  if (!localLaunchEnv) {
    return apiUrl;
  }

  try {
    const hostname = new URL(apiUrl).hostname.toLowerCase();

    if (target === 'android-emulator') {
      if (hostname === ANDROID_EMULATOR_HOST) {
        return createApiUrlWithHostname(apiUrl, 'localhost') ?? apiUrl;
      }

      if (isLoopbackHost(hostname)) {
        return apiUrl;
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

const createRuntimeNextSteps = (
  target: KangurMobileRuntimeTarget,
  report: KangurMobileRuntimeEnvReport,
  {
    deviceLanHost,
  }: {
    deviceLanHost: string | null;
  },
): string[] => {
  const command = getRuntimeCheckCommand(target);
  const steps: string[] = [];
  const { apiUrl, authMode, hostname } = report.resolved;

  if (authMode !== 'learner-session') {
    steps.push(
      `Set EXPO_PUBLIC_KANGUR_AUTH_MODE=learner-session, then re-run ${command}.`,
    );
  }

  if (!apiUrl) {
    steps.push(
      `Set EXPO_PUBLIC_KANGUR_API_URL for ${target}, then re-run ${command}.`,
    );
    return steps;
  }

  if (target === 'android-emulator' && hostname && ['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    const suggestedApiUrl =
      createApiUrlWithHostname(apiUrl, ANDROID_EMULATOR_HOST) ??
      'http://10.0.2.2:3000';
    steps.push(
      `Set EXPO_PUBLIC_KANGUR_API_URL=${suggestedApiUrl} for Android emulator validation, then re-run ${command}.`,
    );
    return steps;
  }

  if (
    target === 'device' &&
    hostname &&
    ['localhost', '127.0.0.1', '::1', ANDROID_EMULATOR_HOST].includes(hostname)
  ) {
    if (deviceLanHost) {
      const suggestedApiUrl =
        createApiUrlWithHostname(apiUrl, deviceLanHost) ??
        `http://${deviceLanHost}:3000`;
      steps.push(
        `Set EXPO_PUBLIC_KANGUR_API_URL=${suggestedApiUrl} for physical-device validation, then re-run ${command}.`,
      );
    } else {
      steps.push(
        `Set EXPO_PUBLIC_KANGUR_API_URL to a reachable LAN IP or tunnel URL for physical-device validation, then re-run ${command}.`,
      );
    }
    return steps;
  }

  steps.push(`Fix the ${target} runtime env, then re-run ${command}.`);
  return steps;
};

const createScopedHostSection = (
  scope: KangurMobileNativeRuntimeReadinessScope,
  host: KangurMobileNativeHostReport,
): KangurMobileNativeRuntimeReadinessScopedReport['host'] => {
  if (scope === 'ios-simulator') {
    return {
      issues: host.ios.issues,
      status: host.ios.status,
    };
  }

  if (scope === 'android-emulator') {
    return {
      issues: host.android.issues,
      status: host.android.status,
    };
  }

  if (scope === 'device') {
    return {
      issues: [],
      status: 'ok',
    };
  }

  return {
    issues: [...host.ios.issues, ...host.android.issues],
    status: host.status,
  };
};

const createScopedHostNextSteps = (
  scope: KangurMobileNativeRuntimeReadinessScope,
  host: KangurMobileNativeHostReport,
): string[] => {
  if (scope === 'ios-simulator' && host.ios.status === 'error') {
    return [...IOS_HOST_NEXT_STEPS];
  }

  if (scope === 'android-emulator' && host.android.status === 'error') {
    return [...ANDROID_HOST_NEXT_STEPS];
  }

  if (scope === 'all') {
    return [...host.nextSteps];
  }

  return [];
};

export const createKangurMobileNativeRuntimeReadinessScopedReport = (
  report: KangurMobileNativeRuntimeReadinessReport,
  scope: KangurMobileNativeRuntimeReadinessScope,
  {
    deviceLanHost = null,
  }: {
    deviceLanHost?: string | null;
  } = {},
): KangurMobileNativeRuntimeReadinessScopedReport => {
  if (scope === 'all') {
    return {
      backend: report.backend,
      host: createScopedHostSection(scope, report.host),
      nextSteps: report.nextSteps,
      runtime: report.runtime,
      scope,
      status: report.status,
    };
  }

  const runtimeReport = report.runtime[scope];
  const host = createScopedHostSection(scope, report.host);
  const hasRuntimeWarning = runtimeReport.issues.some(
    (issue) => issue.level === 'warning',
  );
  const hasHostWarning = host.issues.some((issue) => issue.level === 'warning');
  const canLaunchTarget =
    host.status !== 'error' && runtimeReport.status !== 'error';
  const nextSteps = dedupeSteps([
    ...createScopedHostNextSteps(scope, report.host),
    ...(runtimeReport.status === 'error'
      ? createRuntimeNextSteps(scope, runtimeReport, {
          deviceLanHost,
        })
      : []),
    ...(report.backend.status === 'error'
      ? [
          `Start the Kangur backend, confirm EXPO_PUBLIC_KANGUR_API_URL, then re-run ${getRuntimeBackendCheckCommand(scope)}.`,
        ]
      : []),
    ...(report.backend.status === 'skipped'
      ? [
          `Re-run ${getRuntimeBackendCheckCommand(scope)} outside the Codex sandbox or in your normal shell before native validation.`,
        ]
      : []),
    ...(canLaunchTarget
      ? [
          `Run ${getRuntimePrepareCommand(scope)} once the backend check is green for this target.`,
          `Run ${getRuntimeLaunchCommand(scope)} to launch Expo for this target.`,
          `After Expo launches, run ${getRuntimeChecklistCommand(scope)} for the learner-session validation flow.`,
        ]
      : []),
  ]);

  let status: KangurMobileNativeRuntimeReadinessScopedReport['status'] = 'ok';
  if (
    host.status === 'error' ||
    runtimeReport.status === 'error' ||
    report.backend.status === 'error'
  ) {
    status = 'error';
  } else if (hasHostWarning || hasRuntimeWarning || report.backend.status === 'skipped') {
    status = 'warning';
  }

  return {
    backend: report.backend,
    host,
    nextSteps,
    runtime: {
      [scope]: runtimeReport,
    },
    scope,
    status,
  };
};

export const createKangurMobileNativeRuntimeReadinessReport = ({
  backend,
  host,
  runtime,
}: {
  backend: KangurMobileRuntimeBackendReport;
  host: KangurMobileNativeHostReport;
  runtime: Record<KangurMobileRuntimeTarget, KangurMobileRuntimeEnvReport>;
},
{
  deviceLanHost = null,
}: {
  deviceLanHost?: string | null;
} = {}): KangurMobileNativeRuntimeReadinessReport => {
  const runtimeReports = Object.values(runtime);
  const hasRuntimeError = runtimeReports.some((report) => report.status === 'error');
  const hasRuntimeWarning = runtimeReports.some((report) =>
    report.issues.some((issue) => issue.level === 'warning'),
  );
  const hasHostWarning =
    host.ios.issues.some((issue) => issue.level === 'warning') ||
    host.android.issues.some((issue) => issue.level === 'warning');
  const nextSteps = [...host.nextSteps];

  for (const target of RUNTIME_TARGETS) {
    if (runtime[target].status === 'error') {
      nextSteps.push(
        ...createRuntimeNextSteps(target, runtime[target], {
          deviceLanHost,
        }),
      );
    }
  }

  if (backend.status === 'error') {
    nextSteps.push(
      `Start the Kangur backend, confirm EXPO_PUBLIC_KANGUR_API_URL, then re-run ${getRuntimeBackendCheckCommand('all')}.`,
    );
  }

  if (backend.status === 'skipped') {
    nextSteps.push(
      `Re-run ${getRuntimeBackendCheckCommand('all')} outside the Codex sandbox or in your normal shell before native validation.`,
    );
  }

  let status: KangurMobileNativeRuntimeReadinessReport['status'] = 'ok';
  if (host.status === 'error' || hasRuntimeError || backend.status === 'error') {
    status = 'error';
  } else if (hasHostWarning || hasRuntimeWarning || backend.status === 'skipped') {
    status = 'warning';
  }

  return {
    backend,
    host,
    nextSteps: dedupeSteps(nextSteps),
    runtime,
    status,
  };
};

export const collectKangurMobileNativeRuntimeReadinessReport =
  async ({
    backendTarget = 'ios-simulator',
    localLaunchEnv = false,
  }: {
    backendTarget?: KangurMobileNativeRuntimeBackendProbeTarget;
    localLaunchEnv?: boolean;
  } = {}): Promise<KangurMobileNativeRuntimeReadinessReport> => {
    const deviceLanHost = detectKangurMobileLanHost();
    const runtime = {
      'android-emulator': analyzeKangurMobileRuntimeEnv(
        createKangurMobileNativeRuntimeEnvForTarget(
          process.env,
          'android-emulator',
          {
            deviceLanHost,
            localLaunchEnv,
          },
        ),
        'android-emulator',
      ),
      device: analyzeKangurMobileRuntimeEnv(
        createKangurMobileNativeRuntimeEnvForTarget(process.env, 'device', {
          deviceLanHost,
          localLaunchEnv,
        }),
        'device',
      ),
      'ios-simulator': analyzeKangurMobileRuntimeEnv(
        createKangurMobileNativeRuntimeEnvForTarget(
          process.env,
          'ios-simulator',
          {
            deviceLanHost,
            localLaunchEnv,
          },
        ),
        'ios-simulator',
      ),
    } satisfies Record<KangurMobileRuntimeTarget, KangurMobileRuntimeEnvReport>;

    const host = createKangurMobileNativeHostReport({
      androidState: collectKangurMobileAndroidToolchainState(),
      iosState: collectKangurMobileIosToolchainState(),
    });

    const apiUrl = resolveKangurMobileNativeRuntimeBackendApiUrl(
      process.env,
      backendTarget,
      {
        deviceLanHost,
        localLaunchEnv,
      },
    );
    let backend: KangurMobileRuntimeBackendReport;

    if (!apiUrl) {
      backend = createBackendErrorReport(null);
    } else if (shouldSkipKangurMobileRuntimeBackendProbe()) {
      backend = createBackendSkippedReport(apiUrl);
    } else {
      try {
        backend = await probeKangurMobileRuntimeBackend(apiUrl);
      } catch {
        backend = createBackendErrorReport(apiUrl);
      }
    }

    return createKangurMobileNativeRuntimeReadinessReport({
      backend,
      host,
      runtime,
    }, {
      deviceLanHost,
    });
  };

export const runKangurMobileNativeRuntimeReadinessCheck =
  async (): Promise<void> => {
    const argv = process.argv.slice(2);
    const scope = parseKangurMobileNativeRuntimeReadinessScope(
      argv,
    );
    const localLaunchEnv = shouldUseKangurMobileLocalLaunchEnv(argv);
    const fullReport = await collectKangurMobileNativeRuntimeReadinessReport({
      backendTarget: scope === 'all' ? 'ios-simulator' : scope,
      localLaunchEnv,
    });
    const report = createKangurMobileNativeRuntimeReadinessScopedReport(
      fullReport,
      scope,
      {
        deviceLanHost: detectKangurMobileLanHost(),
      },
    );

    console.log(
      `[kangur-mobile-native-runtime] scope=${report.scope} localLaunchEnv=${localLaunchEnv ? 'on' : 'off'} status=${report.status}`,
    );
    if (report.scope === 'all') {
      console.log(
        `[kangur-mobile-native-runtime] host=${report.host.status} backend=${report.backend.status} ios=${fullReport.runtime['ios-simulator'].status} android=${fullReport.runtime['android-emulator'].status} device=${fullReport.runtime.device.status}`,
      );
    } else {
      const scopedTarget = report.scope;
      const runtimeReport = fullReport.runtime[scopedTarget];
      console.log(
        `[kangur-mobile-native-runtime] host=${report.host.status} backend=${report.backend.status} runtime=${runtimeReport.status}`,
      );
    }

    for (const target of Object.keys(report.runtime) as KangurMobileRuntimeTarget[]) {
      const runtimeReport = report.runtime[target];
      console.log(
        `[kangur-mobile-native-runtime] ${target} authMode=${runtimeReport.resolved.authMode} apiUrl=${runtimeReport.resolved.apiUrl ?? 'unset'}`,
      );
      if (runtimeReport.issues.length === 0) {
        console.log(
          `[kangur-mobile-native-runtime] ${target} no runtime issues detected.`,
        );
        continue;
      }

      for (const issue of runtimeReport.issues) {
        const prefix = issue.level === 'error' ? 'ERROR' : 'WARN';
        console.log(
          `[kangur-mobile-native-runtime] ${target} ${prefix} ${issue.message}`,
        );
      }
    }

    if (report.scope !== 'all') {
      const scopedRuntimeReport = report.runtime[report.scope];
      if (
        scopedRuntimeReport?.resolved.apiUrl &&
        report.backend.apiUrl &&
        scopedRuntimeReport.resolved.apiUrl !== report.backend.apiUrl
      ) {
        console.log(
          `[kangur-mobile-native-runtime] backend uses host-side apiUrl=${report.backend.apiUrl} while the ${report.scope} runtime uses apiUrl=${scopedRuntimeReport.resolved.apiUrl}.`,
        );
      }
    }

    if (report.backend.status === 'ok') {
      console.log(
        `[kangur-mobile-native-runtime] backend ok probe=${report.backend.probeUrl} responseStatus=${report.backend.responseStatus}`,
      );
    } else if (report.backend.status === 'skipped') {
      console.log(
        `[kangur-mobile-native-runtime] backend skipped probe=${report.backend.probeUrl} reason=codex-sandbox-network-disabled`,
      );
    } else {
      console.log(
        `[kangur-mobile-native-runtime] backend ERROR apiUrl=${report.backend.apiUrl ?? 'unset'} probe=${report.backend.probeUrl ?? 'unset'}`,
      );
    }

    if (report.nextSteps.length > 0) {
      console.log('[kangur-mobile-native-runtime] Suggested next steps:');
      for (const step of report.nextSteps) {
        console.log(`[kangur-mobile-native-runtime] NEXT ${step}`);
      }
    }

    if (report.status === 'error') {
      process.exit(1);
    }
  };

if (process.argv[1]?.includes('check-kangur-mobile-native-runtime-readiness.ts')) {
  runKangurMobileNativeRuntimeReadinessCheck().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
