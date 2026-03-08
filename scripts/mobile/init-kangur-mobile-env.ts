import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_KANGUR_MOBILE_ENV_SOURCE_PATH = resolve(
  SCRIPT_DIR,
  '../../apps/mobile/.env.example',
);
export const DEFAULT_KANGUR_MOBILE_ENV_TARGET_PATH = resolve(
  SCRIPT_DIR,
  '../../apps/mobile/.env.local',
);

export const parseInitKangurMobileEnvArgs = (
  argv: string[],
  cwd = process.cwd(),
): {
  force: boolean;
  targetPath: string;
} => {
  let force = false;
  let targetPath = DEFAULT_KANGUR_MOBILE_ENV_TARGET_PATH;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--force') {
      force = true;
      continue;
    }

    if (argument === '--target') {
      const value = argv[index + 1]?.trim();
      if (!value) {
        throw new Error('Missing value for --target.');
      }

      targetPath = resolve(cwd, value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument "${argument}". Expected --force or --target <path>.`);
  }

  return {
    force,
    targetPath,
  };
};

export const initKangurMobileEnv = ({
  force,
  sourcePath = DEFAULT_KANGUR_MOBILE_ENV_SOURCE_PATH,
  targetPath,
}: {
  force: boolean;
  sourcePath?: string;
  targetPath: string;
}): {
  status: 'created' | 'skipped';
} => {
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing env template: ${sourcePath}`);
  }

  if (existsSync(targetPath) && !force) {
    return {
      status: 'skipped',
    };
  }

  mkdirSync(dirname(targetPath), {
    recursive: true,
  });
  copyFileSync(sourcePath, targetPath);

  return {
    status: 'created',
  };
};

const run = (): void => {
  const { force, targetPath } = parseInitKangurMobileEnvArgs(process.argv.slice(2));
  const result = initKangurMobileEnv({
    force,
    targetPath,
  });

  if (result.status === 'skipped') {
    console.log(`[kangur-mobile-env] Target already exists: ${targetPath}`);
    console.log('[kangur-mobile-env] Leaving the file unchanged.');
    return;
  }

  console.log(
    `[kangur-mobile-env] Wrote ${targetPath} from ${DEFAULT_KANGUR_MOBILE_ENV_SOURCE_PATH}`,
  );
  console.log('[kangur-mobile-env] Replace placeholder Expo/EAS values before preview or production builds.');
};

const shouldRunAsScript =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (shouldRunAsScript) {
  run();
}
