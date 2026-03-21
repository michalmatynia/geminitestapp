import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter } from 'node:path';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../..');
export const DEFAULT_MOBILE_ENV_FILE_PATHS = [
  resolve(SCRIPT_DIR, '../../apps/mobile/.env.local'),
  resolve(SCRIPT_DIR, '../../apps/mobile/.env'),
];
export const DEFAULT_MACOS_ANDROID_SDK_ROOT = resolve(
  homedir(),
  'Library/Android/sdk',
);

type KangurMobileAndroidSdkEnvironment = {
  androidHome: string | null;
  androidSdkRoot: string | null;
};

type KangurMobileAndroidSdkEnvironmentOptions = {
  defaultAndroidSdkRoot?: string | null;
  pathExists?: (path: string) => boolean;
};

export const resolveMobileEnvFilePaths = (): string[] => {
  const overridePath = process.env['KANGUR_MOBILE_ENV_FILE']?.trim();
  if (overridePath) {
    if (isAbsolute(overridePath)) {
      return [overridePath];
    }

    return Array.from(
      new Set([
        resolve(process.cwd(), overridePath),
        resolve(REPO_ROOT, overridePath),
      ]),
    );
  }

  return DEFAULT_MOBILE_ENV_FILE_PATHS;
};

export const loadMobileEnvFiles = (
  filePaths: string[] = resolveMobileEnvFilePaths(),
): void => {
  for (const path of filePaths) {
    if (!existsSync(path)) {
      continue;
    }

    const result = loadDotenv({
      override: false,
      path,
      quiet: true,
    });

    if (result.error) {
      throw result.error;
    }
  }
};

export const resolveAndroidSdkEnvironment = (
  env: NodeJS.ProcessEnv = process.env,
  options: KangurMobileAndroidSdkEnvironmentOptions = {},
): KangurMobileAndroidSdkEnvironment => {
  const pathExists = options.pathExists ?? existsSync;
  const defaultAndroidSdkRoot =
    options.defaultAndroidSdkRoot ?? DEFAULT_MACOS_ANDROID_SDK_ROOT;

  let androidSdkRoot = env['ANDROID_SDK_ROOT']?.trim() || null;
  let androidHome = env['ANDROID_HOME']?.trim() || null;

  if (!androidSdkRoot && !androidHome && defaultAndroidSdkRoot && pathExists(defaultAndroidSdkRoot)) {
    androidSdkRoot = defaultAndroidSdkRoot;
    androidHome = defaultAndroidSdkRoot;
  } else {
    if (!androidSdkRoot && androidHome) {
      androidSdkRoot = androidHome;
    }

    if (!androidHome && androidSdkRoot) {
      androidHome = androidSdkRoot;
    }
  }

  return {
    androidHome,
    androidSdkRoot,
  };
};

const prependPathEntry = (env: NodeJS.ProcessEnv, entry: string): void => {
  const currentEntries = (env['PATH'] ?? '').split(delimiter).filter(Boolean);
  if (currentEntries.includes(entry)) {
    return;
  }

  env['PATH'] = [entry, ...currentEntries].join(delimiter);
};

export const applyDefaultAndroidSdkEnv = (
  env: NodeJS.ProcessEnv = process.env,
  options: KangurMobileAndroidSdkEnvironmentOptions = {},
): void => {
  const pathExists = options.pathExists ?? existsSync;
  const { androidHome, androidSdkRoot } = resolveAndroidSdkEnvironment(env, options);

  if (androidSdkRoot && !env['ANDROID_SDK_ROOT']) {
    env['ANDROID_SDK_ROOT'] = androidSdkRoot;
  }

  if (androidHome && !env['ANDROID_HOME']) {
    env['ANDROID_HOME'] = androidHome;
  }

  if (!androidSdkRoot) {
    return;
  }

  for (const entry of [
    join(androidSdkRoot, 'platform-tools'),
    join(androidSdkRoot, 'emulator'),
    join(androidSdkRoot, 'cmdline-tools/latest/bin'),
  ]) {
    if (pathExists(entry)) {
      prependPathEntry(env, entry);
    }
  }
};
