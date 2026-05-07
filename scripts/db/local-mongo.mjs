import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const dataDir = path.resolve(repoRoot, process.env.MONGODB_DATA_DIR?.trim() || path.join('mongo', 'local-data'));
const runtimeDir = path.resolve(repoRoot, process.env.MONGODB_RUNTIME_DIR?.trim() || path.join('mongo', 'runtime'));
const pidFile = path.join(runtimeDir, 'mongod.pid');
const logFile = path.join(runtimeDir, 'mongod.log');
const port = process.env['MONGODB_PORT']?.trim() || '27017';

const command = process.argv[2] || 'status';

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

const ensureDirs = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(runtimeDir, { recursive: true });
};

const printStatus = async () => {
  const pid = await readPid();
  const running = pid ? isPidRunning(pid) : false;
  console.log(
    JSON.stringify(
      {
        port: Number.parseInt(port, 10),
        dataDir,
        runtimeDir,
        pid,
        running,
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

  try {
    execFileSync(
      'mongod',
      [
        '--dbpath',
        dataDir,
        '--bind_ip',
        '127.0.0.1',
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
    console.log('MongoDB is not running.');
    return;
  }

  try {
    execFileSync(
      'mongod',
      ['--dbpath', dataDir, '--shutdown', '--pidfilepath', pidFile],
      { stdio: 'inherit' }
    );
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
