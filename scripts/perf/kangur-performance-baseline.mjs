import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  acquireRuntimeLease,
  buildBrokeredPlaywrightEnv,
  resolveNpxExecutable,
  resolvePlaywrightRunArtifacts,
  resolveRuntimeAgentId,
  stopBrokerRuntimeLease,
} from '../testing/lib/runtime-broker.mjs';
import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';

const args = new Set(process.argv.slice(2));
const strictMode = args.has('--strict');
const includeE2E = args.has('--include-e2e');
const shouldWriteHistory = !args.has('--no-history');
const allowInfraE2EFail = args.has('--allow-infra-e2e-fail');

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');
const MAX_OUTPUT_BYTES = 100_000;
const PLAYWRIGHT_BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] || 'http://127.0.0.1:3000';
const PLAYWRIGHT_HOST =
  process.env['HOST'] || (() => {
    try {
      return new URL(PLAYWRIGHT_BASE_URL).hostname;
    } catch {
      return 'localhost';
    }
  })();
const PLAYWRIGHT_AGENT_ID = resolveRuntimeAgentId({ env: process.env });
const shouldStopPlaywrightRuntime = process.env['PLAYWRIGHT_RUNTIME_KEEP_ALIVE'] !== 'true';

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
  'src/features/kangur/ui/components/KangurIllustrations.ts',
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

const isInfraE2EFailure = (output) => {
  const value = String(output || '').toLowerCase();
  return (
    value.includes('machportrendezvousserver') ||
    value.includes('bootstrap_check_in org.chromium.chromium') ||
    value.includes('listen eperm: operation not permitted 0.0.0.0:3000') ||
    value.includes('process from config.webserver exited early') ||
    value.includes('target page, context or browser has been closed') ||
    value.includes('err_connection_refused') ||
    value.includes('econnrefused')
  );
};

const commandToText = (command, commandArgs) => [command, ...commandArgs].join(' ');

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
        command: commandToText(command, commandArgs),
        status: 'fail',
        exitCode: null,
        durationMs: Date.now() - startedAt,
        output: `${output}\n${error.stack ?? String(error)}`.trim(),
      });
    });

    child.on('close', (exitCode) => {
      resolve({
        id: label,
        command: commandToText(command, commandArgs),
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
  let playwrightRuntime = null;
  try {
    const unit = await runCommand({
      command: 'npx',
      commandArgs: ['vitest', 'run', ...KANGUR_UNIT_TESTS],
      label: 'kangur-unit',
    });

    let e2e = null;
    if (includeE2E) {
      const e2eArgs = ['playwright', 'test', ...KANGUR_E2E_TESTS, '--workers=1'];
      playwrightRuntime = await acquireRuntimeLease({
        rootDir: root,
        appId: 'web',
        mode: 'dev',
        agentId: PLAYWRIGHT_AGENT_ID,
        host: PLAYWRIGHT_HOST,
        env: process.env,
      });
      const artifacts = resolvePlaywrightRunArtifacts({
        rootDir: root,
        appId: 'web',
        agentId: playwrightRuntime.agentId ?? PLAYWRIGHT_AGENT_ID,
        runId: `${process.env['TEST_RUN_ID'] ?? 'kangur-perf'}-e2e`,
        env: process.env,
      });

      const e2eEnv = {
        SKIP_PORTABLE_PATH_BOOTSTRAP: '1',
        ...buildBrokeredPlaywrightEnv({
          env: process.env,
          host: playwrightRuntime.host,
          baseUrl: playwrightRuntime.baseUrl,
          artifacts,
          preferredBrowserNodeBinDir: playwrightRuntime.preferredBrowserNodeBinDir,
          agentId: playwrightRuntime.agentId ?? PLAYWRIGHT_AGENT_ID,
          leaseKey: playwrightRuntime.leaseKey,
          distDir: playwrightRuntime.distDir,
        }),
      };

      console.log(
        `[kangur-perf] e2e-runtime=${playwrightRuntime.source}${playwrightRuntime.reused ? ':reused' : ':started'} host=${playwrightRuntime.host} baseURL=${playwrightRuntime.baseUrl} agent=${playwrightRuntime.agentId}`
      );

      e2e = await runCommand({
        command: resolveNpxExecutable({
          preferredBrowserNodeBinDir: playwrightRuntime.preferredBrowserNodeBinDir,
        }),
        commandArgs: e2eArgs,
        label: 'kangur-e2e',
        env: e2eEnv,
      });

      if (allowInfraE2EFail && e2e.status === 'fail' && isInfraE2EFailure(e2e.output)) {
        e2e.status = 'infra_fail';
      }
    }

    const fileMetrics = await Promise.all(BASELINE_FILE_SET.map((item) => toFileMetrics(item)));
    const bundleRisk = {
      files: [...fileMetrics].sort((left, right) => right.bytes - left.bytes),
      totalBytes: fileMetrics.reduce((sum, item) => sum + item.bytes, 0),
      totalLines: fileMetrics.reduce((sum, item) => sum + item.lines, 0),
    };

    const summary = {
      failedRuns: [unit, e2e].filter((runItem) => runItem && runItem.status === 'fail').length,
      infraFailures: [unit, e2e].filter((runItem) => runItem && runItem.status === 'infra_fail').length,
    };

    const payload = {
      generatedAt: new Date().toISOString(),
      strictMode,
      includeE2E,
      allowInfraE2EFail,
      runtime: playwrightRuntime
        ? {
            source: playwrightRuntime.source,
            reused: playwrightRuntime.reused,
            baseUrl: playwrightRuntime.baseUrl,
            agentId: playwrightRuntime.agentId,
            leaseKey: playwrightRuntime.leaseKey ?? null,
          }
        : null,
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
    await writeMetricsMarkdownFile({
      root,
      targetPath: latestMdPath,
      content: toMarkdown(payload),
    });

    if (shouldWriteHistory) {
      await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      await writeMetricsMarkdownFile({
        root,
        targetPath: historicalMdPath,
        content: toMarkdown(payload),
      });
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
      process.exitCode = 1;
    }
  } finally {
    if (shouldStopPlaywrightRuntime && playwrightRuntime?.managed && playwrightRuntime.leaseFilePath) {
      await stopBrokerRuntimeLease({
        lease: playwrightRuntime,
        leaseFilePath: playwrightRuntime.leaseFilePath,
      });
    }
  }
};

run().catch((error) => {
  console.error('[kangur-perf] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
