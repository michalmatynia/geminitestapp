import fs from 'node:fs/promises';
import path from 'node:path';

import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';
import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';
import {
  findLatestKangurAiTutorBridgeRun,
  getKangurAiTutorBridgeAgeMs,
  getKangurAiTutorBridgeAgeRuns,
  getKangurAiTutorBridgeSignalState,
  runFromWeeklyReportPayload,
  toWeeklyLaneTrendMarkdown,
} from './lib/weekly-lane-trend.mjs';

const argv = process.argv.slice(2);
const args = new Set(argv);
const { noWrite, shouldWriteHistory, summaryJson } = parseCommonCheckArgs(argv);
const maxRunsArg = [...args].find((arg) => arg.startsWith('--max-runs='));
const maxRuns = Number.parseInt(maxRunsArg?.split('=')[1] ?? '10', 10);

const root = process.cwd();
const metricsDir = path.join(root, 'docs', 'metrics');
const latestWeeklyReportPath = path.join(metricsDir, 'weekly-quality-latest.json');

const countStructuredChecks = (run) =>
  Object.values(run?.checks ?? {}).filter((check) => Boolean(check?.structuredSummaryText)).length;

const isPreferredLatestSource = (run) => run?.sourceFile === 'weekly-quality-latest.json';

const pickPreferredRunSnapshot = (current, candidate) => {
  if (!current) {
    return candidate;
  }

  const currentHasBridge = Boolean(current.kangurAiTutorBridge);
  const candidateHasBridge = Boolean(candidate.kangurAiTutorBridge);
  if (candidateHasBridge !== currentHasBridge) {
    return candidateHasBridge ? candidate : current;
  }

  const currentStructuredCount = countStructuredChecks(current);
  const candidateStructuredCount = countStructuredChecks(candidate);
  if (candidateStructuredCount !== currentStructuredCount) {
    return candidateStructuredCount > currentStructuredCount ? candidate : current;
  }

  const currentIsLatestSource = isPreferredLatestSource(current);
  const candidateIsLatestSource = isPreferredLatestSource(candidate);
  if (candidateIsLatestSource !== currentIsLatestSource) {
    return candidateIsLatestSource ? candidate : current;
  }

  return current;
};

const collectRunFiles = async () => {
  const files = await fs.readdir(metricsDir);
  const historicalFiles = files
    .filter(
      (file) =>
        file.startsWith('weekly-quality-') &&
        !file.startsWith('weekly-quality-trend-') &&
        file.endsWith('.json') &&
        file !== 'weekly-quality-latest.json'
    )
    .map((file) => path.join(metricsDir, file));

  try {
    await fs.access(latestWeeklyReportPath);
    historicalFiles.push(latestWeeklyReportPath);
  } catch {
    // Ignore missing latest report snapshot and continue with history only.
  }

  return historicalFiles;
};

const loadRuns = async (files) => {
  const runsByGeneratedAt = new Map();
  for (const file of files) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      const parsed = JSON.parse(raw);
      const run = runFromWeeklyReportPayload(path.basename(file), parsed);
      if (!run) {
        continue;
      }
      const existing = runsByGeneratedAt.get(run.generatedAt) ?? null;
      runsByGeneratedAt.set(run.generatedAt, pickPreferredRunSnapshot(existing, run));
    } catch {
      // Ignore invalid historical files and continue.
    }
  }

  return [...runsByGeneratedAt.values()]
    .sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime())
    .slice(-Math.max(1, Number.isFinite(maxRuns) ? maxRuns : 10));
};

