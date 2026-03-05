import fs from 'node:fs/promises';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const shouldWriteHistory = !args.has('--ci') && !args.has('--no-history');
const includeLatest = !args.has('--exclude-latest');
const applyBudgets = args.has('--apply-budgets');

const minSamplesArg = [...args].find((arg) => arg.startsWith('--min-samples='));
const maxRunsArg = [...args].find((arg) => arg.startsWith('--max-runs='));
const percentileArg = [...args].find((arg) => arg.startsWith('--percentile='));
const headroomArg = [...args].find((arg) => arg.startsWith('--headroom='));

const minSamples = Math.max(1, Number.parseInt(minSamplesArg?.split('=')[1] ?? '8', 10));
const maxRuns = Math.max(1, Number.parseInt(maxRunsArg?.split('=')[1] ?? '20', 10));
const percentile = Math.min(0.99, Math.max(0.5, Number.parseFloat(percentileArg?.split('=')[1] ?? '0.9')));
const headroom = Math.min(1, Math.max(0, Number.parseFloat(headroomArg?.split('=')[1] ?? '0.2')));

const root = process.cwd();
const metricsDir = path.join(root, 'docs', 'metrics');
const weeklyReportScriptPath = path.join(root, 'scripts', 'quality', 'generate-weekly-report.mjs');
const BUDGET_BLOCK_PATTERN = /const DURATION_ALERT_BUDGETS_MS = Object\.freeze\(\{\n[\s\S]*?\n\}\);/;

const WEEKLY_DURATION_BUDGETS_MS = Object.freeze({
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

const CHECK_LABELS = Object.freeze({
  build: 'Build',
  lint: 'Lint',
  lintDomains: 'Lint Domain Gate',
  typecheck: 'Typecheck',
  criticalFlows: 'Critical Flow Gate',
  securitySmoke: 'Security Smoke Gate',
  unitDomains: 'Unit Domain Gate',
  fullUnit: 'Full Unit Tests',
  e2e: 'E2E Tests',
  guardrails: 'Architecture Guardrails',
  uiConsolidation: 'UI Consolidation Guardrail',
  observability: 'Observability Check',
});

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) return 'n/a';
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  return `${(sec / 60).toFixed(1)}m`;
};

const formatDelta = (deltaMs) => {
  if (!Number.isFinite(deltaMs) || deltaMs === 0) return '0ms';
  return `${deltaMs > 0 ? '+' : '-'}${formatDuration(Math.abs(deltaMs))}`;
};

const readJsonIfExists = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const toMillisCeil = (value) => Math.max(1000, Math.ceil(value / 1000) * 1000);

const toBudgetExpression = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) {
    return '0';
  }
  if (ms % (60 * 1000) === 0) {
    return `${ms / (60 * 1000)} * 60 * 1000`;
  }
  if (ms % 1000 === 0) {
    return `${ms / 1000} * 1000`;
  }
  return String(ms);
};

const renderBudgetBlock = (recommendedById) => {
  const lines = ['const DURATION_ALERT_BUDGETS_MS = Object.freeze({'];
  for (const [checkId, defaultMs] of Object.entries(WEEKLY_DURATION_BUDGETS_MS)) {
    const value = Number.isFinite(recommendedById[checkId]) ? recommendedById[checkId] : defaultMs;
    lines.push(`  ${checkId}: ${toBudgetExpression(value)},`);
  }
  lines.push('});');
  return lines.join('\n');
};

const percentileAt = (values, p) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) return sorted[lowerIndex];
  const weight = position - lowerIndex;
  return Math.round(sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight);
};

const listRunFiles = async () => {
  const files = await fs.readdir(metricsDir);
  const historical = files
    .filter((file) => /^weekly-quality-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/.test(file))
    .map((file) => path.join(metricsDir, file));
  const latestPath = path.join(metricsDir, 'weekly-quality-latest.json');
  if (includeLatest) {
    historical.push(latestPath);
  }
  return historical;
};

const loadRuns = async (files) => {
  const parsed = [];
  for (const filePath of files) {
    const payload = await readJsonIfExists(filePath);
    if (!payload || typeof payload !== 'object') {
      continue;
    }
    if (typeof payload.generatedAt !== 'string') {
      continue;
    }
    const checks = Array.isArray(payload.checks) ? payload.checks : [];
    parsed.push({
      sourceFile: path.basename(filePath),
      generatedAt: payload.generatedAt,
      checks: checks.map((check) => ({
        id: check?.id ?? null,
        status: check?.status ?? 'unknown',
        durationMs: Number.isFinite(check?.durationMs) ? Number(check.durationMs) : null,
        exitCode: check?.exitCode ?? null,
      })),
    });
  }

  const dedupByGeneratedAt = new Map();
  for (const run of parsed) {
    dedupByGeneratedAt.set(run.generatedAt, run);
  }

  return [...dedupByGeneratedAt.values()]
    .sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime())
    .slice(-maxRuns);
};

