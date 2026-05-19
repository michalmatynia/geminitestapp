#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const runtimeDir = path.join(repoRoot, 'mongo', 'runtime');
const stateFile = path.join(runtimeDir, 'dev-database-engine.json');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const stopWaitMs = 1200;

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
    env: process.env,
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
    console.log('No tracked database-engine dev process found.');
    return;
  }

  if (state.devPid && isPidRunning(state.devPid)) {
    const firstSignal = force ? 'SIGKILL' : 'SIGTERM';
    console.log(`Stopping database-engine dev process group ${state.devPid} with ${firstSignal}.`);
    killProcessGroup(state.devPid, firstSignal);
    if (!force) {
      await sleep(stopWaitMs);
      if (isPidRunning(state.devPid)) {
        console.log(`Database-engine dev process ${state.devPid} is still running; forcing SIGKILL.`);
        killProcessGroup(state.devPid, 'SIGKILL');
      }
    }
  } else {
    console.log('Tracked database-engine dev process is not running.');
  }

  if (
    state.supervisorPid &&
    state.supervisorPid !== process.pid &&
    isPidRunning(state.supervisorPid)
  ) {
    const signal = force ? 'SIGKILL' : 'SIGTERM';
    console.log(`Stopping database-engine dev supervisor ${state.supervisorPid} with ${signal}.`);
    killPid(state.supervisorPid, signal);
  }

  await clearState();
};

const stopMongo = () => {
  runNpmScript('db:local:stop');
};

const startMongo = () => {
  runNpmScript('db:local:start');
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
  runNpmScript('db:local:status');
};

let shuttingDown = false;

const shutdownSupervisor = async (child, reason, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[dev:database-engine] Shutting down (${reason}).`);
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
    console.log(`Database-engine dev app is already running (pid ${state.devPid}).`);
    startMongo();
    return;
  }
  await clearState();
  startMongo();

  const child = spawn(npmCommand, ['run', 'dev', '-w', '@app/database-engine-web'], {
    cwd: repoRoot,
    detached: true,
    env: process.env,
    stdio: 'inherit',
  });

  await writeState({
    command: 'npm run dev -w @app/database-engine-web',
    devPid: child.pid,
    supervisorPid: process.pid,
    startedAt: new Date().toISOString(),
  });

  console.log(`\n[dev:database-engine] Database-engine dev app started (pid ${child.pid}).`);
  console.log('[dev:database-engine] Press Ctrl+C or run npm run dev:database-engine:kill to stop app + MongoDB.');

  process.on('SIGINT', () => {
    void shutdownSupervisor(child, 'SIGINT', 130);
  });
  process.on('SIGTERM', () => {
    void shutdownSupervisor(child, 'SIGTERM', 143);
  });

  child.on('exit', (code, signal) => {
    const exitCode = typeof code === 'number' ? code : signal ? 1 : 0;
    void shutdownSupervisor(child, `database-engine dev exited${signal ? ` by ${signal}` : ''}`, exitCode);
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
