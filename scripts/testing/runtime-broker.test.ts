import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  acquireRuntimeLease,
  buildBrokeredPlaywrightEnv,
  buildRuntimeLeaseKey,
  cleanupBrokerRuntimeLeases,
  resolveBrokerManagedDistDir,
  resolveBrokerManagedRuntimeTmpDir,
  resolvePlaywrightRunArtifacts,
  resolveRuntimeAgentId,
  sanitizeRuntimeToken,
  stopBrokerRuntimeLease,
} from './lib/runtime-broker.mjs';

const cleanupTargets: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupTargets.splice(0).map(async (rootDir) => {
      await cleanupBrokerRuntimeLeases({
        rootDir,
        env: {},
      });
      await fs.rm(rootDir, { recursive: true, force: true });
    })
  );
});

describe('sanitizeRuntimeToken', () => {
  it('normalizes mixed punctuation into a safe token', () => {
    expect(sanitizeRuntimeToken('Agent 7 / Feature:Playwright')).toBe(
      'agent-7-feature-playwright'
    );
  });

  it('falls back when the token is empty after normalization', () => {
    expect(sanitizeRuntimeToken('***', 'local')).toBe('local');
  });
});

describe('resolveRuntimeAgentId', () => {
  it('prefers AI_AGENT_ID when available', () => {
    expect(
      resolveRuntimeAgentId({
        env: {
          AI_AGENT_ID: 'Codex Agent 12',
          USER: 'ignored-user',
        },
      })
    ).toBe('codex-agent-12');
  });

  it('falls back to a sanitized default when no agent env is present', () => {
    expect(resolveRuntimeAgentId({ env: {}, fallback: 'Local Dev' })).toBe('local-dev');
  });
});

describe('buildRuntimeLeaseKey', () => {
  it('includes app, mode, agent, and root hash components', () => {
    const leaseKey = buildRuntimeLeaseKey({
      rootDir: '/tmp/worktrees/feature-a',
      appId: 'admin-web',
      mode: 'dev',
      agentId: 'agent-2',
    });

    expect(leaseKey).toMatch(/^admin-web-dev-agent-2-[a-f0-9]{8}$/);
  });

  it('changes when the root or agent changes', () => {
    const left = buildRuntimeLeaseKey({
      rootDir: '/tmp/worktrees/feature-a',
      appId: 'web',
      mode: 'dev',
      agentId: 'agent-1',
    });
    const right = buildRuntimeLeaseKey({
      rootDir: '/tmp/worktrees/feature-b',
      appId: 'web',
      mode: 'dev',
      agentId: 'agent-2',
    });

    expect(left).not.toBe(right);
  });
});

describe('resolveBrokerManagedDistDir', () => {
  it('creates an agent-scoped Next dist dir name', () => {
    expect(
      resolveBrokerManagedDistDir({
        appId: 'web',
        mode: 'dev',
        agentId: 'Agent 4',
      })
    ).toBe('.next-dev-web-dev-agent-4');
  });
});

describe('resolveBrokerManagedRuntimeTmpDir', () => {
  it('creates a lease-scoped runtime temp dir name', () => {
    expect(resolveBrokerManagedRuntimeTmpDir({ leaseKey: 'web-dev-agent-4-abc12345' })).toBe(
      path.join('tmp', 'playwright-runtime-broker', 'runtime-tmp', 'web-dev-agent-4-abc12345')
    );
  });
});

describe('resolvePlaywrightRunArtifacts', () => {
  it('namespaces artifacts by app, agent, and run id', () => {
    const artifacts = resolvePlaywrightRunArtifacts({
      rootDir: '/repo/app',
      appId: 'storefront',
      agentId: 'agent-9',
      runId: 'Run 2026 03 08',
      env: {},
    });

    expect(artifacts.runRoot).toBe(
      path.join('/repo/app', 'tmp', 'playwright-runs', 'storefront', 'agent-9', 'run-2026-03-08')
    );
    expect(artifacts.outputDir).toBe(path.join(artifacts.runRoot, 'test-results'));
    expect(artifacts.htmlReportDir).toBe(path.join(artifacts.runRoot, 'html-report'));
    expect(artifacts.junitOutputFile).toBe(path.join(artifacts.runRoot, 'junit.xml'));
  });
});

