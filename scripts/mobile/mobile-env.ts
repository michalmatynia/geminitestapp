import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../..');
export const DEFAULT_MOBILE_ENV_FILE_PATHS = [
  resolve(SCRIPT_DIR, '../../apps/mobile/.env.local'),
  resolve(SCRIPT_DIR, '../../apps/mobile/.env'),
];

export const resolveMobileEnvFilePaths = (): string[] => {
  const overridePath = process.env.KANGUR_MOBILE_ENV_FILE?.trim();
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
