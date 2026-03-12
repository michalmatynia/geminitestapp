import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';

import {
  detectExistingPlaywrightServer,
  resolvePreferredBrowserNodeBinDir,
} from './playwright-suite-runtime.mjs';

const DEFAULT_APP_ID = 'web';
const DEFAULT_MODE = 'dev';
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_STARTUP_TIMEOUT_MS = 120_000;
const DEFAULT_REUSE_TIMEOUT_MS = 5_000;
const DEFAULT_LOCK_POLL_MS = 200;
const AGENT_ID_ENV_KEYS = [
  'AI_AGENT_ID',
  'CODEX_AGENT_ID',
  'AGENT_ID',
  'CODEX_SESSION_ID',
  'CODEX_THREAD_ID',
  'USER',
];
const NPM_EXECUTABLE = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const NPX_EXECUTABLE = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const PLAYWRIGHT_BROKER_DEV_SCRIPT = 'dev:playwright-broker';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const sanitizeRuntimeToken = (value, fallback = 'default') => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const sanitized = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')
    .slice(0, 48);

  return sanitized.length > 0 ? sanitized : fallback;
};

const hashToken = (value, length = 8) =>
  createHash('sha1').update(String(value)).digest('hex').slice(0, length);

const prependBinToPath = (preferredBrowserNodeBinDir, currentPath) => {
  if (!preferredBrowserNodeBinDir) {
    return currentPath ?? '';
  }

  const currentSegments = (currentPath ?? '').split(path.delimiter).filter(Boolean);
  if (currentSegments.includes(preferredBrowserNodeBinDir)) {
    return currentPath ?? '';
  }

  return [preferredBrowserNodeBinDir, ...currentSegments].join(path.delimiter);
};

const parseBaseUrl = (baseUrl) => {
  if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
    return null;
  }

  try {
    return new URL(baseUrl);
  } catch {
    return null;
  }
};

const isProcessAlive = async (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
};

const waitForHealthyServer = async ({
  baseUrl,
  pid = null,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_STARTUP_TIMEOUT_MS,
  pollMs = 1_000,
} = {}) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await detectExistingPlaywrightServer({ baseUrl, fetchImpl })) {
      return true;
    }

    if (pid !== null && !(await isProcessAlive(pid))) {
      return false;
    }

    await sleep(pollMs);
  }

  return detectExistingPlaywrightServer({ baseUrl, fetchImpl });
};

const allocatePort = ({ host = DEFAULT_HOST } = {}) =>
  new Promise((resolve, reject) => {
    const listenHost =
      typeof host === 'string' && host.trim().length > 0 ? host : undefined;
    const server = net.createServer();

    server.on('error', reject);
    server.listen(0, listenHost, () => {
      const address = server.address();
      const port =
        address && typeof address === 'object' && typeof address.port === 'number'
          ? address.port
          : null;

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        if (!port) {
          reject(new Error('Could not resolve an available port.'));
          return;
        }

        resolve(port);
      });
    });
  });

const resolveBrokerLeasePaths = ({ brokerDir, leaseKey }) => ({
  leaseFilePath: path.join(brokerDir, 'leases', `${leaseKey}.json`),
  logFilePath: path.join(brokerDir, 'logs', `${leaseKey}.log`),
  lockFilePath: path.join(brokerDir, 'locks', `${leaseKey}.lock`),
});