describe('buildBrokeredPlaywrightEnv', () => {
  it('injects base url, artifact paths, and PATH overrides for brokered runs', () => {
    const artifacts = resolvePlaywrightRunArtifacts({
      rootDir: '/repo/app',
      appId: 'web',
      agentId: 'agent-1',
      runId: 'run-a',
      env: {},
    });

    const env = buildBrokeredPlaywrightEnv({
      env: { PATH: '/usr/bin' },
      host: '127.0.0.1',
      baseUrl: 'http://127.0.0.1:3173',
      artifacts,
      preferredBrowserNodeBinDir: '/opt/node22/bin',
      agentId: 'agent-1',
      leaseKey: 'web-dev-agent-1-deadbeef',
      distDir: '.next-dev-web-dev-agent-1',
    });

    expect(env).toEqual(
      expect.objectContaining({
        HOST: '127.0.0.1',
        PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:3173',
        PLAYWRIGHT_USE_EXISTING_SERVER: 'true',
        PLAYWRIGHT_OUTPUT_DIR: artifacts.outputDir,
        PLAYWRIGHT_HTML_REPORT_DIR: artifacts.htmlReportDir,
        PLAYWRIGHT_JUNIT_OUTPUT_FILE: artifacts.junitOutputFile,
        PLAYWRIGHT_RUNTIME_RUN_ID: 'run-a',
        PLAYWRIGHT_RUNTIME_LEASE_KEY: 'web-dev-agent-1-deadbeef',
        NEXT_DIST_DIR: '.next-dev-web-dev-agent-1',
        AI_AGENT_ID: 'agent-1',
        PATH: `/opt/node22/bin${path.delimiter}/usr/bin`,
      })
    );
  });
});

describe('acquireRuntimeLease', () => {
  it('serializes concurrent lease creation so same-key callers reuse one runtime', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-broker-test-'));
    cleanupTargets.push(rootDir);
    const env = {
      PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:43173',
    };

    const healthyBaseUrls = new Set<string>();
    let spawnCount = 0;
    const spawnedEnvs: Array<Record<string, string>> = [];

    const spawnImpl = (_command: string, _args: string[], options: { env: Record<string, string> }) => {
      spawnCount += 1;
      spawnedEnvs.push(options.env);
      const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      const baseUrl = `http://${options.env.HOST}:${options.env.PORT}`;
      setTimeout(() => {
        healthyBaseUrls.add(baseUrl);
      }, 50);

      return child;
    };

    const fetchImpl = async (candidate: string) => {
      const url = new URL(candidate);
      const baseUrl = `${url.protocol}//${url.host}`;
      if (healthyBaseUrls.has(baseUrl)) {
        return { status: 200 };
      }

      throw new Error('runtime not ready');
    };

    const [left, right] = await Promise.all([
      acquireRuntimeLease({
        rootDir,
        appId: 'web',
        mode: 'dev',
        agentId: 'agent-lock',
        env,
        spawnImpl,
        fetchImpl,
        startupTimeoutMs: 3_000,
        reuseTimeoutMs: 500,
      }),
      acquireRuntimeLease({
        rootDir,
        appId: 'web',
        mode: 'dev',
        agentId: 'agent-lock',
        env,
        spawnImpl,
        fetchImpl,
        startupTimeoutMs: 3_000,
        reuseTimeoutMs: 500,
      }),
    ]);

    expect(spawnCount).toBe(1);
    expect(left.baseUrl).toBe(right.baseUrl);
    expect([left.reused, right.reused].filter(Boolean)).toHaveLength(1);
    expect(left.runtimeTmpDir).toBe(resolveBrokerManagedRuntimeTmpDir({ leaseKey: left.leaseKey }));
    expect(right.runtimeTmpDir).toBe(resolveBrokerManagedRuntimeTmpDir({ leaseKey: right.leaseKey }));
    expect(spawnedEnvs).toHaveLength(1);
    expect(spawnedEnvs[0]?.TMPDIR).toBe(path.join(rootDir, left.runtimeTmpDir));
    expect(spawnedEnvs[0]?.TMP).toBe(path.join(rootDir, left.runtimeTmpDir));
    expect(spawnedEnvs[0]?.TEMP).toBe(path.join(rootDir, left.runtimeTmpDir));
    await expect(fs.stat(path.join(rootDir, left.runtimeTmpDir))).resolves.toBeTruthy();
  });
});

