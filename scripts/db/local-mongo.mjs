import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const dataDir = path.resolve(repoRoot, process.env.MONGODB_DATA_DIR?.trim() || path.join('mongo', 'local-data'));
const runtimeDir = path.resolve(repoRoot, process.env.MONGODB_RUNTIME_DIR?.trim() || path.join('mongo', 'runtime'));
const pidFile = path.join(runtimeDir, 'mongod.pid');
const logFile = path.join(runtimeDir, 'mongod.log');
const port = process.env['MONGODB_PORT']?.trim() || '27017';
const bindIp = '127.0.0.1';
const shutdownWaitMs = 10000;
const shutdownPollMs = 100;

const command = process.argv[2] || 'status';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readPid = async () => {
  try {
    const raw = await fs.readFile(pidFile, 'utf8');
    const pid = Number.parseInt(raw.trim(), 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
};

const isPidRunning = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'EPERM') return true;
    return false;
  }
};

const waitForPidExit = async (pid, timeoutMs) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!isPidRunning(pid)) return true;
    await sleep(shutdownPollMs);
  }
  return !isPidRunning(pid);
};

const signalPid = (pid, signal) => {
  try {
    process.kill(pid, signal);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    throw error;
  }
};

const ensureDirs = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(runtimeDir, { recursive: true });
};

const removeStalePidFile = async (pid) => {
  if (!pid || isPidRunning(pid)) return;
  await fs.rm(pidFile, { force: true }).catch(() => undefined);
};

const getReachableMongoDbPath = () => {
  try {
    const raw = execFileSync(
      'mongosh',
      [
        '--quiet',
        '--host',
        bindIp,
        '--port',
        port,
        '--eval',
        'const result = db.adminCommand({ getCmdLineOpts: 1 }); print(result?.parsed?.storage?.dbPath || "");',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }
    );
    return raw.trim() || null;
  } catch {
    return null;
  }
};

const isExpectedDbPath = (activeDbPath) =>
  typeof activeDbPath === 'string' && path.resolve(activeDbPath) === dataDir;

const printStatus = async () => {
  const pid = await readPid();
  const running = pid ? isPidRunning(pid) : false;
  const activeDbPath = getReachableMongoDbPath();
  console.log(
    JSON.stringify(
      {
        port: Number.parseInt(port, 10),
        dataDir,
        runtimeDir,
        pid,
        running,
        reachable: activeDbPath !== null,
        activeDbPath,
        logFile,
      },
      null,
      2
    )
  );
};

const startMongo = async () => {
  await ensureDirs();
  const pid = await readPid();
  if (pid && isPidRunning(pid)) {
    console.log(`MongoDB already running on port ${port} (pid ${pid}).`);
    return;
  }
  await removeStalePidFile(pid);

  const activeDbPath = getReachableMongoDbPath();
  if (isExpectedDbPath(activeDbPath)) {
    console.log(`MongoDB already running on ${bindIp}:${port} with ${dataDir}.`);
    return;
  }
  if (activeDbPath) {
    throw new Error(
      `MongoDB is already reachable on ${bindIp}:${port}, but it uses ${activeDbPath}. ` +
        `Expected ${dataDir}. Stop the other MongoDB process or choose a different MONGODB_PORT.`
    );
  }

  try {
    execFileSync(
      'mongod',
      [
        '--dbpath',
        dataDir,
        '--bind_ip',
        bindIp,
        '--port',
        port,
        '--fork',
        '--logpath',
        logFile,
        '--pidfilepath',
        pidFile,
      ],
      { stdio: 'inherit' }
    );
  } catch (error) {
    throw new Error(`Failed to start local MongoDB at ${dataDir}: ${String(error)}`);
  }

  const nextPid = await readPid();
  console.log(`MongoDB started on port ${port}${nextPid ? ` (pid ${nextPid})` : ''}.`);
};

const stopMongo = async () => {
  const pid = await readPid();
  if (!pid || !isPidRunning(pid)) {
    await fs.rm(pidFile, { force: true }).catch(() => undefined);
    console.log('No locally managed MongoDB process is running.');
    return;
  }

  try {
    signalPid(pid, 'SIGTERM');
    if (!(await waitForPidExit(pid, shutdownWaitMs))) {
      console.log(`MongoDB process ${pid} did not exit after SIGTERM; forcing SIGKILL.`);
      signalPid(pid, 'SIGKILL');
      if (!(await waitForPidExit(pid, 2000))) {
        throw new Error(`MongoDB process ${pid} is still running after SIGKILL.`);
      }
    }
  } catch (error) {
    throw new Error(`Failed to stop local MongoDB from ${dataDir}: ${String(error)}`);
  }

  await fs.rm(pidFile, { force: true }).catch(() => undefined);
  console.log(`MongoDB stopped (pid ${pid}).`);
};

switch (command) {
  case 'up':
    await startMongo();
    break;
  case 'down':
    await stopMongo();
    break;
  case 'status':
    await printStatus();
    break;
  default:
    throw new Error(`Unsupported command "${command}". Use up, down, or status.`);
}