const readLeaseRecord = async (leaseFilePath) => {
  try {
    const raw = await fsPromises.readFile(leaseFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
};

const writeLeaseRecord = async (leaseFilePath, lease) => {
  await fsPromises.mkdir(path.dirname(leaseFilePath), { recursive: true });
  await fsPromises.writeFile(leaseFilePath, `${JSON.stringify(lease, null, 2)}\n`, 'utf8');
};

const PLAYWRIGHT_AGENT_RESOURCE_ID = 'testing.playwright.runtime-broker';

const withAgentLeaseMetadata = (lease) => ({
  ...lease,
  agentLeaseResourceId: PLAYWRIGHT_AGENT_RESOURCE_ID,
  agentLeaseScopeId:
    typeof lease?.leaseKey === 'string' && lease.leaseKey.length > 0 ? lease.leaseKey : null,
  agentLeaseMode: 'partitioned',
  leaseHeartbeatAt: new Date().toISOString(),
});

const removeFileIfPresent = async (filePath) => {
  try {
    await fsPromises.unlink(filePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
};

const removeDirectoryIfPresent = async (directoryPath) => {
  try {
    await fsPromises.rm(directoryPath, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
};

const resolveManagedLeaseDistDirPath = (lease) => {
  if (!lease || typeof lease.rootDir !== 'string' || typeof lease.distDir !== 'string') {
    return null;
  }

  const expectedManagedDistDir = resolveBrokerManagedDistDir({
    appId: lease.appId,
    mode: lease.mode,
    bundler: lease.bundler ?? null,
    agentId: lease.agentId,
  });
  const usesManagedDistDir =
    lease.managedDistDir === true ||
    (lease.managedDistDir == null && lease.distDir === expectedManagedDistDir);

  if (!usesManagedDistDir || path.isAbsolute(lease.distDir)) {
    return null;
  }

  const resolvedRootDir = path.resolve(lease.rootDir);
  const resolvedDistDir = path.resolve(resolvedRootDir, lease.distDir);
  if (
    resolvedDistDir !== resolvedRootDir &&
    !resolvedDistDir.startsWith(`${resolvedRootDir}${path.sep}`)
  ) {
    return null;
  }

  return resolvedDistDir;
};

const resolveManagedLeaseRuntimeTmpDirPath = (lease) => {
  if (!lease || typeof lease.rootDir !== 'string' || typeof lease.runtimeTmpDir !== 'string') {
    return null;
  }

  const expectedManagedRuntimeTmpDir =
    typeof lease.leaseKey === 'string' && lease.leaseKey.length > 0
      ? resolveBrokerManagedRuntimeTmpDir({ leaseKey: lease.leaseKey })
      : null;
  const usesManagedRuntimeTmpDir =
    lease.managedRuntimeTmpDir === true ||
    (lease.managedRuntimeTmpDir == null &&
      expectedManagedRuntimeTmpDir !== null &&
      lease.runtimeTmpDir === expectedManagedRuntimeTmpDir);

  if (!usesManagedRuntimeTmpDir || path.isAbsolute(lease.runtimeTmpDir)) {
    return null;
  }

  const resolvedRootDir = path.resolve(lease.rootDir);
  const resolvedRuntimeTmpDir = path.resolve(resolvedRootDir, lease.runtimeTmpDir);
  if (
    resolvedRuntimeTmpDir !== resolvedRootDir &&
    !resolvedRuntimeTmpDir.startsWith(`${resolvedRootDir}${path.sep}`)
  ) {
    return null;
  }

  return resolvedRuntimeTmpDir;
};

const resolveLeaseDirectory = (leaseFilePath) => {
  if (typeof leaseFilePath !== 'string' || leaseFilePath.length === 0) {
    return null;
  }

  const candidate = path.dirname(leaseFilePath);
  return path.basename(candidate) === 'leases' ? candidate : null;
};

const leaseReferencesManagedDistDir = (candidateLease, lease) =>
  Boolean(
    candidateLease &&
      lease &&
      typeof candidateLease.rootDir === 'string' &&
      typeof candidateLease.distDir === 'string' &&
      candidateLease.rootDir === lease.rootDir &&
      candidateLease.distDir === lease.distDir
  );

const hasSiblingLeaseForManagedDistDir = async ({
  lease,
  leaseFilePath,
} = {}) => {
  const leaseDir = resolveLeaseDirectory(leaseFilePath);
  if (!leaseDir) {
    return false;
  }

  let files = [];
  try {
    files = await fsPromises.readdir(leaseDir);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }

    throw error;
  }

  const currentLeaseFileName = path.basename(leaseFilePath);

  for (const file of files) {
    if (!file.endsWith('.json') || file === currentLeaseFileName) {
      continue;
    }

    const candidateLease = await readLeaseRecord(path.join(leaseDir, file));
    if (leaseReferencesManagedDistDir(candidateLease, lease)) {
      return true;
    }
  }

  return false;
};

const leaseReferencesManagedRuntimeTmpDir = (candidateLease, lease) =>
  Boolean(
    candidateLease &&
      lease &&
      typeof candidateLease.rootDir === 'string' &&
      typeof candidateLease.runtimeTmpDir === 'string' &&
      candidateLease.rootDir === lease.rootDir &&
      candidateLease.runtimeTmpDir === lease.runtimeTmpDir
  );

const hasSiblingLeaseForManagedRuntimeTmpDir = async ({
  lease,
  leaseFilePath,
} = {}) => {
  const leaseDir = resolveLeaseDirectory(leaseFilePath);
  if (!leaseDir) {
    return false;
  }

  let files = [];
  try {
    files = await fsPromises.readdir(leaseDir);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }

    throw error;
  }

  const currentLeaseFileName = path.basename(leaseFilePath);

  for (const file of files) {
    if (!file.endsWith('.json') || file === currentLeaseFileName) {
      continue;
    }

    const candidateLease = await readLeaseRecord(path.join(leaseDir, file));
    if (leaseReferencesManagedRuntimeTmpDir(candidateLease, lease)) {
      return true;
    }
  }

  return false;
};

const cleanupLeaseManagedDistDir = async ({
  lease,
  leaseFilePath = null,
} = {}) => {
  const managedDistDirPath = resolveManagedLeaseDistDirPath(lease);
  if (!managedDistDirPath) {
    return;
  }

  if (await hasSiblingLeaseForManagedDistDir({ lease, leaseFilePath })) {
    return;
  }

  await removeDirectoryIfPresent(managedDistDirPath);
};

const cleanupLeaseManagedRuntimeTmpDir = async ({
  lease,
  leaseFilePath = null,
} = {}) => {
  const managedRuntimeTmpDirPath = resolveManagedLeaseRuntimeTmpDirPath(lease);
  if (!managedRuntimeTmpDirPath) {
    return;
  }

  if (await hasSiblingLeaseForManagedRuntimeTmpDir({ lease, leaseFilePath })) {
    return;
  }

  await removeDirectoryIfPresent(managedRuntimeTmpDirPath);
};

const signalProcess = async (pid, signal) => {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, signal);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') {
      return false;
    }

    throw error;
  }
};

const isSignalPermissionError = (error) => error?.code === 'EPERM';

const readBrokerLockRecord = async (lockFilePath) => {
  try {
    const raw = await fsPromises.readFile(lockFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }

    return null;
  }
};

const releaseBrokerLeaseLock = async (lockFilePath) => {
  if (!lockFilePath) {
    return;
  }

  await removeFileIfPresent(lockFilePath);
};

const acquireBrokerLeaseLock = async ({
  lockFilePath,
  timeoutMs = DEFAULT_STARTUP_TIMEOUT_MS,
  pollMs = DEFAULT_LOCK_POLL_MS,
} = {}) => {
  const deadline = Date.now() + timeoutMs;
  const lockDir = path.dirname(lockFilePath);

  await fsPromises.mkdir(lockDir, { recursive: true });

  while (Date.now() < deadline) {
    try {
      const handle = await fsPromises.open(lockFilePath, 'wx');
      try {
        await handle.writeFile(
          `${JSON.stringify(
            {
              pid: process.pid,
              createdAt: new Date().toISOString(),
            },
            null,
            2
          )}\n`,
          'utf8'
        );
      } finally {
        await handle.close();
      }

      return {
        lockFilePath,
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }

      const existingLock = await readBrokerLockRecord(lockFilePath);
      const ownerPid = existingLock?.pid;
      if (!Number.isInteger(ownerPid) || ownerPid <= 0 || !(await isProcessAlive(ownerPid))) {
        await removeFileIfPresent(lockFilePath);
        continue;
      }

      await sleep(pollMs);
    }
  }

  throw new Error(
    `[runtime-broker] Timed out waiting for lease lock ${path.basename(lockFilePath)} after ${timeoutMs}ms.`
  );
};

const signalLeaseProcessGroup = async (pid, signal) => {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  let signaled = false;

  if (await signalProcess(pid, signal)) {
    signaled = true;
  }

  if (process.platform === 'win32') {
    return signaled;
  }

  try {
    process.kill(-pid, signal);
    signaled = true;
  } catch (error) {
    if (error?.code !== 'ESRCH') {
      throw error;
    }
  }

  return signaled;
};

const listUnixProcesses = async (spawnImpl = spawn) =>
  await new Promise((resolve, reject) => {
    const child = spawnImpl('ps', ['-Ao', 'pid=,ppid='], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    let stdout = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        resolve([]);
        return;
      }

      const rows = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [pidToken, ppidToken] = line.split(/\s+/, 2);
          return {
            pid: Number.parseInt(pidToken ?? '', 10),
            ppid: Number.parseInt(ppidToken ?? '', 10),
          };
        })
        .filter(
          (row) => Number.isInteger(row.pid) && row.pid > 0 && Number.isInteger(row.ppid) && row.ppid >= 0
        );

      resolve(rows);
    });
  });

