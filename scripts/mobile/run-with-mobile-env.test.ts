import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '../..');
const RUNNER_PATH = resolve(REPO_ROOT, 'scripts/mobile/run-with-mobile-env.ts');

const TEMP_DIRS: string[] = [];

const createTempDir = (): string => {
  const tempDir = mkdtempSync(join(tmpdir(), 'kangur-mobile-runner-'));
  TEMP_DIRS.push(tempDir);
  return tempDir;
};

afterEach(() => {
  for (const tempDir of TEMP_DIRS.splice(0, TEMP_DIRS.length)) {
    rmSync(tempDir, {
      force: true,
      recursive: true,
    });
  }
});

describe('run-with-mobile-env cli', () => {
  it('fails with a clear error when no command is provided', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', RUNNER_PATH], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[kangur-mobile-env] Missing command.');
  });

  it('loads env values before executing the child command', () => {
    const tempDir = createTempDir();
    const envFile = join(tempDir, '.env.local');
    const expectedApiUrl = 'http://kangur-test.local:3999';
    writeFileSync(envFile, `EXPO_PUBLIC_KANGUR_API_URL=${expectedApiUrl}\n`);
    const env = {
      ...process.env,
      KANGUR_MOBILE_ENV_FILE: envFile,
    };
    delete env.EXPO_PUBLIC_KANGUR_API_URL;

    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        RUNNER_PATH,
        process.execPath,
        '-e',
        'console.log(process.env.EXPO_PUBLIC_KANGUR_API_URL ?? "unset")',
      ],
      {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        env,
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(expectedApiUrl);
  });

  it('applies the default Android SDK root and PATH before executing the child command', () => {
    const tempDir = createTempDir();
    const sdkRoot = join(tempDir, 'Library/Android/sdk');
    const cmdlineBin = join(sdkRoot, 'cmdline-tools/latest/bin');
    const emulatorDir = join(sdkRoot, 'emulator');
    const platformToolsDir = join(sdkRoot, 'platform-tools');

    for (const directory of [cmdlineBin, emulatorDir, platformToolsDir]) {
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, '.keep'), '', { flag: 'w' });
    }

    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        RUNNER_PATH,
        process.execPath,
        '-e',
        'console.log(JSON.stringify({ sdkRoot: process.env.ANDROID_SDK_ROOT, androidHome: process.env.ANDROID_HOME, path: process.env.PATH?.split(\":\").slice(0,3) }))',
      ],
      {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          ANDROID_HOME: '',
          ANDROID_SDK_ROOT: '',
          HOME: tempDir,
          PATH: '/usr/bin:/bin',
        },
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`"sdkRoot":"${sdkRoot}"`);
    expect(result.stdout).toContain(`"androidHome":"${sdkRoot}"`);
    expect(result.stdout).toContain(`"${cmdlineBin}"`);
    expect(result.stdout).toContain(`"${emulatorDir}"`);
    expect(result.stdout).toContain(`"${platformToolsDir}"`);
  });
});
