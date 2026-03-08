import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
    const result = spawnSync('node', ['--import', 'tsx', RUNNER_PATH], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[kangur-mobile-env] Missing command.');
  });

  it('loads env values before executing the child command', () => {
    const tempDir = createTempDir();
    const envFile = join(tempDir, '.env.local');
    writeFileSync(envFile, 'EXPO_PUBLIC_KANGUR_API_URL=http://localhost:3000\n');

    const result = spawnSync(
      'node',
      [
        '--import',
        'tsx',
        RUNNER_PATH,
        'node',
        '-e',
        'console.log(process.env.EXPO_PUBLIC_KANGUR_API_URL ?? "unset")',
      ],
      {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          KANGUR_MOBILE_ENV_FILE: envFile,
        },
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('http://localhost:3000');
  });
});