const listUnixProcessDescendants = async (pid, spawnImpl = spawn) => {
  if (process.platform === 'win32' || !Number.isInteger(pid) || pid <= 0) {
    return [];
  }

  const rows = await listUnixProcesses(spawnImpl);
  const childMap = new Map();
  for (const row of rows) {
    const children = childMap.get(row.ppid) ?? [];
    children.push(row.pid);
    childMap.set(row.ppid, children);
  }

  const descendants = [];
  const queue = [...(childMap.get(pid) ?? [])];
  const seen = new Set(queue);

  while (queue.length > 0) {
    const currentPid = queue.shift();
    if (!Number.isInteger(currentPid) || currentPid <= 0) {
      continue;
    }

    descendants.push(currentPid);
    for (const childPid of childMap.get(currentPid) ?? []) {
      if (seen.has(childPid)) {
        continue;
      }
      seen.add(childPid);
      queue.push(childPid);
    }
  }

  return descendants;
};

const forceKillLeaseProcessTree = async (pid, spawnImpl = spawn) => {
  const descendants = await listUnixProcessDescendants(pid, spawnImpl);

  await signalLeaseProcessGroup(pid, 'SIGKILL');
  for (const childPid of descendants.reverse()) {
    await signalProcess(childPid, 'SIGKILL');
  }
  await signalProcess(pid, 'SIGKILL');
};

