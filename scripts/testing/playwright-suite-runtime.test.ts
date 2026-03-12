import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildPlaywrightSuiteRuntime,
  detectExistingPlaywrightServer,
  resolvePreferredBrowserNodeBinDir,
} from './lib/playwright-suite-runtime.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-suite-runtime-'));
  tempRoots.push(root);
  return root;
};

describe('resolvePreferredBrowserNodeBinDir', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('prefers an explicit browser node bin directory when it contains node', () => {
    const root = createTempRoot();
    const binDir = path.join(root, 'custom-bin');
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(binDir, 'node'), '', 'utf8');

    expect(
      resolvePreferredBrowserNodeBinDir({
        env: { A11Y_SMOKE_BROWSER_NODE_BIN: binDir },
      })
    ).toBe(binDir);
  });

  it('falls back to the newest Node 22 bin directory from nvm', () => {
    const root = createTempRoot();
    const versionsRoot = path.join(root, '.nvm', 'versions', 'node');
    const olderBin = path.join(versionsRoot, 'v22.10.0', 'bin');
    const newerBin = path.join(versionsRoot, 'v22.22.0', 'bin');
    fs.mkdirSync(olderBin, { recursive: true });
    fs.mkdirSync(newerBin, { recursive: true });

    expect(
      resolvePreferredBrowserNodeBinDir({
        env: {},
        homedir: () => root,
      })
    ).toBe(newerBin);
  });
});

describe('detectExistingPlaywrightServer', () => {
  it('returns true when the health endpoint and auth route are reachable', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      return { status: 200 };
    };

    await expect(
      detectExistingPlaywrightServer({
        baseUrl: 'http://127.0.0.1:3000',
        fetchImpl,
      })
    ).resolves.toBe(true);
    expect(calls).toEqual(['http://127.0.0.1:3000/api/health']);
  });

  it('treats a healthy health endpoint as sufficient even if the auth route is still unavailable', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      if (url.endsWith('/api/health')) {
        return { status: 200 };
      }
      throw new Error('auth route not ready');
    };

    await expect(
      detectExistingPlaywrightServer({
        baseUrl: 'http://127.0.0.1:3000',
        fetchImpl,
      })
    ).resolves.toBe(true);
    expect(calls).toEqual(['http://127.0.0.1:3000/api/health']);
  });

  it('falls back to probing the auth route when health is unavailable', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      if (url.endsWith('/api/health')) {
        throw new Error('connection refused');
      }
      return { status: 200 };
    };

    await expect(
      detectExistingPlaywrightServer({
        baseUrl: 'http://127.0.0.1:3000',
        fetchImpl,
      })
    ).resolves.toBe(true);
    expect(calls).toEqual([
      'http://127.0.0.1:3000/api/health',
      'http://127.0.0.1:3000/auth/signin',
    ]);
  });
});

describe('buildPlaywrightSuiteRuntime', () => {
  it('enables existing server reuse when a healthy server is already running', async () => {
    const runtime = await buildPlaywrightSuiteRuntime({
      baseUrl: 'http://127.0.0.1:3000',
      host: '127.0.0.1',
      env: { PATH: '/usr/bin' },
      fetchImpl: async () => ({ status: 200 }),
      preferredBrowserNodeBinDir: '/opt/node/bin',
    });

    expect(runtime.reuseExistingServer).toBe(true);
    expect(runtime.env).toEqual(
      expect.objectContaining({
        HOST: '127.0.0.1',
        PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:3000',
        PLAYWRIGHT_USE_EXISTING_SERVER: 'true',
        PATH: `/opt/node/bin${path.delimiter}/usr/bin`,
      })
    );
  });

  it('honors an explicit opt-out for existing server reuse', async () => {
    const runtime = await buildPlaywrightSuiteRuntime({
      baseUrl: 'http://127.0.0.1:3000',
      host: '127.0.0.1',
      env: { PLAYWRIGHT_USE_EXISTING_SERVER: 'false', PATH: '/usr/bin' },
      fetchImpl: async () => ({ status: 200 }),
      preferredBrowserNodeBinDir: null,
    });

    expect(runtime.reuseExistingServer).toBe(false);
    expect(runtime.env.PLAYWRIGHT_USE_EXISTING_SERVER).toBeUndefined();
  });
});