const run = async () => {
  await fs.mkdir(metricsDir, { recursive: true });
  const files = await collectRunFiles();
  const runs = await loadRuns(files);

  const latestBridgeRun = findLatestKangurAiTutorBridgeRun(runs);
  const latestAvailableKangurAiTutorBridgeAlertStatus =
    latestBridgeRun?.kangurAiTutorBridge?.alertStatus ?? null;
  const latestAvailableKangurAiTutorBridgeSummaryText =
    latestBridgeRun?.kangurAiTutorBridgeSummaryText ?? null;
  const latestAvailableKangurAiTutorBridgeRun = latestBridgeRun?.generatedAt ?? null;
  const latestAvailableKangurAiTutorBridgeAgeMs = getKangurAiTutorBridgeAgeMs(
    runs,
    latestAvailableKangurAiTutorBridgeRun
  );
  const latestAvailableKangurAiTutorBridgeAgeRuns = getKangurAiTutorBridgeAgeRuns(
    runs,
    latestAvailableKangurAiTutorBridgeRun
  );
  const latestAvailableKangurAiTutorBridgeState = getKangurAiTutorBridgeSignalState(
    runs,
    latestAvailableKangurAiTutorBridgeRun
  );
  const latestKangurAiTutorBridgeState =
    runs.length === 0 ? 'missing' : runs[runs.length - 1]?.kangurAiTutorBridge ? 'current' : 'absent';

  const summary = {
    runCount: runs.length,
    oldestRun: runs[0]?.generatedAt ?? null,
    newestRun: runs[runs.length - 1]?.generatedAt ?? null,
    latestKangurAiTutorBridgeState,
    latestAvailableKangurAiTutorBridgeAlertStatus,
    latestAvailableKangurAiTutorBridgeSummaryText,
    latestAvailableKangurAiTutorBridgeRun,
    latestAvailableKangurAiTutorBridgeState,
    latestAvailableKangurAiTutorBridgeAgeMs,
    latestAvailableKangurAiTutorBridgeAgeRuns,
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    summary,
    runs,
  };

  const stamp = payload.generatedAt.replace(/[:.]/g, '-');
  const latestJsonPath = path.join(metricsDir, 'weekly-quality-trend-latest.json');
  const latestMdPath = path.join(metricsDir, 'weekly-quality-trend-latest.md');
  const historicalJsonPath = path.join(metricsDir, `weekly-quality-trend-${stamp}.json`);
  const historicalMdPath = path.join(metricsDir, `weekly-quality-trend-${stamp}.md`);

  const latestTotalDurationMs = runs[runs.length - 1]?.totalDurationMs ?? null;
  const latestKangurAiTutorBridgeAlertStatus =
    runs[runs.length - 1]?.kangurAiTutorBridge?.alertStatus ?? null;
  const latestKangurAiTutorBridgeSummaryText =
    runs[runs.length - 1]?.kangurAiTutorBridgeSummaryText ?? null;
  const structuredCheckCount = runs.reduce(
    (acc, runSnapshot) =>
      acc +
      Object.values(runSnapshot.checks).filter((check) => Boolean(check?.structuredSummaryText)).length,
    0
  );
  const paths = noWrite
    ? null
    : {
        latestJson: path.relative(root, latestJsonPath),
        latestMarkdown: path.relative(root, latestMdPath),
        historicalJson: shouldWriteHistory ? path.relative(root, historicalJsonPath) : null,
        historicalMarkdown: shouldWriteHistory ? path.relative(root, historicalMdPath) : null,
      };

  if (!noWrite) {
    await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await writeMetricsMarkdownFile({
      root,
      targetPath: latestMdPath,
      content: toWeeklyLaneTrendMarkdown(payload),
    });

    if (shouldWriteHistory) {
      await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      await writeMetricsMarkdownFile({
        root,
        targetPath: historicalMdPath,
        content: toWeeklyLaneTrendMarkdown(payload),
      });
    }
  }

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'weekly-quality-trend',
      generatedAt: payload.generatedAt,
      summary: {
        runCount: summary.runCount,
        oldestRun: summary.oldestRun,
        newestRun: summary.newestRun,
        latestTotalDurationMs,
        latestKangurAiTutorBridgeState,
        latestKangurAiTutorBridgeAlertStatus,
        latestKangurAiTutorBridgeSummaryText,
        latestAvailableKangurAiTutorBridgeAlertStatus,
        latestAvailableKangurAiTutorBridgeSummaryText,
        latestAvailableKangurAiTutorBridgeRun,
        latestAvailableKangurAiTutorBridgeState,
        latestAvailableKangurAiTutorBridgeAgeMs,
        latestAvailableKangurAiTutorBridgeAgeRuns,
        structuredCheckCount,
      },
      details: {
        runs: payload.runs,
      },
      paths,
      filters: {
        maxRuns,
        historyDisabled: !shouldWriteHistory,
        noWrite,
        ci: args.has('--ci'),
      },
      notes: ['weekly lane trend snapshot'],
    });
    return;
  }

  console.log(`[weekly-trend] runs=${summary.runCount} oldest=${summary.oldestRun ?? '-'} newest=${summary.newestRun ?? '-'}`);
  if (paths) {
    console.log(`Wrote ${paths.latestJson}`);
    console.log(`Wrote ${paths.latestMarkdown}`);
    if (paths.historicalJson) {
      console.log(`Wrote ${paths.historicalJson}`);
      console.log(`Wrote ${paths.historicalMarkdown}`);
    }
  } else {
    console.log('Skipped writing weekly lane trend artifacts (--no-write).');
  }
};

run().catch((error) => {
  console.error('[weekly-trend] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