const resolveDefaultRunId = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const entropy = randomBytes(3).toString('hex');
  return sanitizeRuntimeToken(`${timestamp}-${process.pid}-${entropy}`, 'run');
};

const resolvePreferredCommand = (preferredBrowserNodeBinDir, executable) =>
  preferredBrowserNodeBinDir
    ? path.join(preferredBrowserNodeBinDir, executable)
    : executable;

export const resolveRuntimeAgentId = ({ env = process.env, fallback = 'local' } = {}) => {
  for (const key of AGENT_ID_ENV_KEYS) {
    const candidate = env[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return sanitizeRuntimeToken(candidate, fallback);
    }
  }

  return sanitizeRuntimeToken(fallback, fallback);
};

export const buildRuntimeLeaseKey = ({
  rootDir,
  appId = DEFAULT_APP_ID,
  mode = DEFAULT_MODE,
  bundler = null,
  agentId = 'local',
}) => {
  const rootHash = hashToken(path.resolve(rootDir || '.'));
  return [
    sanitizeRuntimeToken(appId, DEFAULT_APP_ID),
    sanitizeRuntimeToken(mode, DEFAULT_MODE),
    bundler ? sanitizeRuntimeToken(bundler, 'bundler') : null,
    sanitizeRuntimeToken(agentId, 'local'),
    rootHash,
  ]
    .filter(Boolean)
    .join('-');
};

export const resolveRuntimeBrokerDir = ({ rootDir, env = process.env } = {}) =>
  env['PLAYWRIGHT_RUNTIME_BROKER_DIR']?.trim() ||
  path.join(rootDir, 'tmp', 'playwright-runtime-broker');

export const resolveBrokerManagedDistDir = ({
  appId = DEFAULT_APP_ID,
  mode = DEFAULT_MODE,
  bundler = null,
  agentId = 'local',
} = {}) =>
  [
    '.next-dev-playwright-broker',
    sanitizeRuntimeToken(appId, DEFAULT_APP_ID),
    sanitizeRuntimeToken(mode, DEFAULT_MODE),
    bundler ? sanitizeRuntimeToken(bundler, 'bundler') : null,
    sanitizeRuntimeToken(agentId, 'local'),
  ]
    .filter(Boolean)
    .join('-');

const resolveBrokerDevBundler = ({
  env = process.env,
  mode = DEFAULT_MODE,
  fallback = null,
} = {}) => {
  if (sanitizeRuntimeToken(mode, DEFAULT_MODE) !== DEFAULT_MODE) {
    return null;
  }

  const requestedBundler = sanitizeRuntimeToken(
    env['PLAYWRIGHT_RUNTIME_DEV_BUNDLER'] ?? env['NEXT_DEV_BUNDLER'],
    ''
  );

  if (requestedBundler === 'webpack') {
    return 'webpack';
  }

  if (requestedBundler === 'turbopack' || requestedBundler === 'turbo') {
    return 'turbopack';
  }

  return fallback ? sanitizeRuntimeToken(fallback, 'bundler') : null;
};