const analyze = (runs) => {
  const entries = [];
  for (const [checkId, currentBudgetMs] of Object.entries(WEEKLY_DURATION_BUDGETS_MS)) {
    const passSamples = runs
      .map((run) => run.checks.find((check) => check.id === checkId))
      .filter((check) => check && check.status === 'pass' && Number.isFinite(check.durationMs))
      .map((check) => Number(check.durationMs));

    const pValue = percentileAt(passSamples, percentile);
    const maxValue = passSamples.length > 0 ? Math.max(...passSamples) : null;
    const enoughSamples = passSamples.length >= minSamples;
    const suggestedRaw =
      enoughSamples && Number.isFinite(pValue) && Number.isFinite(maxValue)
        ? Math.max(pValue * (1 + headroom), maxValue * 1.1)
        : null;
    const suggestedBudgetMs =
      suggestedRaw === null ? currentBudgetMs : toMillisCeil(Math.max(currentBudgetMs, suggestedRaw));

    entries.push({
      id: checkId,
      label: CHECK_LABELS[checkId] ?? checkId,
      currentBudgetMs,
      sampleCount: passSamples.length,
      percentileDurationMs: pValue,
      maxDurationMs: maxValue,
      recommendedBudgetMs: suggestedBudgetMs,
      deltaMs: suggestedBudgetMs - currentBudgetMs,
      status: enoughSamples ? 'ready' : 'insufficient-data',
    });
  }

  const ready = entries.filter((entry) => entry.status === 'ready');
  const changed = ready.filter((entry) => entry.deltaMs !== 0);
  const pending = entries.filter((entry) => entry.status !== 'ready');
  const status = ready.length === 0 ? 'pending' : pending.length > 0 ? 'partial' : 'ready';

  return {
    status,
    checks: entries.length,
    checksReady: ready.length,
    checksPending: pending.length,
    checksChanged: changed.length,
    minimumSamplesRequired: minSamples,
    percentile,
    headroom,
    entries,
  };
};

