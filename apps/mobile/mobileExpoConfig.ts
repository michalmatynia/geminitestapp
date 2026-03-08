import type { ExpoConfig } from 'expo/config';

export type KangurMobileBuildProfile = 'local' | 'preview' | 'production';

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
  if (!value) {
    return null;
  }

  if (!pattern.test(value)) {
    throw new Error(`Invalid ${name}: "${value}".`);
  }

  return value;
};

export const createKangurExpoConfig = (
  env: NodeJS.ProcessEnv,
  baseConfig: Partial<ExpoConfig> = {},
): ExpoConfig => {
  const name = env.KANGUR_EXPO_NAME?.trim() || DEFAULT_KANGUR_EXPO_NAME;
  const slug = env.KANGUR_EXPO_SLUG?.trim() || DEFAULT_KANGUR_EXPO_SLUG;
  const scheme = env.KANGUR_EXPO_SCHEME?.trim() || DEFAULT_KANGUR_EXPO_SCHEME;
  const version = env.KANGUR_EXPO_VERSION?.trim() || DEFAULT_KANGUR_EXPO_VERSION;
  const iosBundleIdentifier =
    resolveValidatedEnvValue(
      env.KANGUR_IOS_BUNDLE_IDENTIFIER?.trim() ||
        DEFAULT_KANGUR_IOS_BUNDLE_IDENTIFIER,
      IOS_BUNDLE_IDENTIFIER_PATTERN,
      'KANGUR_IOS_BUNDLE_IDENTIFIER',
    ) ?? DEFAULT_KANGUR_IOS_BUNDLE_IDENTIFIER;
  const androidPackage =
    resolveValidatedEnvValue(
      env.KANGUR_ANDROID_PACKAGE?.trim() || DEFAULT_KANGUR_ANDROID_PACKAGE,
      ANDROID_PACKAGE_PATTERN,
      'KANGUR_ANDROID_PACKAGE',
    ) ?? DEFAULT_KANGUR_ANDROID_PACKAGE;
  const owner = env.KANGUR_EXPO_OWNER?.trim() || null;
  const projectId = resolveValidatedEnvValue(
    env.KANGUR_EXPO_PROJECT_ID?.trim() || null,
    UUID_PATTERN,
    'KANGUR_EXPO_PROJECT_ID',
  );
  const apiUrl = env.EXPO_PUBLIC_KANGUR_API_URL?.trim() || null;
  const authMode =
    env.EXPO_PUBLIC_KANGUR_AUTH_MODE?.trim().toLowerCase() ===
    'learner-session'
      ? 'learner-session'
      : DEFAULT_KANGUR_MOBILE_AUTH_MODE;
  const devAutoSignIn =
    env.KANGUR_DEV_AUTO_SIGN_IN?.trim().toLowerCase() === 'true' ||
    env.KANGUR_DEV_AUTO_SIGN_IN?.trim() === '1';
  const devLearnerLogin = env.KANGUR_DEV_LEARNER_LOGIN?.trim() || null;
  const devLearnerPassword =
    env.KANGUR_DEV_LEARNER_PASSWORD?.trim() || null;

  return {
    ...baseConfig,
    name,
    slug,
    scheme,
    version,
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    platforms: ['ios', 'android', 'web'],
    plugins: ['expo-router'],
    runtimeVersion: {
      policy: 'appVersion',
    },
    web: {
      bundler: 'metro',
      output: 'static',
    },
    ios: {
      bundleIdentifier: iosBundleIdentifier,
      supportsTablet: true,
    },
    android: {
      package: androidPackage,
    },
    experiments: {
      typedRoutes: true,
    },
    extra: {
      ...(baseConfig.extra ?? {}),
      kangurAuthMode: authMode,
      ...(devAutoSignIn
        ? {
            kangurDevAutoSignIn: true,
          }
        : {}),
      ...(devLearnerLogin
        ? {
            kangurDevLearnerLogin: devLearnerLogin,
          }
        : {}),
      ...(devLearnerPassword
        ? {
            kangurDevLearnerPassword: devLearnerPassword,
          }
        : {}),
      ...(apiUrl
        ? {
            kangurApiUrl: apiUrl,
          }
        : {}),
      ...(projectId
        ? {
            eas: {
              projectId,
            },
          }
        : {}),
    },
    owner: owner ?? undefined,
  };
};

export const analyzeKangurMobileBuildEnv = (
  env: NodeJS.ProcessEnv,
  profile: KangurMobileBuildProfile = 'local',
): KangurMobileBuildEnvReport => {
  const config = createKangurExpoConfig(env);
  const issues: KangurMobileBuildEnvIssue[] = [];
  const iosBundleIdentifier = config.ios?.bundleIdentifier ?? null;
  const androidPackage = config.android?.package ?? null;
  const owner = config.owner ?? null;
  const projectId =
    config.extra &&
    typeof config.extra === 'object' &&
    'eas' in config.extra &&
    config.extra.eas &&
    typeof config.extra.eas === 'object' &&
    'projectId' in config.extra.eas &&
    typeof config.extra.eas.projectId === 'string'
      ? config.extra.eas.projectId
      : null;
  const apiUrl =
    config.extra &&
    typeof config.extra === 'object' &&
    'kangurApiUrl' in config.extra &&
    typeof config.extra.kangurApiUrl === 'string'
      ? config.extra.kangurApiUrl
      : null;

  const addIssue = (
    level: KangurMobileBuildEnvIssue['level'],
    message: string,
  ): void => {
    issues.push({ level, message });
  };

  if (
    profile !== 'local' &&
    iosBundleIdentifier === DEFAULT_KANGUR_IOS_BUNDLE_IDENTIFIER
  ) {
    addIssue(
      'error',
      `KANGUR_IOS_BUNDLE_IDENTIFIER still uses the placeholder default (${DEFAULT_KANGUR_IOS_BUNDLE_IDENTIFIER}).`,
    );
  }

  if (
    profile !== 'local' &&
    androidPackage === DEFAULT_KANGUR_ANDROID_PACKAGE
  ) {
    addIssue(
      'error',
      `KANGUR_ANDROID_PACKAGE still uses the placeholder default (${DEFAULT_KANGUR_ANDROID_PACKAGE}).`,
    );
  }

  if (profile !== 'local' && !owner) {
    addIssue('error', 'KANGUR_EXPO_OWNER is required for preview and production builds.');
  }

  if (profile !== 'local' && !projectId) {
    addIssue(
      'error',
      'KANGUR_EXPO_PROJECT_ID is required for preview and production builds.',
    );
  }

  if (!apiUrl) {
    addIssue(
      'warning',
      'EXPO_PUBLIC_KANGUR_API_URL is unset; mobile builds will rely on runtime API URL fallback.',
    );
  }

  return {
    issues,
    profile,
    resolved: {
      androidPackage: androidPackage ?? DEFAULT_KANGUR_ANDROID_PACKAGE,
      apiUrl,
      iosBundleIdentifier:
        iosBundleIdentifier ?? DEFAULT_KANGUR_IOS_BUNDLE_IDENTIFIER,
      owner,
      projectId,
    },
    status: issues.some((issue) => issue.level === 'error') ? 'error' : 'ok',
  };
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
