#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const runtimeDir = path.join(repoRoot, 'mongo', 'runtime');
const stateFile = path.join(runtimeDir, 'dev-app-products.json');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const stopWaitMs = 1200;
const mongoPort =
  process.env.APP_PRODUCTS_MONGODB_PORT?.trim() ||
  process.env.MONGODB_APP_PRODUCTS_PORT?.trim() ||
  process.env.MONGODB_PORT?.trim() ||
  '27020';
const appMongoUri = `mongodb://127.0.0.1:${mongoPort}/app`;
const productsMongoUri = `mongodb://127.0.0.1:${mongoPort}/products_local`;
const appPort = process.env.PORT?.trim() || '3000';
const appProductsMongoEnv = {
  APP_PRODUCTS_MONGODB_PORT: mongoPort,
  MONGODB_PORT: mongoPort,
  MONGODB_LOCAL_URI: appMongoUri,
  MONGODB_LOCAL_DB: 'app',
  MONGODB_ACTIVE_SOURCE_DEFAULT: 'local',
  PRODUCTS_MONGODB_URI: productsMongoUri,
  PRODUCTS_MONGODB_LOCAL_URI: productsMongoUri,
  PRODUCTS_MONGODB_DB: 'products_local',
  PRODUCTS_MONGODB_LOCAL_DB: 'products_local',
  PRODUCTS_MONGODB_ACTIVE_SOURCE_DEFAULT: 'local',
  OBSERVABILITY_FEDERATED_APPLICATION_IDS:
    process.env.OBSERVABILITY_FEDERATED_APPLICATION_IDS?.trim() || 'geminitestapp,stargater',
};

const getAppProductsEnv = () => {
  const env = {
    ...process.env,
    ...appProductsMongoEnv,
  };
  delete env.MONGODB_URI;
  delete env.MONGODB_DB;
  return env;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toPid = (value) => {
  const pid = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
};

const isPidRunning = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
};

const isTcpPortAvailable = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', (error) => {
      if (error?.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }
      resolve(true);
    });
    server.listen({ host: '127.0.0.1', port }, () => {
      server.close(() => resolve(true));
    });
  });

const assertAppPortAvailable = async () => {
  const portNumber = Number.parseInt(appPort, 10);
  if (!Number.isInteger(portNumber) || portNumber <= 0) return;
  if (await isTcpPortAvailable(portNumber)) return;

  throw new Error(
    [
      `Port ${appPort} is already in use, but no tracked dev:app-products process is running.`,
      'Stop the existing dev server, then run npm run dev:app-products:up again.',
      `For a temporary parallel server, run PORT=${portNumber + 1} npm run dev:app-products:up.`,
    ].join('\n')
  );
};

const readState = async () => {
  try {
    const raw = await fs.readFile(stateFile, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      devPid: toPid(parsed.devPid),
      supervisorPid: toPid(parsed.supervisorPid),
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : null,
    };
  } catch {
    return null;
  }
};

