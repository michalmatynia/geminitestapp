import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import {
  applyDefaultAndroidSdkEnv,
  DEFAULT_MOBILE_ENV_FILE_PATHS,
  loadMobileEnvFiles,
  resolveAndroidSdkEnvironment,
  resolveMobileEnvFilePaths,
} from './mobile-env';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_CWD = process.cwd();
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.chdir(ORIGINAL_CWD);
});

describe('mobile env helpers', () => {
  it('uses the override env file path when KANGUR_MOBILE_ENV_FILE is set', () => {
    process.env.KANGUR_MOBILE_ENV_FILE = '/tmp/custom-kangur-mobile.env';

    expect(resolveMobileEnvFilePaths()).toEqual(['/tmp/custom-kangur-mobile.env']);
  });

  it('resolves a relative override env file path from both cwd and repo root', () => {
    process.env.KANGUR_MOBILE_ENV_FILE = 'apps/mobile/.env.example';

    expect(resolveMobileEnvFilePaths()).toEqual(
      Array.from(
        new Set([
          resolve(ORIGINAL_CWD, 'apps/mobile/.env.example'),
          resolve(SCRIPT_DIR, '../../apps/mobile/.env.example'),
        ]),
      ),
    );
  });

  it('falls back to the default mobile env file paths', () => {
    delete process.env.KANGUR_MOBILE_ENV_FILE;

    expect(resolveMobileEnvFilePaths()).toEqual(DEFAULT_MOBILE_ENV_FILE_PATHS);
  });

  it('loads env values from provided files without overriding existing vars', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'kangur-mobile-env-'));
    const envFile = join(tempDir, '.env.local');
    writeFileSync(
      envFile,
      [
        'KANGUR_EXPO_OWNER=file-owner',
        'KANGUR_EXPO_PROJECT_ID=123e4567-e89b-42d3-a456-426614174000',
      ].join('\n'),
    );

    process.env.KANGUR_EXPO_OWNER = 'existing-owner';
    delete process.env.KANGUR_EXPO_PROJECT_ID;

    loadMobileEnvFiles([envFile]);

    expect(process.env.KANGUR_EXPO_OWNER).toBe('existing-owner');
    expect(process.env.KANGUR_EXPO_PROJECT_ID).toBe(
      '123e4567-e89b-42d3-a456-426614174000',
    );

    rmSync(tempDir, {
      force: true,
      recursive: true,
    });
  });

  it('resolves the default Android SDK root when env vars are unset', () => {
    const resolved = resolveAndroidSdkEnvironment(
      {},
      {
        defaultAndroidSdkRoot: '/tmp/android-sdk',
        pathExists: (path) => path === '/tmp/android-sdk',
      },
    );

    expect(resolved).toEqual({
      androidHome: '/tmp/android-sdk',
      androidSdkRoot: '/tmp/android-sdk',
    });
  });

  it('applies Android SDK defaults and prepends SDK tool paths', () => {
    const env: NodeJS.ProcessEnv = {
      PATH: '/usr/bin:/bin',
    };

    applyDefaultAndroidSdkEnv(env, {
      defaultAndroidSdkRoot: '/tmp/android-sdk',
      pathExists: (path) =>
        [
          '/tmp/android-sdk',
          '/tmp/android-sdk/platform-tools',
          '/tmp/android-sdk/emulator',
          '/tmp/android-sdk/cmdline-tools/latest/bin',
        ].includes(path),
    });

    expect(env['ANDROID_SDK_ROOT']).toBe('/tmp/android-sdk');
    expect(env['ANDROID_HOME']).toBe('/tmp/android-sdk');
    expect(env['PATH']?.split(':').slice(0, 3)).toEqual([
      '/tmp/android-sdk/cmdline-tools/latest/bin',
      '/tmp/android-sdk/emulator',
      '/tmp/android-sdk/platform-tools',
    ]);
  });
});