export const resolveBrokerManagedRuntimeTmpDir = ({ leaseKey } = {}) =>
  path.join(
    'tmp',
    'playwright-runtime-broker',
    'runtime-tmp',
    sanitizeRuntimeToken(leaseKey, 'runtime')
  );

export const resolvePlaywrightRunArtifacts = ({
  rootDir,
  appId = DEFAULT_APP_ID,
  agentId = 'local',
  runId = resolveDefaultRunId(),
  env = process.env,
} = {}) => {
  const artifactsRoot =
    env['PLAYWRIGHT_RUN_ARTIFACTS_ROOT']?.trim() ||
    path.join(rootDir, 'tmp', 'playwright-runs');
  const safeRunId = sanitizeRuntimeToken(runId, 'run');
  const runRoot = path.join(
    artifactsRoot,
    sanitizeRuntimeToken(appId, DEFAULT_APP_ID),
    sanitizeRuntimeToken(agentId, 'local'),
    safeRunId
  );

  return {
    runId: safeRunId,
    runRoot,
    outputDir: path.join(runRoot, 'test-results'),
    htmlReportDir: path.join(runRoot, 'html-report'),
    junitOutputFile: path.join(runRoot, 'junit.xml'),
    metadataFile: path.join(runRoot, 'metadata.json'),
  };
};

export const resolveNpmExecutable = ({ preferredBrowserNodeBinDir = null } = {}) =>
  resolvePreferredCommand(preferredBrowserNodeBinDir, NPM_EXECUTABLE);

export const resolveNpxExecutable = ({ preferredBrowserNodeBinDir = null } = {}) =>
  resolvePreferredCommand(preferredBrowserNodeBinDir, NPX_EXECUTABLE);

export const buildBrokeredPlaywrightEnv = ({
  env = process.env,
  host = DEFAULT_HOST,
  baseUrl,
  artifacts,
  preferredBrowserNodeBinDir = null,
  agentId = 'local',
  leaseKey = null,
  distDir = null,
} = {}) => {
  const nextEnv = {
    ...env,
    HOST: host,
    PLAYWRIGHT_BASE_URL: baseUrl,
    PLAYWRIGHT_USE_EXISTING_SERVER: 'true',
    NEXT_PUBLIC_ENABLE_KANGUR_EVENT_ANALYTICS_IN_DEV:
      env['NEXT_PUBLIC_ENABLE_KANGUR_EVENT_ANALYTICS_IN_DEV'] || 'true',
    PLAYWRIGHT_OUTPUT_DIR: artifacts.outputDir,
    PLAYWRIGHT_HTML_REPORT_DIR: artifacts.htmlReportDir,
    PLAYWRIGHT_JUNIT_OUTPUT_FILE: artifacts.junitOutputFile,
    PLAYWRIGHT_RUNTIME_RUN_ID: artifacts.runId,
    AI_AGENT_ID: agentId,
  };

  if (leaseKey) {
    nextEnv['PLAYWRIGHT_RUNTIME_LEASE_KEY'] = leaseKey;
  }

  if (distDir) {
    nextEnv['NEXT_DIST_DIR'] = distDir;
  }

  nextEnv['PATH'] = prependBinToPath(preferredBrowserNodeBinDir, env['PATH']);

  return nextEnv;
};

const buildBrokerServerEnv = ({
  env,
  host,
  port,
  distDir,
  bundler,
  runtimeTmpDir,
  agentId,
  leaseKey,
  preferredBrowserNodeBinDir,
}) => {
  const nextEnv = {
    ...env,
    PORT: String(port),
    NEXT_DIST_DIR: distDir,
    NEXT_PUBLIC_ENABLE_KANGUR_EVENT_ANALYTICS_IN_DEV:
      env['NEXT_PUBLIC_ENABLE_KANGUR_EVENT_ANALYTICS_IN_DEV'] || 'true',
    PLAYWRIGHT_RUNTIME_AGENT_ID: agentId,
    PLAYWRIGHT_RUNTIME_LEASE_KEY: leaseKey,
    TMPDIR: runtimeTmpDir,
    TMP: runtimeTmpDir,
    TEMP: runtimeTmpDir,
    PATH: prependBinToPath(preferredBrowserNodeBinDir, env['PATH']),
  };

  if (typeof host === 'string' && host.length > 0) {
    nextEnv.HOST = host;
  }

  if (bundler) {
    nextEnv['NEXT_DEV_BUNDLER'] = bundler;
  }

  return nextEnv;
};

