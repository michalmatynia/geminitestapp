export type KangurMobileBuildProfile = 'local' | 'preview' | 'production';

export type KangurExpoConfig = Record<string, unknown> & {
  android?: {
    package?: string;
  };
  extra?: Record<string, unknown>;
  ios?: {
    bundleIdentifier?: string;
    supportsTablet?: boolean;
  };
  name: string;
  owner?: string;
  slug: string;
};

export type KangurMobileBuildEnvIssue = {
  level: 'error' | 'warning';
  message: string;
};

export type KangurMobileBuildEnvReport = {
  issues: KangurMobileBuildEnvIssue[];
  profile: KangurMobileBuildProfile;
  resolved: {
    androidPackage: string;
    apiUrl: string | null;
    iosBundleIdentifier: string;
    owner: string | null;
    projectId: string | null;
  };
  status: 'ok' | 'error';
};

const IOS_BUNDLE_IDENTIFIER_PATTERN = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const ANDROID_PACKAGE_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DEFAULT_KANGUR_EXPO_NAME = 'Kangur Mobile';
export const DEFAULT_KANGUR_EXPO_SLUG = 'kangur-mobile';
export const DEFAULT_KANGUR_EXPO_SCHEME = 'kangur';
export const DEFAULT_KANGUR_EXPO_VERSION = '0.1.0';
export const DEFAULT_KANGUR_IOS_BUNDLE_IDENTIFIER = 'com.kangur.mobile';
export const DEFAULT_KANGUR_ANDROID_PACKAGE = 'com.kangur.mobile';
export const DEFAULT_KANGUR_MOBILE_AUTH_MODE = 'development';

export const resolveValidatedEnvValue = (
  value: string | null,
  pattern: RegExp,
  name: string,
): string | null => {
  if (value === null) {
    return null;
  }

  if (!pattern.test(value)) {
    throw new Error(`Invalid ${name}: "${value}".`);
  }

  return value;
};

const getTrimmedEnvValue = (
  env: NodeJS.ProcessEnv,
  key: string,
): string | null => {
  const value = env[key]?.trim();
  return value === undefined || value === '' ? null : value;
};

const resolveAuthMode = (env: NodeJS.ProcessEnv): string => {
  const value = getTrimmedEnvValue(env, 'EXPO_PUBLIC_KANGUR_AUTH_MODE');
  return value?.toLowerCase() === 'learner-session'
    ? 'learner-session'
    : DEFAULT_KANGUR_MOBILE_AUTH_MODE;
};

const resolveDevSettings = (env: NodeJS.ProcessEnv): Record<string, unknown> => {
  const devAutoSignInFlag = getTrimmedEnvValue(env, 'KANGUR_DEV_AUTO_SIGN_IN');
  const devAutoSignIn =
    devAutoSignInFlag?.toLowerCase() === 'true' || devAutoSignInFlag === '1';
  const devLearnerLogin = getTrimmedEnvValue(env, 'KANGUR_DEV_LEARNER_LOGIN');
  const devLearnerPassword = getTrimmedEnvValue(
    env,
    'KANGUR_DEV_LEARNER_PASSWORD',
  );

  return {
    ...(devAutoSignIn ? { kangurDevAutoSignIn: true } : {}),
    ...(devLearnerLogin !== null ? { kangurDevLearnerLogin: devLearnerLogin } : {}),
    ...(devLearnerPassword !== null ? { kangurDevLearnerPassword: devLearnerPassword } : {}),
  };
};

const resolveIdentifiers = (env: NodeJS.ProcessEnv): { ios: string; android: string } => {
  const ios = resolveValidatedEnvValue(
    getTrimmedEnvValue(env, 'KANGUR_IOS_BUNDLE_IDENTIFIER') ??
      DEFAULT_KANGUR_IOS_BUNDLE_IDENTIFIER,
    IOS_BUNDLE_IDENTIFIER_PATTERN,
    'KANGUR_IOS_BUNDLE_IDENTIFIER',
  ) ?? DEFAULT_KANGUR_IOS_BUNDLE_IDENTIFIER;

  const android = resolveValidatedEnvValue(
    getTrimmedEnvValue(env, 'KANGUR_ANDROID_PACKAGE') ??
      DEFAULT_KANGUR_ANDROID_PACKAGE,
    ANDROID_PACKAGE_PATTERN,
    'KANGUR_ANDROID_PACKAGE',
  ) ?? DEFAULT_KANGUR_ANDROID_PACKAGE;

  return { ios, android };
};

const resolveProjectBase = (env: NodeJS.ProcessEnv): { name: string; slug: string; scheme: string; version: string } => ({
  name: getTrimmedEnvValue(env, 'KANGUR_EXPO_NAME') ?? DEFAULT_KANGUR_EXPO_NAME,
  slug: getTrimmedEnvValue(env, 'KANGUR_EXPO_SLUG') ?? DEFAULT_KANGUR_EXPO_SLUG,
  scheme: getTrimmedEnvValue(env, 'KANGUR_EXPO_SCHEME') ?? DEFAULT_KANGUR_EXPO_SCHEME,
  version: getTrimmedEnvValue(env, 'KANGUR_EXPO_VERSION') ?? DEFAULT_KANGUR_EXPO_VERSION,
});

