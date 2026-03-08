import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const baselineScript = path.join('scripts', 'perf', 'kangur-performance-baseline.mjs');
const passthroughArgs = args.filter((arg) => arg !== '--dry-run');

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const resolveChromiumExecutablePath = async () => {
  const explicitPath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']?.trim();
  if (explicitPath && (await fileExists(explicitPath))) {
    return explicitPath;
  }

  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
};

const run = async () => {
  const nodeMajor = Number(process.versions.node.split('.')[0] ?? '0');
  if (nodeMajor !== 22) {
    console.warn(
      `[kangur-perf] Node ${process.version} detected. Node 22 LTS is recommended for stable Next.js dev/e2e runs.`
    );
  }

  const baseUrl = process.env['PLAYWRIGHT_BASE_URL']?.trim() || null;
  const chromiumExecutablePath = await resolveChromiumExecutablePath();

  const command = process.execPath;
  const commandArgs = [
    baselineScript,
    '--strict',
    '--include-e2e',
    '--allow-infra-e2e-fail',
    '--no-history',
    ...passthroughArgs,
  ];

  const env = {
    ...process.env,
    PLAYWRIGHT_RUNTIME_KEEP_ALIVE: process.env['PLAYWRIGHT_RUNTIME_KEEP_ALIVE'] || 'false',
  };

  if (baseUrl) {
    env['PLAYWRIGHT_BASE_URL'] = baseUrl;
  }

  if (chromiumExecutablePath) {
    env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] = chromiumExecutablePath;
  }

  console.log(`[kangur-perf] baseURL=${baseUrl ?? 'broker-managed'}`);
  if (chromiumExecutablePath) {
    console.log(`[kangur-perf] browser=${chromiumExecutablePath}`);
  } else {
    console.log('[kangur-perf] browser=playwright-default');
  }

  if (dryRun) {
    console.log(`[kangur-perf] dry-run command: ${command} ${commandArgs.join(' ')}`);
    process.exit(0);
  }

  const child = spawn(command, commandArgs, {
    cwd: root,
    env,
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    console.error('[kangur-perf] failed to launch runner:', error);
    process.exit(1);
  });

  child.on('close', (code) => {
    process.exit(code ?? 1);
  });
};

run().catch((error) => {
  console.error('[kangur-perf] unexpected error:', error);
  process.exit(1);
});
