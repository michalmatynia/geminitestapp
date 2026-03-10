import fs from 'node:fs/promises';
import path from 'node:path';

import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';
import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';
import { summarizeKangurAiTutorBridgeSignal } from './lib/weekly-lane-trend.mjs';

const argv = process.argv.slice(2);
const args = new Set(argv);
const { noWrite, shouldWriteHistory, summaryJson } = parseCommonCheckArgs(argv);

const root = process.cwd();
const metricsDir = path.join(root, 'docs', 'metrics');

const ENTRIES = [
  {
    id: 'weekly-lane',
    label: 'Weekly Lane Trend',
    latestJson: 'weekly-quality-trend-latest.json',
    latestMd: 'weekly-quality-trend-latest.md',
  },
  {
    id: 'unit-domains',
    label: 'Unit Domain Trend',
    latestJson: 'unit-domain-timings-trend-latest.json',
    latestMd: 'unit-domain-timings-trend-latest.md',
  },
  {
    id: 'lint-domains',
    label: 'Lint Domain Trend',
    latestJson: 'lint-domain-checks-trend-latest.json',
    latestMd: 'lint-domain-checks-trend-latest.md',
  },
];

const readJsonIfExists = async (relativePath) => {
  try {
    const absolutePath = path.join(metricsDir, relativePath);
    const raw = await fs.readFile(absolutePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const countSignalStates = (entries) => ({
  currentSignalCount: entries.filter((entry) => entry.latestSignalState === 'current').length,
  staleSignalCount: entries.filter((entry) => entry.latestSignalState === 'stale').length,
  absentSignalCount: entries.filter((entry) => entry.latestSignalState === 'absent').length,
  missingSignalStateCount: entries.filter((entry) => entry.latestSignalState === 'missing').length,
});

const toMarkdown = (payload) => {
  const {
    currentSignalCount,
    staleSignalCount,
    absentSignalCount,
    missingSignalStateCount,
  } = countSignalStates(payload.entries);
  const lines = [];
  lines.push('# Trend Index');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push(
    `Signal states: ${currentSignalCount} current / ${staleSignalCount} stale / ${absentSignalCount} absent / ${missingSignalStateCount} missing`
  );
  lines.push('');
  lines.push('| Trend | Status | Latest Run | Signal Run | Signal State | Signal Age | Runs Analyzed | Delta vs Prev | Alert | Latest Signal | JSON | Markdown |');
  lines.push('| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |');
  for (const entry of payload.entries) {
    lines.push(
      `| ${entry.label} | ${entry.status.toUpperCase()} | ${entry.latestRun ?? '-'} | ${entry.latestSignalRun ?? '-'} | ${entry.latestSignalState ?? '-'} | ${formatSignalAge(entry.latestSignalState, entry.latestSignalAgeRuns, entry.latestSignalAgeMs) ?? '-'} | ${entry.runCount ?? '-'} | ${entry.deltaText ?? '-'} | ${entry.latestAlertStatus ?? '-'} | ${entry.latestSignal ?? '-'} | \`${entry.latestJson}\` | \`${entry.latestMd}\` |`
    );
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This index points to the latest trend snapshots used for quality/regression review.');
  lines.push('- Weekly lane entries surface Kangur AI Tutor bridge alert severity when weekly trend artifacts include that signal.');
  lines.push('- `Signal State` is `current` when the newest weekly run carries the bridge signal, `stale` when it is reused from an older weekly artifact, and `absent` when no bridge signal exists.');
  lines.push('- `Signal Age` quantifies how old a reused bridge signal is when the state is `stale`.');
  lines.push('- Missing entries usually mean the corresponding trend generator has not been executed yet.');
  return `${lines.join('\n')}\n`;
};

const formatDuration = (ms) => {
  if (!Number.isFinite(ms)) return null;
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  return `${(sec / 60).toFixed(1)}m`;
};

const formatDelta = (deltaMs) => {
  if (!Number.isFinite(deltaMs)) return null;
  if (deltaMs === 0) return '0ms';
  return `${deltaMs > 0 ? '+' : '-'}${formatDuration(Math.abs(deltaMs))}`;
};

const formatSignalAge = (signalState, ageRuns, ageMs) => {
  if (signalState === 'missing' || signalState === 'absent') {
    return null;
  }

  if (Number.isFinite(ageRuns) && Number(ageRuns) === 0) {
    return '0 runs';
  }

  if (Number.isFinite(ageRuns) && Number.isFinite(ageMs)) {
    const runCount = Number(ageRuns);
    const runLabel = runCount === 1 ? 'run' : 'runs';
    return `${runCount} ${runLabel} / ${formatDuration(Number(ageMs))}`;
  }

  if (Number.isFinite(ageRuns)) {
    const runCount = Number(ageRuns);
    const runLabel = runCount === 1 ? 'run' : 'runs';
    return `${runCount} ${runLabel}`;
  }

  if (Number.isFinite(ageMs)) {
    return formatDuration(Number(ageMs));
  }

  return null;
};

const readNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const resolveTrendRuns = (payload) => {
  if (Array.isArray(payload?.runs)) {
    return payload.runs;
  }
  if (Array.isArray(payload?.details?.runs)) {
    return payload.details.runs;
  }
  return [];
};

const resolveLatestKangurAiTutorBridgeSignal = (payload) => {
  const summarySignal = readNonEmptyString(payload?.summary?.latestKangurAiTutorBridgeSummaryText);
  if (summarySignal) {
    return summarySignal;
  }

  const latestAvailableSummarySignal = readNonEmptyString(
    payload?.summary?.latestAvailableKangurAiTutorBridgeSummaryText
  );
  if (latestAvailableSummarySignal) {
    return latestAvailableSummarySignal;
  }

  const runs = resolveTrendRuns(payload);
  const latestRun = runs[runs.length - 1] ?? null;
  const latestRunSignal = readNonEmptyString(latestRun?.kangurAiTutorBridgeSummaryText);
  if (latestRunSignal) {
    return latestRunSignal;
  }

  return summarizeKangurAiTutorBridgeSignal(latestRun?.kangurAiTutorBridge ?? null);
};

const resolveLatestKangurAiTutorBridgeAlertStatus = (payload) => {
  const summaryStatus = readNonEmptyString(payload?.summary?.latestKangurAiTutorBridgeAlertStatus);
  if (summaryStatus) {
    return summaryStatus;
  }

  const latestAvailableSummaryStatus = readNonEmptyString(
    payload?.summary?.latestAvailableKangurAiTutorBridgeAlertStatus
  );
  if (latestAvailableSummaryStatus) {
    return latestAvailableSummaryStatus;
  }

  const runs = resolveTrendRuns(payload);
  const latestRun = runs[runs.length - 1] ?? null;
  return readNonEmptyString(latestRun?.kangurAiTutorBridge?.alertStatus);
};

const resolveLatestKangurAiTutorBridgeSignalRun = (payload) => {
  const summaryRun = readNonEmptyString(payload?.summary?.latestAvailableKangurAiTutorBridgeRun);
  if (summaryRun) {
    return summaryRun;
  }

  const runs = resolveTrendRuns(payload);
  for (let index = runs.length - 1; index >= 0; index -= 1) {
    const run = runs[index];
    if (
      run &&
      (readNonEmptyString(run?.kangurAiTutorBridgeSummaryText) ||
        readNonEmptyString(run?.kangurAiTutorBridge?.alertStatus))
    ) {
      return readNonEmptyString(run.generatedAt);
    }
  }

  return null;
};

const resolveLatestKangurAiTutorBridgeSignalAgeMs = (payload) => {
  if (Number.isFinite(payload?.summary?.latestAvailableKangurAiTutorBridgeAgeMs)) {
    return Number(payload.summary.latestAvailableKangurAiTutorBridgeAgeMs);
  }

  const runs = resolveTrendRuns(payload);
  const latestRun = runs[runs.length - 1] ?? null;
  const signalRun = resolveLatestKangurAiTutorBridgeSignalRun(payload);
  const latestRunMs =
    typeof latestRun?.generatedAt === 'string' ? Date.parse(latestRun.generatedAt) : Number.NaN;
  const signalRunMs = typeof signalRun === 'string' ? Date.parse(signalRun) : Number.NaN;

  if (!Number.isFinite(latestRunMs) || !Number.isFinite(signalRunMs)) {
    return null;
  }

  return Math.max(0, latestRunMs - signalRunMs);
};

const resolveLatestKangurAiTutorBridgeSignalAgeRuns = (payload) => {
  if (Number.isFinite(payload?.summary?.latestAvailableKangurAiTutorBridgeAgeRuns)) {
    return Number(payload.summary.latestAvailableKangurAiTutorBridgeAgeRuns);
  }

  const runs = resolveTrendRuns(payload);
  const signalRun = resolveLatestKangurAiTutorBridgeSignalRun(payload);
  if (typeof signalRun !== 'string' || runs.length === 0) {
    return null;
  }

  const signalIndex = runs.findIndex((run) => run?.generatedAt === signalRun);
  if (signalIndex === -1) {
    return null;
  }

  return Math.max(0, runs.length - 1 - signalIndex);
};

const deriveLatestSignalState = ({ status, latestRun, latestSignal, latestSignalRun }) => {
  if (status === 'missing') {
    return 'missing';
  }

  if (typeof latestSignal !== 'string' || latestSignal.trim().length === 0) {
    return 'absent';
  }

  if (
    typeof latestSignalRun === 'string' &&
    typeof latestRun === 'string' &&
    latestSignalRun !== latestRun
  ) {
    return 'stale';
  }

  return 'current';
};

const summarize = (payload) => {
  const runs = resolveTrendRuns(payload);
  if (!payload || runs.length === 0) {
    return {
      status: 'missing',
      latestRun: null,
      runCount: 0,
      deltaText: null,
      latestSignal: null,
      latestAlertStatus: null,
      latestSignalRun: null,
      latestSignalState: 'missing',
      latestSignalAgeMs: null,
      latestSignalAgeRuns: null,
    };
  }
  const latest = runs[runs.length - 1];
  const prev = runs.length > 1 ? runs[runs.length - 2] : null;
  const deltaMs =
    prev && Number.isFinite(latest?.totalDurationMs) && Number.isFinite(prev?.totalDurationMs)
      ? latest.totalDurationMs - prev.totalDurationMs
      : null;
  const summary = {
    status: 'ready',
    latestRun: latest?.generatedAt ?? null,
    runCount: runs.length,
    deltaText: formatDelta(deltaMs),
    latestSignal: resolveLatestKangurAiTutorBridgeSignal(payload),
    latestAlertStatus: resolveLatestKangurAiTutorBridgeAlertStatus(payload),
    latestSignalRun: resolveLatestKangurAiTutorBridgeSignalRun(payload),
  };
  return {
    ...summary,
    latestSignalState: deriveLatestSignalState(summary),
    latestSignalAgeMs: resolveLatestKangurAiTutorBridgeSignalAgeMs(payload),
    latestSignalAgeRuns: resolveLatestKangurAiTutorBridgeSignalAgeRuns(payload),
  };
};

const run = async () => {
  await fs.mkdir(metricsDir, { recursive: true });

  const entries = [];
  for (const entry of ENTRIES) {
    const trendPayload = await readJsonIfExists(entry.latestJson);
    const summary = summarize(trendPayload);
    entries.push({
      ...entry,
      ...summary,
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    entries,
  };

  const stamp = payload.generatedAt.replace(/[:.]/g, '-');
  const latestJsonPath = path.join(metricsDir, 'trend-index-latest.json');
  const latestMdPath = path.join(metricsDir, 'trend-index-latest.md');
  const historicalJsonPath = path.join(metricsDir, `trend-index-${stamp}.json`);
  const historicalMdPath = path.join(metricsDir, `trend-index-${stamp}.md`);

  const readyCount = entries.filter((entry) => entry.status === 'ready').length;
  const missingCount = entries.filter((entry) => entry.status === 'missing').length;
  const entriesWithSignals = entries.filter((entry) => typeof entry.latestSignal === 'string').length;
  const {
    currentSignalCount,
    staleSignalCount,
    absentSignalCount,
    missingSignalStateCount,
  } = countSignalStates(entries);
  const weeklyLaneEntry = entries.find((entry) => entry.id === 'weekly-lane') ?? null;
  const latestWeeklyLaneSignal = weeklyLaneEntry?.latestSignal ?? null;
  const latestWeeklyLaneAlertStatus = weeklyLaneEntry?.latestAlertStatus ?? null;
  const latestWeeklyLaneSignalRun = weeklyLaneEntry?.latestSignalRun ?? null;
  const latestWeeklyLaneSignalState = weeklyLaneEntry?.latestSignalState ?? 'missing';
  const latestWeeklyLaneSignalAgeMs = weeklyLaneEntry?.latestSignalAgeMs ?? null;
  const latestWeeklyLaneSignalAgeRuns = weeklyLaneEntry?.latestSignalAgeRuns ?? null;
  const latestWeeklyLaneSignalIsStale =
    typeof latestWeeklyLaneSignalRun === 'string' &&
    typeof weeklyLaneEntry?.latestRun === 'string' &&
    latestWeeklyLaneSignalRun !== weeklyLaneEntry.latestRun;
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
  }

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'trend-index',
      generatedAt: payload.generatedAt,
      summary: {
        readyCount,
        missingCount,
        totalEntries: entries.length,
        entriesWithSignals,
        currentSignalCount,
        staleSignalCount,
        absentSignalCount,
        missingSignalStateCount,
        latestWeeklyLaneSignal,
        latestWeeklyLaneAlertStatus,
        latestWeeklyLaneSignalRun,
        latestWeeklyLaneSignalState,
        latestWeeklyLaneSignalAgeMs,
        latestWeeklyLaneSignalAgeRuns,
        latestWeeklyLaneSignalIsStale,
      },
      details: {
        entries,
      },
      paths,
      filters: {
        historyDisabled: !shouldWriteHistory,
        noWrite,
        ci: args.has('--ci'),
      },
      notes: ['quality trend index snapshot'],
    });
    return;
  }

  console.log(`[trend-index] ready=${readyCount}/${entries.length}`);
  if (paths) {
    console.log(`Wrote ${paths.latestJson}`);
    console.log(`Wrote ${paths.latestMarkdown}`);
    if (paths.historicalJson) {
      console.log(`Wrote ${paths.historicalJson}`);
      console.log(`Wrote ${paths.historicalMarkdown}`);
    }
  } else {
    console.log('Skipped writing trend index artifacts (--no-write).');
  }
};

run().catch((error) => {
  console.error('[trend-index] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
