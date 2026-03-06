import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const strictMode = args.has('--strict');
const includeE2E = args.has('--include-e2e');
const shouldWriteHistory = !args.has('--no-history');

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');
const MAX_OUTPUT_BYTES = 100_000;

const KANGUR_UNIT_TESTS = [
  '__tests__/features/kangur/learner-profile.page.test.tsx',
  '__tests__/features/kangur/lessons-focus-routing.test.tsx',
  '__tests__/features/kangur/kangur-feature-app.shell.test.tsx',
  '__tests__/features/kangur/kangur-admin-menu-toggle.test.tsx',
  'src/features/kangur/ui/services/profile.test.ts',
  'src/features/kangur/settings.test.ts',
];

const KANGUR_E2E_TESTS = [
  'e2e/features/kangur/kangur-profile.spec.ts',
  'e2e/features/kangur/kangur-game-quickstart.spec.ts',
];

const BASELINE_FILE_SET = [
  'src/features/kangur/ui/pages/Game.tsx',
  'src/features/kangur/ui/pages/Lessons.tsx',
  'src/features/kangur/ui/pages/LearnerProfile.tsx',
  'src/features/kangur/ui/components/KangurGame.tsx',
  'src/features/kangur/ui/components/KangurIllustrations.jsx',
  'src/features/kangur/ui/services/kangur-questions-data.js',
];

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0ms';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const sec = ms / 1000;
  if (sec < 60) {
    return `${sec.toFixed(1)}s`;
  }
  return `${(sec / 60).toFixed(1)}m`;
};

const runCommand = ({ command, commandArgs, label, env = {} }) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, commandArgs, {
      cwd: root,
      env: {
        ...process.env,
        ...env,
        FORCE_COLOR: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    const append = (chunk) => {
      output += chunk.toString();
      if (output.length > MAX_OUTPUT_BYTES) {
        output = output.slice(-MAX_OUTPUT_BYTES);
      }
    };

    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    child.on('error', (error) => {
      resolve({
        id: label,
        command: [command, ...commandArgs].join(' '),
        status: 'fail',
        exitCode: null,
        durationMs: Date.now() - startedAt,
        output: `${output}\n${error.stack ?? String(error)}`.trim(),
      });
    });

    child.on('close', (exitCode) => {
      resolve({
        id: label,
        command: [command, ...commandArgs].join(' '),
        status: exitCode === 0 ? 'pass' : 'fail',
        exitCode,
        durationMs: Date.now() - startedAt,
        output: output.trim(),
      });
    });
  });

const toFileMetrics = async (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  const lines = raw.split('\n').length;
  const bytes = Buffer.byteLength(raw, 'utf8');
  return {
    path: relativePath,
    lines,
    bytes,
  };
};

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Kangur Performance Baseline');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Execution Summary');
  lines.push('');
  lines.push(`- Unit test suite status: ${payload.unit.status.toUpperCase()}`);
  lines.push(`- Unit test suite duration: ${formatDuration(payload.unit.durationMs)}`);
  if (payload.e2e) {
    lines.push(`- E2E suite status: ${payload.e2e.status.toUpperCase()}`);
    lines.push(`- E2E suite duration: ${formatDuration(payload.e2e.durationMs)}`);
  } else {
    lines.push('- E2E suite: skipped');
  }
  lines.push('');
  lines.push('## Bundle Risk Snapshot');
  lines.push('');
  lines.push('| File | Lines | Bytes |');
  lines.push('| --- | ---: | ---: |');
  for (const metric of payload.bundleRisk.files) {
    lines.push(`| \`${metric.path}\` | ${metric.lines} | ${metric.bytes} |`);
  }
  lines.push('');
  lines.push(`- Total bytes (tracked files): ${payload.bundleRisk.totalBytes}`);
  lines.push(`- Total lines (tracked files): ${payload.bundleRisk.totalLines}`);
  lines.push('');
  lines.push('## Commands');
  lines.push('');
  lines.push(`- Unit: \`${payload.unit.command}\``);
  if (payload.e2e) {
    lines.push(`- E2E: \`${payload.e2e.command}\``);
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This baseline tracks execution time and static file size hotspots for the Kangur feature.');
  lines.push('- Use it after each optimization session to validate improvements and prevent regressions.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const unit = await runCommand({
    command: 'npx',
    commandArgs: ['vitest', 'run', ...KANGUR_UNIT_TESTS],
    label: 'kangur-unit',
  });

  let e2e = null;
  if (includeE2E) {
    e2e = await runCommand({
      command: 'npx',
      commandArgs: ['playwright', 'test', ...KANGUR_E2E_TESTS, '--workers=1'],
      label: 'kangur-e2e',
      env: {
        ALLOW_UNSUPPORTED_NODE_DEV: '1',
        SKIP_PORTABLE_PATH_BOOTSTRAP: '1',
      },
    });
  }

  const fileMetrics = await Promise.all(BASELINE_FILE_SET.map((item) => toFileMetrics(item)));
  const bundleRisk = {
    files: [...fileMetrics].sort((left, right) => right.bytes - left.bytes),
    totalBytes: fileMetrics.reduce((sum, item) => sum + item.bytes, 0),
    totalLines: fileMetrics.reduce((sum, item) => sum + item.lines, 0),
  };

  const summary = {
    failedRuns: [unit, e2e].filter((runItem) => runItem && runItem.status === 'fail').length,
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    strictMode,
    includeE2E,
    unit,
    e2e,
    bundleRisk,
    summary,
  };

  await fs.mkdir(outDir, { recursive: true });
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');

  const latestJsonPath = path.join(outDir, 'kangur-performance-latest.json');
  const latestMdPath = path.join(outDir, 'kangur-performance-latest.md');
  const historicalJsonPath = path.join(outDir, `kangur-performance-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `kangur-performance-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.writeFile(latestMdPath, toMarkdown(payload), 'utf8');

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.writeFile(historicalMdPath, toMarkdown(payload), 'utf8');
  }

  console.log(
    `[kangur-perf] unit=${unit.status.toUpperCase()} (${formatDuration(unit.durationMs)}) e2e=${e2e ? `${e2e.status.toUpperCase()} (${formatDuration(e2e.durationMs)})` : 'SKIPPED'}`
  );
  console.log(`Wrote ${path.relative(root, latestJsonPath)}`);
  console.log(`Wrote ${path.relative(root, latestMdPath)}`);
  if (shouldWriteHistory) {
    console.log(`Wrote ${path.relative(root, historicalJsonPath)}`);
    console.log(`Wrote ${path.relative(root, historicalMdPath)}`);
  }

  if (strictMode && summary.failedRuns > 0) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[kangur-perf] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
