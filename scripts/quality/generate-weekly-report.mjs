import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import { collectMetrics } from '../architecture/lib-metrics.mjs';

const execFile = promisify(execFileCallback);

const args = new Set(process.argv.slice(2));
const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');

const includeE2E = args.has('--include-e2e');
const strictMode = args.has('--strict');
const shouldWriteHistory = !args.has('--ci') && !args.has('--no-history');

const MAX_OUTPUT_BYTES = 160_000;

const criticalFlows = [
  {
    id: 'auth-session',
    name: 'Authentication + Session Bootstrap',
    kpi: 'Successful sign-in completion rate',
    target: '>= 99.5%',
    scope: 'src/features/auth + app entry routes',
  },
  {
    id: 'products-core-crud',
    name: 'Products CRUD + Listing Refresh',
    kpi: 'Create/edit success rate without retries',
    target: '>= 99.0%',
    scope: 'src/features/products + products API routes',
  },
  {
    id: 'image-studio-generate',
    name: 'Image Studio Generate + Preview',
    kpi: 'Generation completion under timeout budget',
    target: '>= 98.0%',
    scope: 'src/features/ai/image-studio + runtime APIs',
  },
  {
    id: 'ai-paths-runtime',
    name: 'AI Paths Run Execution',
    kpi: 'Run completion without fallback/error path',
    target: '>= 98.5%',
    scope: 'src/features/ai/ai-paths + shared ai-path runtime',
  },
  {
    id: 'case-resolver-capture',
    name: 'Case Resolver OCR + Capture Mapping',
    kpi: 'Queue-to-review completion without manual recovery',
    target: '>= 98.0%',
    scope: 'src/features/case-resolver + capture APIs',
  },
];

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) {
    return 'n/a';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = seconds / 60;
  return `${minutes.toFixed(1)}m`;
};

const truncateOutput = (value) => {
  if (!value) {
    return '';
  }
  if (value.length <= MAX_OUTPUT_BYTES) {
    return value;
  }
  return value.slice(-MAX_OUTPUT_BYTES);
};

const runCommandCheck = ({ id, label, command, commandArgs, timeoutMs, enabled = true }) => {
  if (!enabled) {
    return Promise.resolve({
      id,
      label,
      command: [command, ...commandArgs].join(' '),
      status: 'skipped',
      exitCode: null,
      signal: null,
      durationMs: 0,
      output: 'Skipped by configuration.',
    });
  }

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, commandArgs, {
      cwd: root,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    let completed = false;
    let timedOut = false;

    const append = (chunk) => {
      output += chunk.toString();
      if (output.length > MAX_OUTPUT_BYTES) {
        output = output.slice(-MAX_OUTPUT_BYTES);
      }
    };

    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!completed) {
          child.kill('SIGKILL');
        }
      }, 5000);
    }, timeoutMs);

    child.on('error', (error) => {
      completed = true;
      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;
      resolve({
        id,
        label,
        command: [command, ...commandArgs].join(' '),
        status: 'fail',
        exitCode: null,
        signal: null,
        durationMs,
        output: truncateOutput(`${output}\n${error.stack ?? String(error)}`.trim()),
      });
    });

    child.on('close', (exitCode, signal) => {
      completed = true;
      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;
      const status = timedOut ? 'timeout' : exitCode === 0 ? 'pass' : 'fail';
      resolve({
        id,
        label,
        command: [command, ...commandArgs].join(' '),
        status,
        exitCode,
        signal,
        durationMs,
        output: truncateOutput(output.trim()),
      });
    });
  });
};

