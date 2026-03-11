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

const normalizeRecord = (value) =>
  Object.fromEntries(
    Object.entries(value && typeof value === 'object' ? value : {})
      .sort(([left], [right]) => left.localeCompare(right))
  );

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const parseLooseJson = (value) => {
  try {
    return JSON.parse(value.replace(/,\s*([}\]])/g, '$1'));
  } catch {
    return null;
  }
};

const formatRecordDiff = (expected, actual) => {
  const keys = Array.from(new Set([...Object.keys(expected), ...Object.keys(actual)])).sort((left, right) =>
    left.localeCompare(right)
  );
  return keys
    .filter((key) => expected[key] !== actual[key])
    .slice(0, 10)
    .map((key) => {
      const expectedValue = key in expected ? expected[key] : '<missing>';
      const actualValue = key in actual ? actual[key] : '<missing>';
      return `  - ${key}: expected ${expectedValue}, found ${actualValue}`;
    });
};

const runKnownResolverFallbackCheck = () => {
  const packageJson = readJson(packageJsonPath);
  const packageLock = readJson(packageLockPath);
  const packageLockRoot = packageLock.packages?.[''] ?? {};
  const parsedBunLock = parseLooseJson(originalLock);
  const bunWorkspace = parsedBunLock?.workspaces?.[''] ?? null;

  const packageJsonDependencies = normalizeRecord(packageJson.dependencies);
  const packageJsonDevDependencies = normalizeRecord(packageJson.devDependencies);
  const packageLockDependencies = normalizeRecord(packageLockRoot.dependencies);
  const packageLockDevDependencies = normalizeRecord(packageLockRoot.devDependencies);
  const bunLockDependencies = normalizeRecord(bunWorkspace?.dependencies);
  const bunLockDevDependencies = normalizeRecord(bunWorkspace?.devDependencies);

  const errors = [];

  if (!parsedBunLock || !bunWorkspace || typeof bunWorkspace !== 'object') {
    errors.push('[runtime] bun.lock fallback parsing failed. The root workspace contract could not be read.');
    return { ok: false, errors };
  }

  if (JSON.stringify(packageJsonDependencies) !== JSON.stringify(packageLockDependencies)) {
    errors.push('[runtime] package.json dependencies do not match package-lock.json root dependencies.');
    errors.push(...formatRecordDiff(packageLockDependencies, packageJsonDependencies));
  }

  if (JSON.stringify(packageJsonDevDependencies) !== JSON.stringify(packageLockDevDependencies)) {
    errors.push('[runtime] package.json devDependencies do not match package-lock.json root devDependencies.');
    errors.push(...formatRecordDiff(packageLockDevDependencies, packageJsonDevDependencies));
  }

  if (JSON.stringify(packageLockDependencies) !== JSON.stringify(bunLockDependencies)) {
    errors.push('[runtime] bun.lock workspace.dependencies do not match package-lock.json root dependencies.');
    errors.push(...formatRecordDiff(packageLockDependencies, bunLockDependencies));
  }

  if (JSON.stringify(packageLockDevDependencies) !== JSON.stringify(bunLockDevDependencies)) {
    errors.push('[runtime] bun.lock workspace.devDependencies do not match package-lock.json root devDependencies.');
    errors.push(...formatRecordDiff(packageLockDevDependencies, bunLockDevDependencies));
  }

  return {
    ok: errors.length === 0,
    errors,
  };
};

const isKnownResolverFailure = (result) => {
  const stderr = typeof result.stderr === 'string' ? result.stderr : '';
  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  const combined = `${stderr}\n${stdout}`;
  return (
    combined.includes("Could not resolve package '@napi-rs/wasm-runtime' in lockfile during migration") &&
    combined.includes('NotAllPackagesGotResolved')
  );
};

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
  if (isKnownResolverFailure(result)) {
    cleanupTempRoot();
    const fallback = runKnownResolverFallbackCheck();
    if (fallback.ok) {
      console.warn(
        '[runtime] Bun lock sync regeneration hit a known Bun resolver issue. Falling back to root manifest parity validation.'
      );
      console.log('[runtime] bun.lock matches package-lock.json via fallback manifest parity check.');
      process.exit(0);
    }

    console.error('[runtime] Bun lock sync fallback failed after Bun regeneration hit a known resolver issue.');
    for (const error of fallback.errors) {
      console.error(error);
    }
    process.exit(1);
  }

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