export const resolveExplicitPlaywrightRuntime = async ({
  env = process.env,
  fetchImpl = globalThis.fetch,
  preferredBrowserNodeBinDir = resolvePreferredBrowserNodeBinDir({ env }),
} = {}) => {
  const baseUrl = env['PLAYWRIGHT_BASE_URL'];
  const requestedReuse = env['PLAYWRIGHT_USE_EXISTING_SERVER'];
  if (!baseUrl || requestedReuse !== 'true') {
    return null;
  }

  const healthy = await detectExistingPlaywrightServer({ baseUrl, fetchImpl });
  if (!healthy) {
    throw new Error(`[runtime-broker] Existing server requested at ${baseUrl}, but health checks failed.`);
  }

  const parsed = parseBaseUrl(baseUrl);

  return {
    source: 'explicit',
    managed: false,
    reused: true,
    appId: sanitizeRuntimeToken(env['PLAYWRIGHT_APP_ID'], DEFAULT_APP_ID),
    mode: sanitizeRuntimeToken(env['PLAYWRIGHT_RUNTIME_MODE'], DEFAULT_MODE),
    agentId: resolveRuntimeAgentId({ env }),
    baseUrl,
    host: parsed?.hostname ?? DEFAULT_HOST,
    port: parsed?.port ? Number(parsed.port) : null,
    pid: null,
    distDir: env['NEXT_DIST_DIR'] ?? null,
    managedDistDir: false,
    runtimeTmpDir: null,
    managedRuntimeTmpDir: false,
    leaseKey: null,
    leaseFilePath: null,
    logFilePath: null,
    preferredBrowserNodeBinDir,
  };
};

export const stopBrokerRuntimeLease = async ({
  lease,
  leaseFilePath = lease?.leaseFilePath ?? null,
  force = true,
  removeLeaseFile = true,
  graceMs = 3_000,
  spawnImpl = spawn,
} = {}) => {
  const pid = lease?.pid ?? null;

  if (lease?.managed && Number.isInteger(pid) && pid > 0 && (await isProcessAlive(pid))) {
    await signalLeaseProcessGroup(pid, 'SIGTERM');

    const deadline = Date.now() + graceMs;
    while (Date.now() < deadline) {
      if (!(await isProcessAlive(pid))) {
        break;
      }

      await sleep(200);
    }

    if (force && (await isProcessAlive(pid))) {
      await forceKillLeaseProcessTree(pid, spawnImpl);
    }
  }

  if (removeLeaseFile && leaseFilePath) {
    await removeFileIfPresent(leaseFilePath);
  }

  await cleanupLeaseManagedDistDir({ lease, leaseFilePath });
  await cleanupLeaseManagedRuntimeTmpDir({ lease, leaseFilePath });
};

