import fs from 'node:fs/promises';
import path from 'node:path';
import {
  preflightBuildLock,
} from './lib/weekly-report-build-preflight.mjs';

import { runStabilizationGates } from '../canonical/lib/stabilization-gate-runner.mjs';
import { collectMetrics } from '../architecture/lib-metrics.mjs';
import { execScanOutput } from '../architecture/lib/exec-scan-output.mjs';
import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';
import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';
import {
  createWeeklyCheckResult,
  runCommandCheck,
  runStructuredCommandCheck,
} from './lib/weekly-report-checks.mjs';
import { applyWeeklyCheckSelection, parseWeeklyCheckSelectionArgs } from './lib/weekly-report-selection.mjs';
import { summarizeWeeklyChecks } from './lib/weekly-report-aggregation.mjs';
import {
  toMarkdown,
  formatDuration,
} from './lib/weekly-report-markdown.mjs';
import { buildWeeklyReportSummaryJsonDetails } from './lib/weekly-report-summary.mjs';

const argv = process.argv.slice(2);
const args = new Set(argv);
const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');

const includeE2E = args.has('--include-e2e');
const includeFullLint = args.has('--include-full-lint');
const includeFullUnit = args.has('--include-full-unit');
const requestedCheckSelection = parseWeeklyCheckSelectionArgs(argv);
const { strictMode, shouldWriteHistory, noWrite, summaryJson } = parseCommonCheckArgs(argv);