describe('cleanupBrokerRuntimeLeases', () => {
  it('removes the broker-managed dist dir for stale leases', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-broker-cleanup-'));
    cleanupTargets.push(rootDir);

    const appId = 'web';
    const mode = 'dev';
    const agentId = 'agent-cleanup';
    const leaseKey = buildRuntimeLeaseKey({
      rootDir,
      appId,
      mode,
      agentId,
    });
    const distDir = resolveBrokerManagedDistDir({
      appId,
      mode,
      agentId,
    });
    const runtimeTmpDir = resolveBrokerManagedRuntimeTmpDir({ leaseKey });
    const brokerDir = path.join(rootDir, 'tmp', 'playwright-runtime-broker');
    const leaseFilePath = path.join(brokerDir, 'leases', `${leaseKey}.json`);

    await fs.mkdir(path.join(rootDir, distDir), { recursive: true });
    await fs.writeFile(path.join(rootDir, distDir, 'marker.txt'), 'stale runtime', 'utf8');
    await fs.mkdir(path.join(rootDir, runtimeTmpDir), { recursive: true });
    await fs.writeFile(path.join(rootDir, runtimeTmpDir, 'marker.txt'), 'stale temp runtime', 'utf8');
    await fs.mkdir(path.dirname(leaseFilePath), { recursive: true });
    await fs.writeFile(
      leaseFilePath,
      `${JSON.stringify(
        {
          source: 'broker',
          managed: true,
          reused: false,
          rootDir,
          appId,
          mode,
          agentId,
          host: '127.0.0.1',
          port: 3210,
          baseUrl: 'http://127.0.0.1:3210',
          pid: 999_999,
          distDir,
          runtimeTmpDir,
          managedRuntimeTmpDir: true,
          leaseKey,
          startedAt: new Date().toISOString(),
        },
        null,
        2
      )}\n`,
      'utf8'
    );

    const summary = await cleanupBrokerRuntimeLeases({
      rootDir,
      appId,
      agentId,
      env: {},
    });

    expect(summary).toEqual({
      inspected: 1,
      stopped: 0,
      removed: 1,
    });
    await expect(fs.stat(path.join(rootDir, distDir))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(rootDir, runtimeTmpDir))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(leaseFilePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('keeps a shared managed dist dir while another lease still references it', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-broker-shared-dist-'));
    cleanupTargets.push(rootDir);

    const appId = 'web';
    const mode = 'dev';
    const agentId = 'agent-shared';
    const distDir = resolveBrokerManagedDistDir({
      appId,
      mode,
      agentId,
    });
    const brokerDir = path.join(rootDir, 'tmp', 'playwright-runtime-broker');
    const leaseDir = path.join(brokerDir, 'leases');
    const firstLeaseKey = buildRuntimeLeaseKey({
      rootDir,
      appId,
      mode,
      agentId,
    });
    const firstLeaseFilePath = path.join(leaseDir, `${firstLeaseKey}.json`);
    const secondLeaseFilePath = path.join(leaseDir, 'web-dev-agent-shared-replacement.json');

    const baseLease = {
      source: 'broker',
      managed: true,
      reused: false,
      rootDir,
      appId,
      mode,
      agentId,
      host: '127.0.0.1',
      port: 3210,
      baseUrl: 'http://127.0.0.1:3210',
      pid: 999_999,
      distDir,
      managedDistDir: true,
      startedAt: new Date().toISOString(),
    };

    await fs.mkdir(path.join(rootDir, distDir), { recursive: true });
    await fs.writeFile(path.join(rootDir, distDir, 'marker.txt'), 'shared runtime', 'utf8');
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.writeFile(
      firstLeaseFilePath,
      `${JSON.stringify(
        {
          ...baseLease,
          leaseKey: firstLeaseKey,
        },
        null,
        2
      )}\n`,
      'utf8'
    );
    await fs.writeFile(
      secondLeaseFilePath,
      `${JSON.stringify(
        {
          ...baseLease,
          baseUrl: 'http://127.0.0.1:3211',
          port: 3211,
          leaseKey: 'web-dev-agent-shared-replacement',
        },
        null,
        2
      )}\n`,
      'utf8'
    );

    await stopBrokerRuntimeLease({
      lease: {
        ...baseLease,
        leaseKey: firstLeaseKey,
      },
      leaseFilePath: firstLeaseFilePath,
    });

    await expect(fs.stat(path.join(rootDir, distDir))).resolves.toBeTruthy();
    await expect(fs.stat(firstLeaseFilePath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(secondLeaseFilePath)).resolves.toBeTruthy();
  });
});
