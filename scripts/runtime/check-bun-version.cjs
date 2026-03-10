const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const versionFile = path.resolve(__dirname, '..', '..', '.bun-version');

let expectedVersion = '';
try {
  expectedVersion = fs.readFileSync(versionFile, 'utf8').trim();
} catch (error) {
  console.error(`[runtime] Unable to read Bun version file at ${versionFile}.`);
  if (error instanceof Error && error.message) {
    console.error(error.message);
  }
  process.exit(1);
}

if (expectedVersion.length === 0) {
  console.error('[runtime] .bun-version is empty.');
  process.exit(1);
}

let actualVersion = '';
try {
  actualVersion = execFileSync('bun', ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
} catch (error) {
  console.error('[runtime] Bun is not available on PATH.');
  if (error && typeof error === 'object' && 'stderr' in error && typeof error.stderr === 'string') {
    const stderr = error.stderr.trim();
    if (stderr.length > 0) {
      console.error(stderr);
    }
  }
  process.exit(1);
}

if (actualVersion !== expectedVersion) {
  console.error(
    `[runtime] Bun ${actualVersion} does not match the repo pin ${expectedVersion} from .bun-version.`
  );
  process.exit(1);
}

console.log(`[runtime] Bun ${actualVersion} matches .bun-version.`);