const applyRecommendedBudgets = async (analysis) => {
  const result = {
    requested: applyBudgets,
    status: 'not-requested',
    applied: false,
    targetFile: path.relative(root, weeklyReportScriptPath),
    reason: null,
    changedChecks: [],
  };

  if (!applyBudgets) {
    return result;
  }

  if (analysis.status !== 'ready') {
    result.status = 'skipped';
    result.reason = `Calibration status is ${analysis.status}; all checks must be ready before apply.`;
    return result;
  }

  const changedEntries = analysis.entries.filter(
    (entry) => entry.status === 'ready' && Number.isFinite(entry.deltaMs) && entry.deltaMs !== 0
  );
  result.changedChecks = changedEntries.map((entry) => ({
    id: entry.id,
    label: entry.label,
    fromMs: entry.currentBudgetMs,
    toMs: entry.recommendedBudgetMs,
    deltaMs: entry.deltaMs,
  }));

  if (changedEntries.length === 0) {
    result.status = 'no-change';
    result.reason = 'Recommendations match current budget values.';
    return result;
  }

  const recommendedById = Object.fromEntries(
    analysis.entries.map((entry) => [entry.id, entry.recommendedBudgetMs])
  );
  const replacement = renderBudgetBlock(recommendedById);
  const raw = await fs.readFile(weeklyReportScriptPath, 'utf8');
  if (!BUDGET_BLOCK_PATTERN.test(raw)) {
    throw new Error('Unable to locate DURATION_ALERT_BUDGETS_MS block in weekly report script.');
  }

  const updated = raw.replace(BUDGET_BLOCK_PATTERN, replacement);
  if (updated === raw) {
    result.status = 'no-change';
    result.reason = 'Budget block remained unchanged after replacement.';
    return result;
  }

  await fs.writeFile(weeklyReportScriptPath, updated, 'utf8');
  result.status = 'applied';
  result.applied = true;
  return result;
};

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Weekly Duration Budget Recommendations');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push(`Runs analyzed: ${payload.summary.runsAnalyzed}`);
  lines.push(`Calibration status: ${payload.summary.status.toUpperCase()}`);
  lines.push('');
  lines.push('## Calibration Settings');
  lines.push('');
  lines.push(`- Minimum pass samples per check: ${payload.summary.minimumSamplesRequired}`);
  lines.push(`- Percentile target: ${(payload.summary.percentile * 100).toFixed(0)}th`);
  lines.push(`- Headroom: ${(payload.summary.headroom * 100).toFixed(0)}%`);
  lines.push('');
  lines.push('## Application');
  lines.push('');
  lines.push(`- Apply requested: ${payload.application.requested ? 'yes' : 'no'}`);
  lines.push(`- Apply status: ${payload.application.status}`);
  lines.push(`- Apply target file: \`${payload.application.targetFile}\``);
  if (payload.application.reason) {
    lines.push(`- Apply reason: ${payload.application.reason}`);
  }
  if (Array.isArray(payload.application.changedChecks) && payload.application.changedChecks.length > 0) {
    lines.push(`- Checks changed: ${payload.application.changedChecks.length}`);
  }
  lines.push('');
  lines.push('## Recommendations');
  lines.push('');
  lines.push('| Check | Current | Samples | Pctl | Max | Recommended | Delta | Status |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const entry of payload.recommendations) {
    lines.push(
      `| ${entry.label} | ${formatDuration(entry.currentBudgetMs)} | ${entry.sampleCount} | ${formatDuration(entry.percentileDurationMs)} | ${formatDuration(entry.maxDurationMs)} | ${formatDuration(entry.recommendedBudgetMs)} | ${formatDelta(entry.deltaMs)} | ${entry.status} |`
    );
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- Recommendations are computed from passing check durations only.');
  lines.push('- `--apply-budgets` updates weekly budget constants only when all checks are ready.');
  lines.push('- Pending status means there is not enough historical data for at least one check.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  await fs.mkdir(metricsDir, { recursive: true });
  const files = await listRunFiles();
  const runs = await loadRuns(files);
  const analysis = analyze(runs);
  const application = await applyRecommendedBudgets(analysis);

  const payload = {
    generatedAt: new Date().toISOString(),
    summary: {
      status: analysis.status,
      runsAnalyzed: runs.length,
      oldestRun: runs[0]?.generatedAt ?? null,
      newestRun: runs[runs.length - 1]?.generatedAt ?? null,
      checks: analysis.checks,
      checksReady: analysis.checksReady,
      checksPending: analysis.checksPending,
      checksChanged: analysis.checksChanged,
      minimumSamplesRequired: analysis.minimumSamplesRequired,
      percentile: analysis.percentile,
      headroom: analysis.headroom,
      applicationStatus: application.status,
    },
    application,
    recommendations: analysis.entries,
    runs: runs.map((runEntry) => ({
      sourceFile: runEntry.sourceFile,
      generatedAt: runEntry.generatedAt,
    })),
  };

  const stamp = payload.generatedAt.replace(/[:.]/g, '-');
  const latestJsonPath = path.join(metricsDir, 'weekly-duration-budget-recommendations-latest.json');
  const latestMdPath = path.join(metricsDir, 'weekly-duration-budget-recommendations-latest.md');
  const historicalJsonPath = path.join(metricsDir, `weekly-duration-budget-recommendations-${stamp}.json`);
  const historicalMdPath = path.join(metricsDir, `weekly-duration-budget-recommendations-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.writeFile(latestMdPath, toMarkdown(payload), 'utf8');

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.writeFile(historicalMdPath, toMarkdown(payload), 'utf8');
  }

  console.log(
    `[weekly-duration-recalibration] runs=${payload.summary.runsAnalyzed} ready=${payload.summary.checksReady}/${payload.summary.checks}`
  );
  console.log(
    `[weekly-duration-recalibration] changed=${payload.summary.checksChanged} pending=${payload.summary.checksPending} status=${payload.summary.status}`
  );
  console.log(
    `[weekly-duration-recalibration] apply=${application.status} changedChecks=${application.changedChecks.length}`
  );
  console.log(`Wrote ${path.relative(root, latestJsonPath)}`);
  console.log(`Wrote ${path.relative(root, latestMdPath)}`);
  if (shouldWriteHistory) {
    console.log(`Wrote ${path.relative(root, historicalJsonPath)}`);
    console.log(`Wrote ${path.relative(root, historicalMdPath)}`);
  }
};

run().catch((error) => {
  console.error('[weekly-duration-recalibration] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
