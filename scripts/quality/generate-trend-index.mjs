import fs from 'node:fs/promises';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const shouldWriteHistory = !args.has('--ci') && !args.has('--no-history');

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

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Trend Index');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('| Trend | Status | Latest Run | Runs Analyzed | Delta vs Prev | JSON | Markdown |');
  lines.push('| --- | --- | --- | ---: | --- | --- | --- |');
  for (const entry of payload.entries) {
    lines.push(
      `| ${entry.label} | ${entry.status.toUpperCase()} | ${entry.latestRun ?? '-'} | ${entry.runCount ?? '-'} | ${entry.deltaText ?? '-'} | \`${entry.latestJson}\` | \`${entry.latestMd}\` |`
    );
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This index points to the latest trend snapshots used for quality/regression review.');
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

const summarize = (payload) => {
  if (!payload || !Array.isArray(payload.runs) || payload.runs.length === 0) {
    return {
      status: 'missing',
      latestRun: null,
      runCount: 0,
      deltaText: null,
    };
  }
  const runs = payload.runs;
  const latest = runs[runs.length - 1];
  const prev = runs.length > 1 ? runs[runs.length - 2] : null;
  const deltaMs =
    prev && Number.isFinite(latest?.totalDurationMs) && Number.isFinite(prev?.totalDurationMs)
      ? latest.totalDurationMs - prev.totalDurationMs
      : null;
  return {
    status: 'ready',
    latestRun: latest?.generatedAt ?? null,
    runCount: runs.length,
    deltaText: formatDelta(deltaMs),
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

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.writeFile(latestMdPath, toMarkdown(payload), 'utf8');

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.writeFile(historicalMdPath, toMarkdown(payload), 'utf8');
  }

  const readyCount = entries.filter((entry) => entry.status === 'ready').length;
  console.log(`[trend-index] ready=${readyCount}/${entries.length}`);
  console.log(`Wrote ${path.relative(root, latestJsonPath)}`);
  console.log(`Wrote ${path.relative(root, latestMdPath)}`);
  if (shouldWriteHistory) {
    console.log(`Wrote ${path.relative(root, historicalJsonPath)}`);
    console.log(`Wrote ${path.relative(root, historicalMdPath)}`);
  }
};

run().catch((error) => {
  console.error('[trend-index] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
