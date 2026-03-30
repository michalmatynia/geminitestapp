import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'runtime', 'check-install-package-manager.cjs');

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'install-package-manager-'));
  tempRoots.push(root);
  return root;
};

const runScript = (env: NodeJS.ProcessEnv) =>
  spawnSync(process.execPath, [scriptPath], {
    cwd: createTempRoot(),
    encoding: 'utf8',
    env,
  });

describe('check-install-package-manager', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('passes for npm installs in strict environments', () => {
    const result = runScript({
      ...process.env,
      VERCEL: '1',
      npm_lifecycle_event: 'preinstall',
      npm_config_user_agent: 'npm/11.7.0 node/v22.22.0 darwin arm64 workspaces/false',
      npm_execpath: '/usr/local/lib/node_modules/npm/bin/npm-cli.js',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('strict=1');
    expect(result.stdout).toContain('workspaces=false');
  });

  it('fails for non-npm installs in strict environments', () => {
    const result = runScript({
      ...process.env,
      VERCEL: '1',
      npm_lifecycle_event: 'preinstall',
      npm_config_user_agent: 'bun/1.3.10',
      npm_execpath: '/usr/local/bin/bun',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Install must run through npm');
  });

  it('does not fail for non-npm installs outside strict environments', () => {
    const result = runScript({
      ...process.env,
      npm_lifecycle_event: 'preinstall',
      npm_config_user_agent: 'bun/1.3.10',
      npm_execpath: '/usr/local/bin/bun',
      VERCEL: '',
      CI: '',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('strict=0');
  });

  it('fails fast when Vercel installs with npm workspaces enabled', () => {
    const result = runScript({
      ...process.env,
      VERCEL: '1',
      npm_lifecycle_event: 'preinstall',
      npm_config_user_agent: 'npm/11.7.0 node/v22.22.0 linux x64 workspaces/true',
      npm_execpath: '/usr/local/lib/node_modules/npm/bin/npm-cli.js',
      npm_config_workspaces: 'true',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Vercel install must keep npm workspaces disabled');
  });
});
