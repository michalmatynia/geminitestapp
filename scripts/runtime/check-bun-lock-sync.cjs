const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = process.cwd();
const bunLockPath = path.join(root, 'bun.lock');
const packageJsonPath = path.join(root, 'package.json');
const packageLockPath = path.join(root, 'package-lock.json');
const bunfigPath = path.join(root, 'bunfig.toml');

const originalLock = fs.existsSync(bunLockPath) ? fs.readFileSync(bunLockPath, 'utf8') : null;

if (originalLock === null) {
  console.error('[runtime] bun.lock is missing. Run "bun run lock:bun:sync" and commit bun.lock.');
  process.exit(1);
}

if (!fs.existsSync(packageJsonPath) || !fs.existsSync(packageLockPath)) {
  console.error('[runtime] package.json and package-lock.json are required for the Bun lock sync check.');
  process.exit(1);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bun-lock-sync-'));
const cleanupTempRoot = () => fs.rmSync(tempRoot, { recursive: true, force: true });

fs.copyFileSync(packageJsonPath, path.join(tempRoot, 'package.json'));
fs.copyFileSync(packageLockPath, path.join(tempRoot, 'package-lock.json'));
if (fs.existsSync(bunfigPath)) {
  fs.copyFileSync(bunfigPath, path.join(tempRoot, 'bunfig.toml'));
}

const result = spawnSync('bun', ['pm', 'migrate', '--force'], {
  cwd: tempRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (result.error) {
  cleanupTempRoot();
  console.error('[runtime] Failed to execute "bun pm migrate --force".');
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  cleanupTempRoot();
  console.error('[runtime] Bun lock sync check failed while regenerating bun.lock.');
  if (typeof result.stderr === 'string' && result.stderr.trim().length > 0) {
    console.error(result.stderr.trim());
  }
  if (typeof result.stdout === 'string' && result.stdout.trim().length > 0) {
    console.error(result.stdout.trim());
  }
  process.exit(result.status ?? 1);
}

const regeneratedLockPath = path.join(tempRoot, 'bun.lock');
const regeneratedLock = fs.existsSync(regeneratedLockPath)
  ? fs.readFileSync(regeneratedLockPath, 'utf8')
  : null;
cleanupTempRoot();

if (originalLock !== regeneratedLock) {
  console.error(
    '[runtime] bun.lock is out of sync with package-lock.json. Run "bun run lock:bun:sync" and commit bun.lock.'
  );
  process.exit(1);
}

console.log('[runtime] bun.lock matches package-lock.json.');