const MAX_OUTPUT_BYTES = 160_000;
const BUILD_LOCK_PATH = path.join(root, '.next', 'lock');
const BUILD_STANDALONE_PATH = path.join(root, '.next', 'standalone');
const BUILD_TRACE_PATH = path.join(root, '.next', 'trace-build');
const DURATION_ALERT_BUDGETS_MS = Object.freeze({
  build: 195 * 1000,
  lint: 4 * 60 * 1000,
  lintDomains: 407 * 1000,
  typecheck: 2 * 60 * 1000,
  criticalFlows: 60 * 1000,
  securitySmoke: 60 * 1000,
  unitDomains: 10 * 60 * 1000,
  fullUnit: 25 * 60 * 1000,
  e2e: 40 * 60 * 1000,
  guardrails: 60 * 1000,
  uiConsolidation: 60 * 1000,
  observability: 30 * 1000,
  unsafePatterns: 60 * 1000,
  importBoundaries: 60 * 1000,
  apiInputValidation: 60 * 1000,
  contextHealth: 60 * 1000,
  timerCleanup: 60 * 1000,
  testDistribution: 60 * 1000,
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

const readJsonIfExists = async (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  try {
    const raw = await fs.readFile(absolutePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

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

const loadKangurAiTutorBridgeSnapshot = async () => {
  const result = await execScanOutput({
    command: 'node',
    commandArgs: [
      '--import',
      'tsx',
      'scripts/observability/check-kangur-ai-tutor-bridge.ts',
      '--summary-json',
      '--range=7d',
    ],
    cwd: root,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
    },
    sourceName: 'kangur-ai-tutor-bridge-snapshot',
    timeoutMs: 30 * 1000,
  });

  return {
    status: result.output?.status ?? (result.ok ? 'ok' : 'failed'),
    summary: result.output?.summary ?? null,
    details: result.output?.details ?? null,
    error: result.error ?? null,
  };
};

const loadKangurKnowledgeGraphStatusSnapshot = async () => {
  const result = await execScanOutput({
    command: 'node',
    commandArgs: [
      '--import',
      'tsx',
      'scripts/db/kangur-knowledge-graph-status.ts',
      '--summary-json',
    ],
    cwd: root,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
    },
    sourceName: 'kangur-knowledge-graph-status',
    timeoutMs: 20 * 1000,
  });

  return {
    status: result.output?.status ?? (result.ok ? 'ok' : 'failed'),
    summary: result.output?.summary ?? null,
    details: result.output?.details ?? null,
    error: result.error ?? null,
  };
};

const parseScannerSummary = async (scriptName) => {
  const result = await execScanOutput({
    command: 'node',
    commandArgs: [
      scriptName,
      '--ci',
      '--no-history',
      '--no-write',
      '--summary-json',
    ],
    cwd: root,
    sourceName: scriptName,
    maxBuffer: 8 * 1024 * 1024,
  });

  return {
    ok: result.ok,
    summary: result.output?.summary ?? null,
    error: result.error,
  };
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

const run = async () => {
  const configuredChecks = [
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
        ...(noWrite ? ['--no-write'] : []),
        '--summary-json',
      ],
      sourceName: 'scripts/quality/run-lint-domain-checks.mjs',
      timeoutMs: 25 * 60 * 1000,
      structured: true,
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
      command: 'node',
      commandArgs: [
        'scripts/testing/run-critical-flow-tests.mjs',
        '--strict',
        '--ci',
        '--no-history',
        ...(noWrite ? ['--no-write'] : []),
        '--summary-json',
      ],
      sourceName: 'scripts/testing/run-critical-flow-tests.mjs',
      timeoutMs: 20 * 60 * 1000,
      structured: true,
    },
    {
      id: 'securitySmoke',
      label: 'Security Smoke Gate',
      command: 'node',
      commandArgs: [
        'scripts/testing/run-security-smoke-tests.mjs',
        '--strict',
        '--ci',
        '--no-history',
        ...(noWrite ? ['--no-write'] : []),
        '--summary-json',
      ],
      sourceName: 'scripts/testing/run-security-smoke-tests.mjs',
      timeoutMs: 20 * 60 * 1000,
      structured: true,
    },
    {
      id: 'unitDomains',
      label: 'Unit Domain Gate',
      command: 'node',
      commandArgs: [
        'scripts/testing/run-unit-domain-timings.mjs',
        '--strict',
        '--ci',
        '--no-history',
        ...(noWrite ? ['--no-write'] : []),
        '--summary-json',
      ],
      sourceName: 'scripts/testing/run-unit-domain-timings.mjs',
      timeoutMs: 25 * 60 * 1000,
      structured: true,
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
      command: 'node',
      commandArgs: [
        'scripts/testing/run-playwright-suite.mjs',
        '--summary-json',
        '--no-write',
        '--ci',
      ],
      sourceName: 'scripts/testing/run-playwright-suite.mjs',
      timeoutMs: 40 * 60 * 1000,
      enabled: includeE2E,
      structured: true,
    },
    {
      id: 'guardrails',
      label: 'Architecture Guardrails',
      command: 'node',
      commandArgs: ['scripts/architecture/check-guardrails.mjs', '--summary-json'],
      sourceName: 'scripts/architecture/check-guardrails.mjs',
      timeoutMs: 10 * 60 * 1000,
      structured: true,
    },
    {
      id: 'uiConsolidation',
      label: 'UI Consolidation Guardrail',
      command: 'node',
      commandArgs: ['scripts/architecture/check-ui-consolidation.mjs', '--summary-json'],
      sourceName: 'scripts/architecture/check-ui-consolidation.mjs',
      timeoutMs: 10 * 60 * 1000,
      structured: true,
    },
    {
      id: 'observability',
      label: 'Observability Check',
      command: 'node',
      commandArgs: ['scripts/observability/check-observability.mjs', '--mode=check', '--summary-json'],
      sourceName: 'scripts/observability/check-observability.mjs',
      timeoutMs: 10 * 60 * 1000,
      structured: true,
    },
    {
      id: 'unsafePatterns',
      label: 'Unsafe Patterns',
      command: 'node',
      commandArgs: ['scripts/quality/check-unsafe-patterns.mjs', '--ci', '--no-history', ...(noWrite ? ['--no-write'] : [])],
      timeoutMs: 60 * 1000,
    },
    {
      id: 'importBoundaries',
      label: 'Import Boundaries',
      command: 'node',
      commandArgs: ['scripts/quality/check-import-boundaries.mjs', '--ci', '--no-history', ...(noWrite ? ['--no-write'] : [])],
      timeoutMs: 60 * 1000,
    },
    {
      id: 'apiInputValidation',
      label: 'API Input Validation',
      command: 'node',
      commandArgs: ['scripts/quality/check-api-input-validation.mjs', '--ci', '--no-history', ...(noWrite ? ['--no-write'] : [])],
      timeoutMs: 60 * 1000,
    },
    {
      id: 'contextHealth',
      label: 'Context Health',
      command: 'node',
      commandArgs: ['scripts/quality/check-context-health.mjs', '--ci', '--no-history', ...(noWrite ? ['--no-write'] : [])],
      timeoutMs: 60 * 1000,
    },
    {
      id: 'timerCleanup',
      label: 'Timer Cleanup',
      command: 'node',
      commandArgs: ['scripts/quality/check-timer-cleanup.mjs', '--ci', '--no-history', ...(noWrite ? ['--no-write'] : [])],
      timeoutMs: 60 * 1000,
    },
    {
      id: 'testDistribution',
      label: 'Test Distribution',
      command: 'node',
      commandArgs: ['scripts/quality/check-test-distribution.mjs', '--ci', '--no-history', ...(noWrite ? ['--no-write'] : [])],
      timeoutMs: 60 * 1000,
    },
  ];

  const { checks, selection: checkSelection } = applyWeeklyCheckSelection(
    configuredChecks,
    requestedCheckSelection
  );

  const buildCheck = checks.find((check) => check.id === 'build') ?? null;
  let buildPreflight = {
    action: 'none',
    message: 'Build preflight not executed.',
  };

  if (buildCheck?.enabled === false) {
    buildPreflight = {
      action: 'skip',
      message: buildCheck.disabledOutput ?? 'Build check skipped.',
    };
  } else {
    try {
      buildPreflight = await preflightBuildLock({ root, buildLockPath: BUILD_LOCK_PATH, buildStandalonePath: BUILD_STANDALONE_PATH, buildTracePath: BUILD_TRACE_PATH });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      buildPreflight = {
        action: 'error',
        message: `Build preflight failed: ${message}`,
      };
    }
  }

  const checkResults = [];
  for (const check of checks) {
    if (check.id === 'build' && buildPreflight.action === 'skip') {
      const result = createWeeklyCheckResult({
        id: check.id,
        label: check.label,
        command: [check.command, ...check.commandArgs].join(' '),
        status: 'skipped',
        output: buildPreflight.message,
      });
      checkResults.push(result);
      if (!summaryJson) {
        console.log(
          `[weekly-quality] ${check.label.padEnd(30, ' ')} ${result.status.toUpperCase().padEnd(7, ' ')} ${formatDuration(result.durationMs)}`
        );
      }
      continue;
    }

    const result = check.structured
      ? await runStructuredCommandCheck({
          id: check.id,
          label: check.label,
          command: check.command,
          commandArgs: check.commandArgs,
          timeoutMs: check.timeoutMs,
          enabled: check.enabled ?? true,
          disabledOutput: check.disabledOutput,
          cwd: root,
          env: {
            ...process.env,
            FORCE_COLOR: '0',
          },
          sourceName: check.sourceName ?? check.commandArgs[0] ?? check.id,
          maxOutputBytes: MAX_OUTPUT_BYTES,
        })
      : await runCommandCheck({ ...check, cwd: root, maxOutputBytes: MAX_OUTPUT_BYTES });
    if (check.id === 'build' && buildPreflight.action === 'removed') {
      const output = [`[build-preflight] ${buildPreflight.message}`, result.output]
        .filter(Boolean)
        .join('\n');
      result.output = output.length <= MAX_OUTPUT_BYTES ? output : output.slice(-MAX_OUTPUT_BYTES);
    }
    if (check.id === 'build' && buildPreflight.action === 'error') {
      const output = [`[build-preflight] ${buildPreflight.message}`, result.output]
        .filter(Boolean)
        .join('\n');
      result.output = output.length <= MAX_OUTPUT_BYTES ? output : output.slice(-MAX_OUTPUT_BYTES);
    }
    checkResults.push(result);
    if (!summaryJson) {
      const statusLabel = result.status.toUpperCase();
      console.log(
        `[weekly-quality] ${check.label.padEnd(30, ' ')} ${statusLabel.padEnd(7, ' ')} ${formatDuration(result.durationMs)}`
      );
    }
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
  let stabilization = null;
  let stabilizationError = null;
  try {
    stabilization = await runStabilizationGates({
      cwd: root,
      env: process.env,
      logger: null,
      prefix: 'weekly-quality:stabilization',
    });
  } catch (error) {
    stabilizationError = error instanceof Error ? error.message : String(error);
  }
  const [weeklyLaneTrendRaw, unitDomainTrendRaw, lintDomainTrendRaw] = await Promise.all([
    readJsonIfExists('docs/metrics/weekly-quality-trend-latest.json'),
    readJsonIfExists('docs/metrics/unit-domain-timings-trend-latest.json'),
    readJsonIfExists('docs/metrics/lint-domain-checks-trend-latest.json'),
  ]);
  const [kangurAiTutorBridge, kangurKnowledgeGraphStatus] = await Promise.all([
    loadKangurAiTutorBridgeSnapshot(),
    loadKangurKnowledgeGraphStatusSnapshot(),
  ]);

  const summary = summarizeWeeklyChecks(checkResults, checkSelection);

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
    checkSelection,
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
    stabilization,
    stabilizationError,
    trends: {
      weeklyLane: summarizeTrend(weeklyLaneTrendRaw),
      unitDomains: summarizeTrend(unitDomainTrendRaw),
      lintDomains: summarizeTrend(lintDomainTrendRaw),
    },
    kangurAiTutorBridge,
    kangurKnowledgeGraphStatus,
    criticalFlows,
  };

  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const latestJsonPath = path.join(outDir, 'weekly-quality-latest.json');
  const latestMdPath = path.join(outDir, 'weekly-quality-latest.md');
  const historicalJsonPath = path.join(outDir, `weekly-quality-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `weekly-quality-${stamp}.md`);
  const paths = noWrite
    ? null
    : {
        latestJson: path.relative(root, latestJsonPath),
        latestMarkdown: path.relative(root, latestMdPath),
        historicalJson: shouldWriteHistory ? path.relative(root, historicalJsonPath) : null,
        historicalMarkdown: shouldWriteHistory ? path.relative(root, historicalMdPath) : null,
      };

  if (!noWrite) {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeMetricsMarkdownFile({
      root,
      targetPath: latestMdPath,
      content: toMarkdown(report),
    });

    if (shouldWriteHistory) {
      await fs.writeFile(historicalJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      await writeMetricsMarkdownFile({
        root,
        targetPath: historicalMdPath,
        content: toMarkdown(report),
      });
    }
  }

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'weekly-quality-report',
      generatedAt: report.generatedAt,
      status:
        summary.failed > 0 || summary.timedOut > 0 || durationAlerts.length > 0 ? 'failed' : 'ok',
      summary: {
        totalChecks: summary.totalChecks,
        executedChecks: summary.executedChecks,
        passed: summary.passed,
        failed: summary.failed,
        timedOut: summary.timedOut,
        skipped: summary.skipped,
        selectionSkipped: summary.selectionSkipped,
        otherSkipped: summary.otherSkipped,
        durationAlertCount: durationAlerts.length,
      },
      details: buildWeeklyReportSummaryJsonDetails(report),
      paths,
      filters: {
        includeE2E,
        includeFullLint,
        includeFullUnit,
        onlyChecks: checkSelection.onlyChecks,
        skipChecks: checkSelection.skipChecks,
        strictMode,
        historyDisabled: !shouldWriteHistory,
        noWrite,
        ci: args.has('--ci'),
      },
      notes: ['weekly quality report snapshot'],
    });

    if (strictMode && (summary.failed > 0 || summary.timedOut > 0)) {
      process.exit(1);
    }

    if (strictMode && durationAlerts.length > 0) {
      process.exit(1);
    }

    return;
  }

  console.log(
    `[weekly-quality] summary pass=${summary.passed} fail=${summary.failed} timeout=${summary.timedOut} skipped=${summary.skipped}`
  );
  if (paths) {
    console.log(`Wrote ${paths.latestJson}`);
    console.log(`Wrote ${paths.latestMarkdown}`);
    if (paths.historicalJson) {
      console.log(`Wrote ${paths.historicalJson}`);
      console.log(`Wrote ${paths.historicalMarkdown}`);
    }
  } else {
    console.log('Skipped writing weekly quality report artifacts (--no-write).');
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