export const acquireRuntimeLease = async ({
  rootDir,
  appId = DEFAULT_APP_ID,
  mode = DEFAULT_MODE,
  agentId,
  host = DEFAULT_HOST,
  env = process.env,
  fetchImpl = globalThis.fetch,
  spawnImpl = spawn,
  preferredBrowserNodeBinDir = resolvePreferredBrowserNodeBinDir({ env }),
  startupTimeoutMs = DEFAULT_STARTUP_TIMEOUT_MS,
  reuseTimeoutMs = DEFAULT_REUSE_TIMEOUT_MS,
} = {}) => {
  const explicitRuntime = await resolveExplicitPlaywrightRuntime({
    env,
    fetchImpl,
    preferredBrowserNodeBinDir,
  });
  if (explicitRuntime) {
    return explicitRuntime;
  }

  const resolvedRootDir = path.resolve(rootDir);
  const resolvedAgentId = sanitizeRuntimeToken(
    agentId ?? resolveRuntimeAgentId({ env }),
    'local'
  );
  const resolvedAppId = sanitizeRuntimeToken(appId, DEFAULT_APP_ID);
  const resolvedMode = sanitizeRuntimeToken(mode, DEFAULT_MODE);
  const resolvedBundler = resolveBrokerDevBundler({
    env,
    mode: resolvedMode,
  });
  const brokerDir = resolveRuntimeBrokerDir({ rootDir: resolvedRootDir, env });
  const leaseKey = buildRuntimeLeaseKey({
    rootDir: resolvedRootDir,
    appId: resolvedAppId,
    mode: resolvedMode,
    bundler: resolvedBundler,
    agentId: resolvedAgentId,
  });
  const { leaseFilePath, logFilePath, lockFilePath } = resolveBrokerLeasePaths({ brokerDir, leaseKey });
  const leaseLock = await acquireBrokerLeaseLock({
    lockFilePath,
    timeoutMs: startupTimeoutMs + reuseTimeoutMs,
  });

  try {
    const existingLease = await readLeaseRecord(leaseFilePath);
    if (existingLease) {
      const reuseExistingLease = async () => {
        const refreshedLease = withAgentLeaseMetadata({
          ...existingLease,
          managed: true,
          source: 'broker',
          reused: true,
          leaseFilePath,
          logFilePath,
          preferredBrowserNodeBinDir:
            existingLease.preferredBrowserNodeBinDir ?? preferredBrowserNodeBinDir,
        });
        await writeLeaseRecord(leaseFilePath, refreshedLease);
        return refreshedLease;
      };

      const running = await isProcessAlive(existingLease.pid);
      if (running) {
        const healthy = await waitForHealthyServer({
          baseUrl: existingLease.baseUrl,
          pid: existingLease.pid,
          fetchImpl,
          timeoutMs: reuseTimeoutMs,
        });

        if (healthy) {
          return await reuseExistingLease();
        }

        try {
          await stopBrokerRuntimeLease({ lease: existingLease, leaseFilePath });
        } catch (error) {
          if (!isSignalPermissionError(error)) {
            throw error;
          }

          const recoveredHealthy = await waitForHealthyServer({
            baseUrl: existingLease.baseUrl,
            pid: existingLease.pid,
            fetchImpl,
            timeoutMs: startupTimeoutMs,
          });
          if (recoveredHealthy) {
            return await reuseExistingLease();
          }

          await removeFileIfPresent(leaseFilePath);
        }
      } else {
        await removeFileIfPresent(leaseFilePath);
      }
    }

    const configuredBaseUrl = parseBaseUrl(env['PLAYWRIGHT_BASE_URL']);
    let serverHost = host;
    const port = configuredBaseUrl?.port
      ? Number(configuredBaseUrl.port)
      : await (async () => {
        try {
            return await allocatePort({ host });
          } catch {
            serverHost = null;
            return await allocatePort({ host: null });
          }
        })();
    const runtimeBaseHost = serverHost ?? DEFAULT_HOST;
    const baseUrl = configuredBaseUrl?.toString() ?? `http://${runtimeBaseHost}:${port}`;
    const distDir =
      env['NEXT_DIST_DIR']?.trim() ||
      resolveBrokerManagedDistDir({
        appId: resolvedAppId,
        mode: resolvedMode,
        bundler: resolvedBundler,
        agentId: resolvedAgentId,
      });
    const managedDistDir = !(env['NEXT_DIST_DIR']?.trim());
    const runtimeTmpDir = resolveBrokerManagedRuntimeTmpDir({ leaseKey });
    const resolvedRuntimeTmpDir = path.join(resolvedRootDir, runtimeTmpDir);

    await fsPromises.mkdir(path.dirname(logFilePath), { recursive: true });
    await fsPromises.mkdir(resolvedRuntimeTmpDir, { recursive: true });
    const logFd = fs.openSync(logFilePath, 'a');
    const devScript = resolvedMode === 'dev' ? PLAYWRIGHT_BROKER_DEV_SCRIPT : 'dev';
    const child = spawnImpl(
      resolveNpmExecutable({ preferredBrowserNodeBinDir }),
      ['run', devScript],
      {
        cwd: resolvedRootDir,
        env: buildBrokerServerEnv({
          env,
          host: serverHost,
          port,
          distDir,
          bundler: resolvedBundler,
          runtimeTmpDir: resolvedRuntimeTmpDir,
          agentId: resolvedAgentId,
          leaseKey,
          preferredBrowserNodeBinDir,
        }),
        detached: true,
        stdio: ['ignore', logFd, logFd],
      }
    );
    fs.closeSync(logFd);
    child.unref?.();

    const lease = withAgentLeaseMetadata({
      source: 'broker',
      managed: true,
      reused: false,
      rootDir: resolvedRootDir,
      appId: resolvedAppId,
      mode: resolvedMode,
      bundler: resolvedBundler,
      agentId: resolvedAgentId,
      host: runtimeBaseHost,
      port,
      baseUrl,
      pid: child.pid ?? null,
      distDir,
      managedDistDir,
      runtimeTmpDir,
      managedRuntimeTmpDir: true,
      leaseKey,
      leaseFilePath,
      logFilePath,
      startedAt: new Date().toISOString(),
      preferredBrowserNodeBinDir,
    });

    await writeLeaseRecord(leaseFilePath, lease);

    const healthy = await waitForHealthyServer({
      baseUrl,
      pid: child.pid ?? null,
      fetchImpl,
      timeoutMs: startupTimeoutMs,
    });
    if (!healthy) {
      await stopBrokerRuntimeLease({ lease, leaseFilePath });
      throw new Error(
        `[runtime-broker] Failed to start ${resolvedAppId} ${resolvedMode} runtime at ${baseUrl}. Check ${path.relative(resolvedRootDir, logFilePath)}.`
      );
    }

    return lease;
  } finally {
    await releaseBrokerLeaseLock(leaseLock.lockFilePath);
  }
};

