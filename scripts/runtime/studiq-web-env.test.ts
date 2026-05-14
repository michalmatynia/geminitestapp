import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { loadStudiqWebEnv } = require('./studiq-web-env.cjs') as {
  loadStudiqWebEnv: (input: {
    repoRoot: string;
    appDir: string;
    isDev: boolean;
    loadRootEnv?: boolean;
  }) => { appEnvFiles: string[]; loadedKeys: Set<string>; mode: string };
};

const originalEnv = { ...process.env };
const tempRoots: string[] = [];

const writeFile = (root: string, relativePath: string, contents: string): void => {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studiq-web-env-'));
  tempRoots.push(root);
  return root;
};

const resetEnv = (): void => {
  Object.keys(process.env).forEach((key) => {
    delete process.env[key];
  });
  Object.assign(process.env, originalEnv);
};

describe('studiq web env loader', () => {
  afterEach(() => {
    resetEnv();
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('lets apps/studiq-web env override root MongoDB values', () => {
    const repoRoot = createTempRoot();
    const appDir = path.join(repoRoot, 'apps', 'studiq-web');
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/app';
    process.env.MONGODB_DB = 'app';
    process.env.MONGODB_LOCAL_URI = 'mongodb://127.0.0.1:27017/app_local';
    process.env.MONGODB_LOCAL_DB = 'app_local';
    writeFile(
      appDir,
      '.env.local',
      [
        'STUDIQ_MONGO_ISOLATED="true"',
        'MONGODB_URI="mongodb://127.0.0.1:27018/studiq_local"',
        'MONGODB_DB="studiq_local"',
      ].join('\n')
    );

    const result = loadStudiqWebEnv({ repoRoot, appDir, isDev: true, loadRootEnv: false });

    expect(result.appEnvFiles).toEqual(['.env.local']);
    expect(process.env.MONGODB_URI).toBe('mongodb://127.0.0.1:27018/studiq_local');
    expect(process.env.MONGODB_DB).toBe('studiq_local');
    expect(process.env.MONGODB_LOCAL_URI).toBe('mongodb://127.0.0.1:27018/studiq_local');
    expect(process.env.MONGODB_LOCAL_DB).toBe('studiq_local');
    expect(process.env.MONGODB_ACTIVE_SOURCE_DEFAULT).toBe('local');
  });

  it('removes root cloud MongoDB source leakage unless StudiQ defines one', () => {
    const repoRoot = createTempRoot();
    const appDir = path.join(repoRoot, 'apps', 'studiq-web');
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_CLOUD_URI = 'mongodb+srv://cluster.example/app_cloud';
    process.env.MONGODB_CLOUD_DB = 'app_cloud';
    writeFile(
      appDir,
      '.env.local',
      [
        'STUDIQ_MONGO_ISOLATED="true"',
        'MONGODB_URI="mongodb://127.0.0.1:27018/studiq_local"',
        'MONGODB_DB="studiq_local"',
      ].join('\n')
    );

    loadStudiqWebEnv({ repoRoot, appDir, isDev: true, loadRootEnv: false });

    expect(process.env.MONGODB_CLOUD_URI).toBeUndefined();
    expect(process.env.MONGODB_CLOUD_DB).toBeUndefined();
  });

  it('uses the dedicated local StudiQ database when no app MongoDB env exists', () => {
    const repoRoot = createTempRoot();
    const appDir = path.join(repoRoot, 'apps', 'studiq-web');
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/app';
    process.env.MONGODB_DB = 'app';
    process.env.MONGODB_LOCAL_URI = 'mongodb://127.0.0.1:27017/app';
    process.env.MONGODB_LOCAL_DB = 'app';

    loadStudiqWebEnv({ repoRoot, appDir, isDev: true, loadRootEnv: false });

    expect(process.env.MONGODB_URI).toBe('mongodb://127.0.0.1:27018/studiq_local');
    expect(process.env.MONGODB_DB).toBe('studiq_local');
    expect(process.env.MONGODB_LOCAL_URI).toBe('mongodb://127.0.0.1:27018/studiq_local');
    expect(process.env.MONGODB_LOCAL_DB).toBe('studiq_local');
    expect(process.env.MONGODB_ACTIVE_SOURCE_DEFAULT).toBe('local');
  });

  it('forces local StudiQ source in development even when app env selects cloud', () => {
    const repoRoot = createTempRoot();
    const appDir = path.join(repoRoot, 'apps', 'studiq-web');
    process.env.NODE_ENV = 'development';
    writeFile(
      appDir,
      '.env.local',
      [
        'STUDIQ_MONGO_ISOLATED="true"',
        'MONGODB_LOCAL_URI="mongodb://127.0.0.1:27018/studiq_local"',
        'MONGODB_LOCAL_DB="studiq_local"',
        'MONGODB_CLOUD_URI="mongodb+srv://cluster.example/studiq_db"',
        'MONGODB_CLOUD_DB="studiq_db"',
        'MONGODB_ACTIVE_SOURCE_DEFAULT="cloud"',
      ].join('\n')
    );

    loadStudiqWebEnv({ repoRoot, appDir, isDev: true, loadRootEnv: false });

    expect(process.env.MONGODB_URI).toBe('mongodb://127.0.0.1:27018/studiq_local');
    expect(process.env.MONGODB_DB).toBe('studiq_local');
    expect(process.env.MONGODB_ACTIVE_SOURCE_DEFAULT).toBe('local');
    expect(process.env.MONGODB_CLOUD_URI).toBeUndefined();
    expect(process.env.MONGODB_CLOUD_DB).toBeUndefined();
  });

  it('supports STUDIQ_MONGODB_URI aliases', () => {
    const repoRoot = createTempRoot();
    const appDir = path.join(repoRoot, 'apps', 'studiq-web');
    process.env.NODE_ENV = 'development';
    writeFile(
      appDir,
      '.env.local',
      [
        'STUDIQ_MONGO_ISOLATED="true"',
        'STUDIQ_MONGODB_URI="mongodb://127.0.0.1:27018/studiq_alias"',
        'STUDIQ_MONGODB_DB="studiq_alias"',
      ].join('\n')
    );

    loadStudiqWebEnv({ repoRoot, appDir, isDev: true, loadRootEnv: false });

    expect(process.env.MONGODB_URI).toBe('mongodb://127.0.0.1:27018/studiq_alias');
    expect(process.env.MONGODB_DB).toBe('studiq_alias');
    expect(process.env.MONGODB_LOCAL_URI).toBe('mongodb://127.0.0.1:27018/studiq_alias');
    expect(process.env.MONGODB_LOCAL_DB).toBe('studiq_alias');
  });
});
