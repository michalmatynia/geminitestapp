import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  initKangurMobileEnv,
  parseInitKangurMobileEnvArgs,
} from './init-kangur-mobile-env';

const TEMP_DIRS: string[] = [];

const createTempDir = (): string => {
  const tempDir = mkdtempSync(join(tmpdir(), 'kangur-mobile-init-'));
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

describe('parseInitKangurMobileEnvArgs', () => {
  it('parses force and target arguments', () => {
    const parsed = parseInitKangurMobileEnvArgs(
      ['--force', '--target', 'apps/mobile/.env.test'],
      '/repo',
    );

    expect(parsed).toEqual({
      force: true,
      targetPath: '/repo/apps/mobile/.env.test',
    });
  });

  it('throws on unknown arguments', () => {
    expect(() => parseInitKangurMobileEnvArgs(['--wat'])).toThrow(
      /Unknown argument/,
    );
  });
});

describe('initKangurMobileEnv', () => {
  it('creates the target file from the source template', () => {
    const tempDir = createTempDir();
    const sourcePath = join(tempDir, '.env.example');
    const targetPath = join(tempDir, '.env.local');

    writeFileSync(sourcePath, 'KANGUR_EXPO_OWNER=template-owner\n');

    const result = initKangurMobileEnv({
      force: false,
      sourcePath,
      targetPath,
    });

    expect(result).toEqual({
      status: 'created',
    });
    expect(readFileSync(targetPath, 'utf8')).toBe('KANGUR_EXPO_OWNER=template-owner\n');
  });

  it('skips an existing target when force is false', () => {
    const tempDir = createTempDir();
    const sourcePath = join(tempDir, '.env.example');
    const targetPath = join(tempDir, '.env.local');

    writeFileSync(sourcePath, 'KANGUR_EXPO_OWNER=template-owner\n');
    writeFileSync(targetPath, 'KANGUR_EXPO_OWNER=real-owner\n');

    const result = initKangurMobileEnv({
      force: false,
      sourcePath,
      targetPath,
    });

    expect(result).toEqual({
      status: 'skipped',
    });
    expect(readFileSync(targetPath, 'utf8')).toBe('KANGUR_EXPO_OWNER=real-owner\n');
  });

  it('overwrites an existing target when force is true', () => {
    const tempDir = createTempDir();
    const sourcePath = join(tempDir, '.env.example');
    const targetPath = join(tempDir, '.env.local');

    writeFileSync(sourcePath, 'KANGUR_EXPO_OWNER=template-owner\n');
    writeFileSync(targetPath, 'KANGUR_EXPO_OWNER=real-owner\n');

    const result = initKangurMobileEnv({
      force: true,
      sourcePath,
      targetPath,
    });

    expect(result).toEqual({
      status: 'created',
    });
    expect(readFileSync(targetPath, 'utf8')).toBe('KANGUR_EXPO_OWNER=template-owner\n');
  });
});