export const cleanupBrokerRuntimeLeases = async ({
  rootDir,
  appId = null,
  agentId = null,
  mode = DEFAULT_MODE,
  env = process.env,
} = {}) => {
  const resolvedRootDir = path.resolve(rootDir);
  const brokerDir = resolveRuntimeBrokerDir({ rootDir: resolvedRootDir, env });
  const leaseDir = path.join(brokerDir, 'leases');

  let files = [];
  try {
    files = await fsPromises.readdir(leaseDir);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  const safeAppId = appId ? sanitizeRuntimeToken(appId, DEFAULT_APP_ID) : null;
  const safeAgentId = agentId ? sanitizeRuntimeToken(agentId, 'local') : null;
  const safeMode = sanitizeRuntimeToken(mode, DEFAULT_MODE);
  const summary = { inspected: 0, stopped: 0, removed: 0 };

  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }

    const leaseFilePath = path.join(leaseDir, file);
    const lease = await readLeaseRecord(leaseFilePath);
    if (!lease) {
      await removeFileIfPresent(leaseFilePath);
      summary.removed += 1;
      continue;
    }

    if (
      lease.rootDir !== resolvedRootDir ||
      (safeAppId && lease.appId !== safeAppId) ||
      (safeAgentId && lease.agentId !== safeAgentId)
    ) {
      continue;
    }

    summary.inspected += 1;

    const running = await isProcessAlive(lease.pid);
    if (running) {
      await stopBrokerRuntimeLease({ lease, leaseFilePath });
      summary.stopped += 1;
      summary.removed += 1;
      continue;
    }

    await stopBrokerRuntimeLease({ lease, leaseFilePath });
    summary.removed += 1;
  }

  if (safeAppId && safeAgentId) {
    const candidateBundlers = new Set([
      null,
      resolveBrokerDevBundler({
        env,
        mode: safeMode,
        fallback: null,
      }),
    ]);

    for (const candidateBundler of candidateBundlers) {
      const distDir = resolveBrokerManagedDistDir({
        appId: safeAppId,
        mode: safeMode,
        bundler: candidateBundler,
        agentId: safeAgentId,
      });
      const distPath = path.join(resolvedRootDir, distDir);
      const syntheticLeaseFilePath = path.join(leaseDir, '__synthetic__.json');

      const distExists = await fsPromises
        .stat(distPath)
        .then(() => true)
        .catch((error) => {
          if (error?.code === 'ENOENT') {
            return false;
          }

          throw error;
        });
      if (!distExists) {
        continue;
      }

      const hasSiblingLease = await hasSiblingLeaseForManagedDistDir({
        lease: {
          rootDir: resolvedRootDir,
          distDir,
          appId: safeAppId,
          mode: safeMode,
          bundler: candidateBundler,
          agentId: safeAgentId,
          managedDistDir: true,
        },
        leaseFilePath: syntheticLeaseFilePath,
      });
      if (hasSiblingLease) {
        continue;
      }

      await removeDirectoryIfPresent(distPath);
      summary.removed += 1;
    }
  }

  return summary;
};