const parseScannerSummary = async (scriptName) => {
  try {
    const { stdout } = await execFile(
      'node',
      [
        scriptName,
        '--ci',
        '--no-history',
        '--no-write',
        '--summary-json',
      ],
      {
        cwd: root,
        maxBuffer: 8 * 1024 * 1024,
      }
    );

    const parsed = JSON.parse(stdout);
    const summary = parsed?.summary;
    if (!summary || typeof summary !== 'object') {
      throw new Error(`${scriptName} summary is missing.`);
    }

    return {
      ok: true,
      summary,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      summary: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const getPassRate = (check) => {
  if (!check) {
    return null;
  }
  if (check.status === 'skipped') {
    return null;
  }
  return check.status === 'pass' ? 100 : 0;
};

const toMarkdown = (report) => {
  const lines = [];
  lines.push('# Weekly Quality Report');
  lines.push('');
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Node: ${report.nodeVersion}`);
  lines.push('');
  lines.push('## Quality Check Summary');
  lines.push('');
  lines.push(`- Total checks: ${report.summary.totalChecks}`);
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Failed: ${report.summary.failed}`);
  lines.push(`- Timed out: ${report.summary.timedOut}`);
  lines.push(`- Skipped: ${report.summary.skipped}`);
  lines.push('');
  lines.push('## Baseline Status');
  lines.push('');
  lines.push(`- Build pass rate: ${report.passRates.build ?? 'n/a'}%`);
  lines.push(`- Lint pass rate: ${report.passRates.lint ?? 'n/a'}%`);
  lines.push(`- Typecheck pass rate: ${report.passRates.typecheck ?? 'n/a'}%`);
  lines.push(`- Unit test pass rate: ${report.passRates.unit ?? 'n/a'}%`);
  lines.push(`- E2E test pass rate: ${report.passRates.e2e ?? 'n/a'}%`);
  lines.push('');
  if (!includeE2E) {
    lines.push('E2E tests were skipped in this run. Use `--include-e2e` for full end-to-end baseline.');
    lines.push('');
  }
  lines.push('## Check Details');
  lines.push('');
  lines.push('| Check | Status | Duration | Exit | Command |');
  lines.push('| --- | --- | ---: | ---: | --- |');
  for (const check of report.checks) {
    const exit = check.exitCode === null ? '-' : String(check.exitCode);
    lines.push(
      `| ${check.label} | ${check.status.toUpperCase()} | ${formatDuration(check.durationMs)} | ${exit} | \`${check.command}\` |`
    );
  }
  lines.push('');

  lines.push('## Guardrail Snapshot');
  lines.push('');
  if (report.propDrilling.ok && report.uiConsolidation.ok) {
    lines.push(
      `- Prop forwarding components: ${Number(report.propDrilling.summary.componentsWithForwarding ?? 0)}`
    );
    lines.push(
      `- Prop-drilling depth >=4 chains: ${Number(report.propDrilling.summary.highPriorityChainCount ?? 0)}`
    );
    lines.push(
      `- UI opportunities: ${Number(report.uiConsolidation.summary.totalOpportunities ?? 0)}`
    );
    lines.push(
      `- UI high-priority opportunities: ${Number(report.uiConsolidation.summary.highPriorityCount ?? 0)}`
    );
    lines.push(
      `- Raw UI clusters: duplicate=${Number(report.uiConsolidation.summary.duplicateNameClusterCount ?? 0)} | signature=${Number(report.uiConsolidation.summary.propSignatureClusterCount ?? 0)} | token=${Number(report.uiConsolidation.summary.tokenSimilarityClusterCount ?? 0)}`
    );
  } else {
    lines.push('- Scanner summary unavailable; inspect JSON payload for errors.');
  }
  lines.push('');

  lines.push('## Architecture and Performance Snapshot');
  lines.push('');
  if (report.metrics) {
    const largest = report.metrics.source.largestFile;
    lines.push(`- Source files: ${report.metrics.source.totalFiles}`);
    lines.push(`- Source lines: ${report.metrics.source.totalLines}`);
    lines.push(`- API routes: ${report.metrics.api.totalRoutes}`);
    lines.push(`- Cross-feature edge pairs: ${report.metrics.architecture.crossFeatureEdgePairs}`);
    lines.push(`- Shared->features imports: ${report.metrics.imports.sharedToFeaturesTotalImports}`);
    if (largest) {
      lines.push(`- Largest file: \`${largest.path}\` (${largest.lines} LOC)`);
    }
    lines.push(`- use client files: ${report.metrics.source.useClientFiles}`);
    lines.push(`- setInterval occurrences: ${report.metrics.runtime.setIntervalOccurrences}`);
  } else {
    lines.push('- Metrics snapshot unavailable; inspect JSON payload for error details.');
  }
  lines.push('');

  lines.push('## Top 5 Critical User Flows (Priority Order)');
  lines.push('');
  lines.push('| Priority | Flow | KPI | Target | Scope |');
  lines.push('| ---: | --- | --- | --- | --- |');
  report.criticalFlows.forEach((flow, index) => {
    lines.push(
      `| ${index + 1} | ${flow.name} | ${flow.kpi} | ${flow.target} | \`${flow.scope}\` |`
    );
  });
  lines.push('');

  lines.push('## Notes');
  lines.push('');
  lines.push('- Pass rates are calculated from command exit status for this run (pass=100%, fail/timeout=0%).');
  lines.push('- For full runtime/performance tuning, pair this report with profiling and production telemetry.');

  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const checks = [
    {
      id: 'build',
      label: 'Build',
      command: 'npm',
      commandArgs: ['run', 'build'],
      timeoutMs: 30 * 60 * 1000,
    },
    {
      id: 'lint',
      label: 'Lint',
      command: 'npm',
      commandArgs: ['run', 'lint'],
      timeoutMs: 15 * 60 * 1000,
    },
    {
      id: 'typecheck',
      label: 'Typecheck',
      command: 'npm',
      commandArgs: ['run', 'typecheck'],
      timeoutMs: 20 * 60 * 1000,
    },
    {
      id: 'unit',
      label: 'Unit Tests',
      command: 'npm',
      commandArgs: ['run', 'test:unit'],
      timeoutMs: 25 * 60 * 1000,
    },
    {
      id: 'e2e',
      label: 'E2E Tests',
      command: 'npm',
      commandArgs: ['run', 'test:e2e'],
      timeoutMs: 40 * 60 * 1000,
      enabled: includeE2E,
    },
    {
      id: 'guardrails',
      label: 'Architecture Guardrails',
      command: 'node',
      commandArgs: ['scripts/architecture/check-guardrails.mjs'],
      timeoutMs: 10 * 60 * 1000,
    },
    {
      id: 'uiConsolidation',
      label: 'UI Consolidation Guardrail',
      command: 'node',
      commandArgs: ['scripts/architecture/check-ui-consolidation.mjs'],
      timeoutMs: 10 * 60 * 1000,
    },
    {
      id: 'observability',
      label: 'Observability Check',
      command: 'npm',
      commandArgs: ['run', 'observability:check'],
      timeoutMs: 10 * 60 * 1000,
    },
  ];

  const checkResults = [];
  for (const check of checks) {
    const result = await runCommandCheck(check);
    checkResults.push(result);
    const statusLabel = result.status.toUpperCase();
    console.log(
      `[weekly-quality] ${check.label.padEnd(30, ' ')} ${statusLabel.padEnd(7, ' ')} ${formatDuration(result.durationMs)}`
    );
  }

  let metrics = null;
  let metricsError = null;
  try {
    metrics = await collectMetrics({ root });
  } catch (error) {
    metricsError = error instanceof Error ? error.message : String(error);
  }

  const [propDrilling, uiConsolidation] = await Promise.all([
    parseScannerSummary('scripts/architecture/scan-prop-drilling.mjs'),
    parseScannerSummary('scripts/architecture/scan-ui-consolidation.mjs'),
  ]);

  const summary = {
    totalChecks: checkResults.length,
    passed: checkResults.filter((check) => check.status === 'pass').length,
    failed: checkResults.filter((check) => check.status === 'fail').length,
    timedOut: checkResults.filter((check) => check.status === 'timeout').length,
    skipped: checkResults.filter((check) => check.status === 'skipped').length,
  };

  const findCheck = (id) => checkResults.find((check) => check.id === id);

  const report = {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    includeE2E,
    strictMode,
    summary,
    passRates: {
      build: getPassRate(findCheck('build')),
      lint: getPassRate(findCheck('lint')),
      typecheck: getPassRate(findCheck('typecheck')),
      unit: getPassRate(findCheck('unit')),
      e2e: getPassRate(findCheck('e2e')),
    },
    checks: checkResults,
    metrics,
    metricsError,
    propDrilling,
    uiConsolidation,
    criticalFlows,
  };

  await fs.mkdir(outDir, { recursive: true });

  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const latestJsonPath = path.join(outDir, 'weekly-quality-latest.json');
  const latestMdPath = path.join(outDir, 'weekly-quality-latest.md');
  const historicalJsonPath = path.join(outDir, `weekly-quality-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `weekly-quality-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(latestMdPath, toMarkdown(report), 'utf8');

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await fs.writeFile(historicalMdPath, toMarkdown(report), 'utf8');
  }

  console.log(
    `[weekly-quality] summary pass=${summary.passed} fail=${summary.failed} timeout=${summary.timedOut} skipped=${summary.skipped}`
  );
  console.log(`Wrote ${path.relative(root, latestJsonPath)}`);
  console.log(`Wrote ${path.relative(root, latestMdPath)}`);
  if (shouldWriteHistory) {
    console.log(`Wrote ${path.relative(root, historicalJsonPath)}`);
    console.log(`Wrote ${path.relative(root, historicalMdPath)}`);
  }

  if (strictMode && (summary.failed > 0 || summary.timedOut > 0)) {
    console.error('Weekly quality report strict mode failed due check failures/timeouts.');
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[weekly-quality] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
