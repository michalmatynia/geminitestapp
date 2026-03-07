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
const includeFullLint = args.has('--include-full-lint');
const includeFullUnit = args.has('--include-full-unit');
const strictMode = args.has('--strict');
const shouldWriteHistory = !args.has('--ci') && !args.has('--no-history');

const MAX_OUTPUT_BYTES = 160_000;
const BUILD_LOCK_PATH = path.join(root, '.next', 'lock');
const DURATION_ALERT_BUDGETS_MS = Object.freeze({
  build: 3 * 60 * 1000,
  lint: 4 * 60 * 1000,
  lintDomains: 3 * 60 * 1000,
  typecheck: 2 * 60 * 1000,
  criticalFlows: 60 * 1000,
  securitySmoke: 60 * 1000,
  unitDomains: 10 * 60 * 1000,
  fullUnit: 25 * 60 * 1000,
  e2e: 40 * 60 * 1000,
  guardrails: 60 * 1000,
  uiConsolidation: 60 * 1000,
  observability: 30 * 1000,
});

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

const formatDelta = (deltaMs) => {
  if (!Number.isFinite(deltaMs)) {
    return 'n/a';
  }
  if (deltaMs === 0) {
    return '0ms';
  }
  return `${deltaMs > 0 ? '+' : '-'}${formatDuration(Math.abs(deltaMs))}`;
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

const readJsonIfExists = async (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  try {
    const raw = await fs.readFile(absolutePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isProcessInspectionPermissionError = (error) =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'EPERM' || error.code === 'EACCES')
  );

const summarizeTrend = (payload) => {
  if (!payload || !Array.isArray(payload.runs)) {
    return null;
  }
  const runs = payload.runs;
  if (runs.length === 0) {
    return {
      runCount: 0,
      oldest: null,
      newest: null,
      totalDurationDeltaMs: null,
    };
  }
  const newest = runs[runs.length - 1];
  const previous = runs.length > 1 ? runs[runs.length - 2] : null;
  return {
    runCount: runs.length,
    oldest: runs[0]?.generatedAt ?? null,
    newest: newest?.generatedAt ?? null,
    totalDurationDeltaMs:
      previous && Number.isFinite(newest?.totalDurationMs) && Number.isFinite(previous?.totalDurationMs)
        ? newest.totalDurationMs - previous.totalDurationMs
        : null,
  };
};

const listProcessCommands = async () => {
  const { stdout } = await execFile('ps', ['-Ao', 'pid,command'], {
    cwd: root,
    maxBuffer: 4 * 1024 * 1024,
  });

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

const findActiveRepoBuildProcesses = (processLines) =>
  processLines.filter((line) => {
    if (!line.includes('next build')) return false;
    if (!line.includes(root)) return false;
    return true;
  });

const createCheckResult = ({
  id,
  label,
  command,
  status,
  output,
}) => ({
  id,
  label,
  command,
  status,
  exitCode: null,
  signal: null,
  durationMs: 0,
  output,
});

const preflightBuildLock = async () => {
  try {
    await fs.access(BUILD_LOCK_PATH);
  } catch {
    return {
      action: 'none',
      message: 'No .next/lock detected.',
    };
  }

  let processLines;
  try {
    processLines = await listProcessCommands();
  } catch (error) {
    if (isProcessInspectionPermissionError(error)) {
      const code = typeof error?.code === 'string' ? error.code : 'unknown';
      return {
        action: 'skip',
        message:
          `Skipping build because .next/lock exists and process inspection is unavailable (${code}).`,
      };
    }
    throw error;
  }

  const activeBuilds = findActiveRepoBuildProcesses(processLines);
  if (activeBuilds.length > 0) {
    return {
      action: 'skip',
      message: `Skipping build because an active next build process is already running for this workspace (${activeBuilds.length} detected).`,
    };
  }

  await fs.unlink(BUILD_LOCK_PATH);
  return {
    action: 'removed',
    message: 'Removed stale .next/lock before running build check.',
  };
};

const runCommandCheckAttempt = ({ command, commandArgs, timeoutMs }) =>
  new Promise((resolve) => {
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
      resolve({
        status: 'fail',
        exitCode: null,
        signal: null,
        durationMs: Date.now() - startedAt,
        output: truncateOutput(`${output}\n${error.stack ?? String(error)}`.trim()),
      });
    });

    child.on('close', (exitCode, signal) => {
      completed = true;
      clearTimeout(timer);
      resolve({
        status: timedOut ? 'timeout' : exitCode === 0 ? 'pass' : 'fail',
        exitCode,
        signal,
        durationMs: Date.now() - startedAt,
        output: truncateOutput(output.trim()),
      });
    });
  });

const runCommandCheck = async ({
  id,
  label,
  command,
  commandArgs,
  timeoutMs,
  enabled = true,
  confirmFailureRetries = 0,
}) => {
  if (!enabled) {
    return {
      id,
      label,
      command: [command, ...commandArgs].join(' '),
      status: 'skipped',
      exitCode: null,
      signal: null,
      durationMs: 0,
      output: 'Skipped by configuration.',
    };
  }

  const commandString = [command, ...commandArgs].join(' ');
  const attempts = [];

  for (let attemptIndex = 0; attemptIndex <= confirmFailureRetries; attemptIndex += 1) {
    const result = await runCommandCheckAttempt({
      command,
      commandArgs,
      timeoutMs,
    });
    attempts.push(result);

    if (result.status === 'pass' || result.status === 'timeout') {
      const outputPrefix =
        attemptIndex > 0
          ? `[retry] ${label} passed on confirmation attempt ${attemptIndex + 1} of ${confirmFailureRetries + 1}.`
          : '';
      return {
        id,
        label,
        command: commandString,
        status: result.status,
        exitCode: result.exitCode,
        signal: result.signal,
        durationMs: attempts.reduce((total, value) => total + value.durationMs, 0),
        output: truncateOutput([outputPrefix, result.output].filter(Boolean).join('\n')),
      };
    }
  }

  const finalResult = attempts.at(-1);
  return {
    id,
    label,
    command: commandString,
    status: finalResult.status,
    exitCode: finalResult.exitCode,
    signal: finalResult.signal,
    durationMs: attempts.reduce((total, value) => total + value.durationMs, 0),
    output: truncateOutput(
      attempts
        .map((attempt, index) =>
          [`[attempt ${index + 1}/${attempts.length}]`, attempt.output].filter(Boolean).join('\n')
        )
        .join('\n\n')
    ),
  };
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
  if (report.buildPreflight?.action && report.buildPreflight.action !== 'none') {
    lines.push(
      `- Build preflight: ${report.buildPreflight.action} (${report.buildPreflight.message})`
    );
  }
  lines.push(`- Lint pass rate: ${report.passRates.lint ?? 'n/a'}%`);
  lines.push(`- Lint-domain pass rate: ${report.passRates.lintDomains ?? 'n/a'}%`);
  lines.push(`- Typecheck pass rate: ${report.passRates.typecheck ?? 'n/a'}%`);
  lines.push(`- Critical-flow gate pass rate: ${report.passRates.criticalFlows ?? 'n/a'}%`);
  lines.push(`- Security smoke gate pass rate: ${report.passRates.securitySmoke ?? 'n/a'}%`);
  lines.push(`- Unit-domain gate pass rate: ${report.passRates.unitDomains ?? 'n/a'}%`);
  lines.push(`- Full unit pass rate: ${report.passRates.fullUnit ?? 'n/a'}%`);
  lines.push(`- E2E test pass rate: ${report.passRates.e2e ?? 'n/a'}%`);
  lines.push(`- Duration budget alerts: ${report.durationAlerts.length}`);
  lines.push('');
  if (!includeFullLint) {
    lines.push(
      'Full repository lint was skipped in this run. Use `--include-full-lint` to include the broad `eslint src` sweep.'
    );
    lines.push('');
  }
  if (!includeFullUnit) {
    lines.push(
      'Full unit suite was skipped in this run. Use `--include-full-unit` to include full unit coverage in baseline.'
    );
    lines.push('');
  }
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

  lines.push('## Trend Snapshot');
  lines.push('');
  if (report.trends.weeklyLane) {
    const trend = report.trends.weeklyLane;
    lines.push(
      `- Weekly lane trend: runs=${trend.runCount}, window=${trend.oldest ?? '-'} -> ${trend.newest ?? '-'}, delta=${trend.totalDurationDeltaMs === null ? 'n/a' : formatDelta(trend.totalDurationDeltaMs)}`
    );
  } else {
    lines.push('- Weekly lane trend: unavailable');
  }
  if (report.trends.unitDomains) {
    const trend = report.trends.unitDomains;
    lines.push(
      `- Unit-domain trend: runs=${trend.runCount}, window=${trend.oldest ?? '-'} -> ${trend.newest ?? '-'}, delta=${trend.totalDurationDeltaMs === null ? 'n/a' : formatDelta(trend.totalDurationDeltaMs)}`
    );
  } else {
    lines.push('- Unit-domain trend: unavailable');
  }
  if (report.trends.lintDomains) {
    const trend = report.trends.lintDomains;
    lines.push(
      `- Lint-domain trend: runs=${trend.runCount}, window=${trend.oldest ?? '-'} -> ${trend.newest ?? '-'}, delta=${trend.totalDurationDeltaMs === null ? 'n/a' : formatDelta(trend.totalDurationDeltaMs)}`
    );
  } else {
    lines.push('- Lint-domain trend: unavailable');
  }
  lines.push('');

  lines.push('## Duration Budget Alerts');
  lines.push('');
  if (report.durationAlerts.length === 0) {
    lines.push('- No duration budget alerts in this run.');
  } else {
    lines.push('| Check | Duration | Budget | Delta |');
    lines.push('| --- | ---: | ---: | ---: |');
    for (const alert of report.durationAlerts) {
      const delta = alert.durationMs - alert.budgetMs;
      lines.push(
        `| ${alert.label} | ${formatDuration(alert.durationMs)} | ${formatDuration(alert.budgetMs)} | +${formatDuration(delta)} |`
      );
    }
  }
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
  let buildPreflight = {
    action: 'none',
    message: 'Build preflight not executed.',
  };

  try {
    buildPreflight = await preflightBuildLock();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    buildPreflight = {
      action: 'error',
      message: `Build preflight failed: ${message}`,
    };
  }

  const checks = [
    {
      id: 'build',
      label: 'Build',
      command: 'npm',
      commandArgs: ['run', 'build'],
      timeoutMs: 30 * 60 * 1000,
      confirmFailureRetries: 1,
    },
    {
      id: 'lint',
      label: 'Lint',
      command: 'npm',
      commandArgs: ['run', 'lint'],
      timeoutMs: 15 * 60 * 1000,
      confirmFailureRetries: 1,
      enabled: includeFullLint,
    },
    {
      id: 'lintDomains',
      label: 'Lint Domain Gate',
      command: 'node',
      commandArgs: [
        'scripts/quality/run-lint-domain-checks.mjs',
        '--include-test-tree',
        '--strict',
        '--ci',
        '--no-history',
      ],
      timeoutMs: 25 * 60 * 1000,
    },
    {
      id: 'typecheck',
      label: 'Typecheck',
      command: 'npm',
      commandArgs: ['run', 'typecheck'],
      timeoutMs: 20 * 60 * 1000,
      confirmFailureRetries: 1,
    },
    {
      id: 'criticalFlows',
      label: 'Critical Flow Gate',
      command: 'npm',
      commandArgs: ['run', 'test:critical-flows:strict', '--', '--ci', '--no-history'],
      timeoutMs: 20 * 60 * 1000,
    },
    {
      id: 'securitySmoke',
      label: 'Security Smoke Gate',
      command: 'npm',
      commandArgs: ['run', 'test:security-smoke:strict', '--', '--ci', '--no-history'],
      timeoutMs: 20 * 60 * 1000,
    },
    {
      id: 'unitDomains',
      label: 'Unit Domain Gate',
      command: 'npm',
      commandArgs: ['run', 'test:unit:domains:strict', '--', '--ci', '--no-history'],
      timeoutMs: 25 * 60 * 1000,
    },
    {
      id: 'fullUnit',
      label: 'Full Unit Tests',
      command: 'npm',
      commandArgs: ['run', 'test:unit'],
      timeoutMs: 25 * 60 * 1000,
      enabled: includeFullUnit,
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
    if (check.id === 'build' && buildPreflight.action === 'skip') {
      const result = createCheckResult({
        id: check.id,
        label: check.label,
        command: [check.command, ...check.commandArgs].join(' '),
        status: 'skipped',
        output: buildPreflight.message,
      });
      checkResults.push(result);
      console.log(
        `[weekly-quality] ${check.label.padEnd(30, ' ')} ${result.status.toUpperCase().padEnd(7, ' ')} ${formatDuration(result.durationMs)}`
      );
      continue;
    }

    const result = await runCommandCheck(check);
    if (check.id === 'build' && buildPreflight.action === 'removed') {
      result.output = truncateOutput(
        [`[build-preflight] ${buildPreflight.message}`, result.output].filter(Boolean).join('\n')
      );
    }
    if (check.id === 'build' && buildPreflight.action === 'error') {
      result.output = truncateOutput(
        [`[build-preflight] ${buildPreflight.message}`, result.output].filter(Boolean).join('\n')
      );
    }
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
  const [weeklyLaneTrendRaw, unitDomainTrendRaw, lintDomainTrendRaw] = await Promise.all([
    readJsonIfExists('docs/metrics/weekly-quality-trend-latest.json'),
    readJsonIfExists('docs/metrics/unit-domain-timings-trend-latest.json'),
    readJsonIfExists('docs/metrics/lint-domain-checks-trend-latest.json'),
  ]);

  const summary = {
    totalChecks: checkResults.length,
    passed: checkResults.filter((check) => check.status === 'pass').length,
    failed: checkResults.filter((check) => check.status === 'fail').length,
    timedOut: checkResults.filter((check) => check.status === 'timeout').length,
    skipped: checkResults.filter((check) => check.status === 'skipped').length,
  };

  const findCheck = (id) => checkResults.find((check) => check.id === id);
  const durationAlerts = checkResults
    .filter((check) => check.status !== 'skipped')
    .map((check) => {
      const budgetMs = DURATION_ALERT_BUDGETS_MS[check.id];
      if (!Number.isFinite(budgetMs)) return null;
      if (!Number.isFinite(check.durationMs)) return null;
      if (check.durationMs <= budgetMs) return null;
      return {
        id: check.id,
        label: check.label,
        status: check.status,
        durationMs: check.durationMs,
        budgetMs,
      };
    })
    .filter(Boolean);

  const report = {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    includeE2E,
    strictMode,
    summary,
    passRates: {
      build: getPassRate(findCheck('build')),
      lint: getPassRate(findCheck('lint')),
      lintDomains: getPassRate(findCheck('lintDomains')),
      typecheck: getPassRate(findCheck('typecheck')),
      criticalFlows: getPassRate(findCheck('criticalFlows')),
      securitySmoke: getPassRate(findCheck('securitySmoke')),
      unitDomains: getPassRate(findCheck('unitDomains')),
      fullUnit: getPassRate(findCheck('fullUnit')),
      e2e: getPassRate(findCheck('e2e')),
    },
    durationAlerts,
    checks: checkResults,
    buildPreflight,
    metrics,
    metricsError,
    propDrilling,
    uiConsolidation,
    trends: {
      weeklyLane: summarizeTrend(weeklyLaneTrendRaw),
      unitDomains: summarizeTrend(unitDomainTrendRaw),
      lintDomains: summarizeTrend(lintDomainTrendRaw),
    },
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

  if (strictMode && durationAlerts.length > 0) {
    console.error('Weekly quality report strict mode failed due duration budget alerts.');
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[weekly-quality] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