const writeState = async (state) => {
  await fs.mkdir(runtimeDir, { recursive: true });
  await fs.writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`);
};

const clearState = async () => {
  await fs.rm(stateFile, { force: true }).catch(() => undefined);
};

const runNpmScript = (script) => {
  const result = spawnSync(npmCommand, ['run', script], {
    cwd: repoRoot,
    env: getAppProductsEnv(),
    stdio: 'inherit',
  });
  if (result.status === 0) return;
  const suffix = result.signal ? `signal ${result.signal}` : `exit ${result.status ?? 'unknown'}`;
  throw new Error(`npm run ${script} failed (${suffix}).`);
};

const killPid = (pid, signal) => {
  if (!pid || !isPidRunning(pid)) return false;
  try {
    process.kill(pid, signal);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    throw error;
  }
};

const killProcessGroup = (pid, signal) => {
  if (!pid || !isPidRunning(pid)) return false;
  if (process.platform !== 'win32') {
    try {
      process.kill(-pid, signal);
      return true;
    } catch (error) {
      if (error?.code !== 'ESRCH') {
        return killPid(pid, signal);
      }
      return false;
    }
  }
  return killPid(pid, signal);
};

const terminateDevProcess = async ({ force }) => {
  const state = await readState();
  if (!state) {
    console.log('No tracked dev app process found.');
    return;
  }

  if (state.devPid && isPidRunning(state.devPid)) {
    const firstSignal = force ? 'SIGKILL' : 'SIGTERM';
    console.log(`Stopping dev app process group ${state.devPid} with ${firstSignal}.`);
    killProcessGroup(state.devPid, firstSignal);
    if (!force) {
      await sleep(stopWaitMs);
      if (isPidRunning(state.devPid)) {
        console.log(`Dev app process ${state.devPid} is still running; forcing SIGKILL.`);
        killProcessGroup(state.devPid, 'SIGKILL');
      }
    }
  } else {
    console.log('Tracked dev app process is not running.');
  }

  if (
    state.supervisorPid &&
    state.supervisorPid !== process.pid &&
    isPidRunning(state.supervisorPid)
  ) {
    const signal = force ? 'SIGKILL' : 'SIGTERM';
    console.log(`Stopping dev supervisor ${state.supervisorPid} with ${signal}.`);
    killPid(state.supervisorPid, signal);
  }

  await clearState();
};

const stopMongo = () => {
  runNpmScript('mongo:app-products:down');
};

const startMongo = () => {
  runNpmScript('mongo:app-products:up');
};

const printStatus = async () => {
  const state = await readState();
  console.log(
    JSON.stringify(
      {
        stateFile,
        devPid: state?.devPid ?? null,
        devRunning: state?.devPid ? isPidRunning(state.devPid) : false,
        supervisorPid: state?.supervisorPid ?? null,
        supervisorRunning: state?.supervisorPid ? isPidRunning(state.supervisorPid) : false,
        startedAt: state?.startedAt ?? null,
      },
      null,
      2
    )
  );
  runNpmScript('mongo:app-products:status');
};

let shuttingDown = false;

const shutdownSupervisor = async (child, reason, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[dev:app-products] Shutting down (${reason}).`);
  if (child.pid && isPidRunning(child.pid)) {
    killProcessGroup(child.pid, 'SIGTERM');
    await sleep(stopWaitMs);
    if (isPidRunning(child.pid)) killProcessGroup(child.pid, 'SIGKILL');
  }
  await clearState();
  stopMongo();
  process.exit(exitCode);
};

const startDev = async () => {
  const state = await readState();
  if (state?.devPid && isPidRunning(state.devPid)) {
    console.log(`Dev app is already running (pid ${state.devPid}).`);
    startMongo();
    return;
  }
  await assertAppPortAvailable();
  await clearState();
  startMongo();

  const child = spawn(npmCommand, ['run', 'dev'], {
    cwd: repoRoot,
    detached: true,
    env: getAppProductsEnv(),
    stdio: 'inherit',
  });

  await writeState({
    command: 'npm run dev',
    devPid: child.pid,
    supervisorPid: process.pid,
    startedAt: new Date().toISOString(),
  });

  console.log(`\n[dev:app-products] Dev app started (pid ${child.pid}).`);
  console.log('[dev:app-products] Press Ctrl+C or run npm run dev:app-products:kill to stop app + MongoDB.');

  process.on('SIGINT', () => {
    void shutdownSupervisor(child, 'SIGINT', 130);
  });
  process.on('SIGTERM', () => {
    void shutdownSupervisor(child, 'SIGTERM', 143);
  });

  child.on('exit', (code, signal) => {
    const exitCode = typeof code === 'number' ? code : signal ? 1 : 0;
    void shutdownSupervisor(child, `dev exited${signal ? ` by ${signal}` : ''}`, exitCode);
  });
};

const command = process.argv[2] ?? 'up';

switch (command) {
  case 'up':
    await startDev();
    break;
  case 'down':
    await terminateDevProcess({ force: false });
    stopMongo();
    break;
  case 'kill':
    await terminateDevProcess({ force: true });
    stopMongo();
    break;
  case 'status':
    await printStatus();
    break;
  default:
    throw new Error(`Unsupported command "${command}". Use up, down, kill, or status.`);
}