export const createKangurExpoConfig = (
  env: NodeJS.ProcessEnv,
  baseConfig: Partial<KangurExpoConfig> = {},
): KangurExpoConfig => {
  const base = resolveProjectBase(env);
  const ids = resolveIdentifiers(env);
  const projectId = resolveValidatedEnvValue(getTrimmedEnvValue(env, 'KANGUR_EXPO_PROJECT_ID'), UUID_PATTERN, 'KANGUR_EXPO_PROJECT_ID');
  const apiUrl = getTrimmedEnvValue(env, 'EXPO_PUBLIC_KANGUR_API_URL');

  return {
    ...baseConfig,
    ...base,
    backgroundColor: '#fffaf2',
    orientation: 'portrait',
    splash: { backgroundColor: '#fffaf2', resizeMode: 'contain' },
    userInterfaceStyle: 'light',
    platforms: ['ios', 'android', 'web'],
    plugins: ['expo-router'],
    runtimeVersion: { policy: 'appVersion' },
    web: { bundler: 'metro', output: 'static' },
    ios: { bundleIdentifier: ids.ios, supportsTablet: true },
    android: { package: ids.android },
    experiments: { typedRoutes: true },
    extra: {
      ...(baseConfig.extra ?? {}),
      kangurAuthMode: resolveAuthMode(env),
      ...resolveDevSettings(env),
      ...(apiUrl !== null ? { kangurApiUrl: apiUrl } : {}),
      ...(projectId !== null ? { eas: { projectId } } : {}),
    },
    owner: getTrimmedEnvValue(env, 'KANGUR_EXPO_OWNER') ?? undefined,
  };
};

const validateBuildIdentifiers = (config: KangurExpoConfig, issues: KangurMobileBuildEnvIssue[]): void => {
  if (config.ios?.bundleIdentifier === DEFAULT_KANGUR_IOS_BUNDLE_IDENTIFIER) {
    issues.push({ level: 'error', message: `KANGUR_IOS_BUNDLE_IDENTIFIER still uses the placeholder default (${DEFAULT_KANGUR_IOS_BUNDLE_IDENTIFIER}).` });
  }
  if (config.android?.package === DEFAULT_KANGUR_ANDROID_PACKAGE) {
    issues.push({ level: 'error', message: `KANGUR_ANDROID_PACKAGE still uses the placeholder default (${DEFAULT_KANGUR_ANDROID_PACKAGE}).` });
  }
};

const resolveEasProjectId = (config: KangurExpoConfig): string | null => {
  const extra = config.extra;
  const eas = extra?.['eas'] as Record<string, unknown> | undefined;
  return typeof eas?.['projectId'] === 'string' ? eas['projectId'] : null;
};

type ValidationParams = {
  config: KangurExpoConfig;
  profile: KangurMobileBuildProfile;
  owner: string | null;
  projectId: string | null;
  issues: KangurMobileBuildEnvIssue[];
};

const validateNonLocalProfile = ({
  config,
  profile,
  owner,
  projectId,
  issues,
}: ValidationParams): void => {
  if (profile === 'local') {
    return;
  }

  validateBuildIdentifiers(config, issues);
  if (owner === null) {
    issues.push({ level: 'error', message: 'KANGUR_EXPO_OWNER is required for preview and production builds.' });
  }
  if (projectId === null) {
    issues.push({ level: 'error', message: 'KANGUR_EXPO_PROJECT_ID is required for preview and production builds.' });
  }
};

type ReportParams = {
  config: KangurExpoConfig;
  profile: KangurMobileBuildProfile;
  apiUrl: string | null;
  owner: string | null;
  projectId: string | null;
  issues: KangurMobileBuildEnvIssue[];
};

const resolveBuildEnvReport = ({
  config,
  profile,
  apiUrl,
  owner,
  projectId,
  issues,
}: ReportParams): KangurMobileBuildEnvReport => {
  const resolved = {
    androidPackage: config.android?.package ?? DEFAULT_KANGUR_ANDROID_PACKAGE,
    apiUrl,
    iosBundleIdentifier: config.ios?.bundleIdentifier ?? DEFAULT_KANGUR_IOS_BUNDLE_IDENTIFIER,
    owner,
    projectId,
  };

  return {
    issues,
    profile,
    resolved,
    status: issues.some((issue) => issue.level === 'error') ? 'error' : 'ok',
  };
};

export const analyzeKangurMobileBuildEnv = (
  env: NodeJS.ProcessEnv,
  profile: KangurMobileBuildProfile = 'local',
): KangurMobileBuildEnvReport => {
  const config = createKangurExpoConfig(env);
  const issues: KangurMobileBuildEnvIssue[] = [];
  const projectId = resolveEasProjectId(config);
  const owner = config.owner ?? null;

  validateNonLocalProfile({ config, profile, owner, projectId, issues });

  const apiUrl = (config.extra?.['kangurApiUrl'] as string | undefined) ?? null;
  if (apiUrl === null) {
    issues.push({
      level: 'warning',
      message: 'EXPO_PUBLIC_KANGUR_API_URL is unset; mobile builds will rely on runtime API URL fallback.',
    });
  }

  return resolveBuildEnvReport({
    config,
    profile,
    apiUrl,
    owner,
    projectId,
    issues,
  });
};

const kangurMobileExpoConfig = {
  DEFAULT_KANGUR_ANDROID_PACKAGE,
  DEFAULT_KANGUR_MOBILE_AUTH_MODE,
  DEFAULT_KANGUR_EXPO_NAME,
  DEFAULT_KANGUR_EXPO_SCHEME,
  DEFAULT_KANGUR_EXPO_SLUG,
  DEFAULT_KANGUR_EXPO_VERSION,
  DEFAULT_KANGUR_IOS_BUNDLE_IDENTIFIER,
  analyzeKangurMobileBuildEnv,
  createKangurExpoConfig,
  resolveValidatedEnvValue,
};

export default kangurMobileExpoConfig;
