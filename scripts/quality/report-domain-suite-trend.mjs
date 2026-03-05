import fs from 'node:fs/promises';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const shouldWriteHistory = !args.has('--ci') && !args.has('--no-history');

const getArgValue = (name, fallback) => {
  const hit = [...args].find((arg) => arg.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const value = hit.slice(name.length + 3).trim();
  return value || fallback;
};

const suite = getArgValue('suite', '');
const windowDays = Number.parseInt(getArgValue('days', '7'), 10);
const maxRuns = Number.parseInt(getArgValue('max-runs', '20'), 10);

const SUITES = {
  'unit-domain-timings': {
    label: 'Unit Domain Timings',
    sourcePrefix: 'unit-domain-timings-',
    trendPrefix: 'unit-domain-timings-trend-',
    notes: [
      'Tracks runtime drift of deterministic unit domain suites.',
      'Use this trend to catch regressions before full unit lane latency spikes.',
    ],
  },
  'lint-domain-checks': {
    label: 'Lint Domain Checks',
    sourcePrefix: 'lint-domain-checks-',
    trendPrefix: 'lint-domain-checks-trend-',
    notes: [
      'Tracks lint gate stability by domain instead of one long global lint run.',
      'Use this trend to identify domain-specific lint regressions quickly.',
    ],
  },
};

if (!suite || !SUITES[suite]) {
  console.error(
    `[domain-suite-trend] invalid or missing --suite. Allowed: ${Object.keys(SUITES).join(', ')}`
  );
  process.exit(1);
}

const cfg = SUITES[suite];
const root = process.cwd();
const metricsDir = path.join(root, 'docs', 'metrics');
const nowMs = Date.now();
const windowMs = Math.max(1, Number.isFinite(windowDays) ? windowDays : 7) * 24 * 60 * 60 * 1000;

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  return `${(sec / 60).toFixed(1)}m`;
};

const formatDelta = (deltaMs) => {
  if (!Number.isFinite(deltaMs) || deltaMs === 0) return '0ms';
  const sign = deltaMs > 0 ? '+' : '-';
  return `${sign}${formatDuration(Math.abs(deltaMs))}`;
};

const collectSourceFiles = async () => {
  const files = await fs.readdir(metricsDir);
  return files
    .filter((file) => file.endsWith('.json'))
    .filter((file) => file.startsWith(cfg.sourcePrefix))
    .filter((file) => !file.startsWith(cfg.trendPrefix))
    .map((file) => path.join(metricsDir, file));
};

const runFromPayload = (fileName, payload) => {
  const generatedAt = payload?.generatedAt;
  if (!generatedAt) return null;

  const results = Array.isArray(payload.results) ? payload.results : [];
  const domains = results.map((entry) => ({
    id: entry.id ?? null,
    name: entry.name ?? entry.id ?? 'unknown',
    status: entry.status ?? 'unknown',
    durationMs: Number.isFinite(entry.durationMs) ? entry.durationMs : 0,
    exitCode: entry.exitCode ?? null,
  }));

  const totalDurationMs = Number.isFinite(payload?.summary?.totalDurationMs)
    ? payload.summary.totalDurationMs
    : domains.reduce((acc, domain) => acc + domain.durationMs, 0);

  const statusSummary = {
    total: Number.isFinite(payload?.summary?.total) ? payload.summary.total : domains.length,
    passed: Number.isFinite(payload?.summary?.passed)
      ? payload.summary.passed
      : domains.filter((domain) => domain.status === 'pass').length,
    failed: Number.isFinite(payload?.summary?.failed)
      ? payload.summary.failed
      : domains.filter((domain) => domain.status === 'fail').length,
    timedOut: Number.isFinite(payload?.summary?.timedOut)
      ? payload.summary.timedOut
      : domains.filter((domain) => domain.status === 'timeout').length,
    skipped: Number.isFinite(payload?.summary?.skipped)
      ? payload.summary.skipped
      : domains.filter((domain) => domain.status === 'skipped').length,
  };

  return {
    sourceFile: fileName,
    generatedAt,
    totalDurationMs,
    statusSummary,
    domains,
  };
};

const loadRuns = async (files) => {
  const byGeneratedAt = new Map();

  for (const file of files) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      const payload = JSON.parse(raw);
      const run = runFromPayload(path.basename(file), payload);
      if (!run) continue;

      const existing = byGeneratedAt.get(run.generatedAt);
      if (!existing) {
        byGeneratedAt.set(run.generatedAt, run);
        continue;
      }

      // Prefer the explicit latest snapshot when duplicate timestamps exist.
      const existingLatest = existing.sourceFile.endsWith('latest.json');
      const currentLatest = run.sourceFile.endsWith('latest.json');
      if (!existingLatest && currentLatest) {
        byGeneratedAt.set(run.generatedAt, run);
      }
    } catch {
      // Ignore unreadable/invalid files and continue.
    }
  }

  return [...byGeneratedAt.values()]
    .filter((run) => nowMs - new Date(run.generatedAt).getTime() <= windowMs)
    .sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime())
    .slice(-Math.max(1, Number.isFinite(maxRuns) ? maxRuns : 20));
};

const domainIdsInOrder = (runs) => {
  const seen = new Set();
  const ordered = [];
  for (const run of runs) {
    for (const domain of run.domains) {
      if (!domain.id || seen.has(domain.id)) continue;
      seen.add(domain.id);
      ordered.push(domain.id);
    }
  }
  return ordered;
};

const toMarkdown = (payload) => {
  const lines = [];
  lines.push(`# ${cfg.label} Trend`);
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push(`Window: last ${payload.windowDays} day(s)`);
  lines.push(`Runs analyzed: ${payload.summary.runCount}`);
  lines.push('');

  lines.push('## Run Timeline');
  lines.push('');
  lines.push('| Run | Total Duration | Delta vs Prev | Passed | Failed | Timed out | Skipped |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');

  let prevTotal = null;
  for (const run of payload.runs) {
    const delta = prevTotal === null ? 'n/a' : formatDelta(run.totalDurationMs - prevTotal);
    lines.push(
      `| ${run.generatedAt} | ${formatDuration(run.totalDurationMs)} | ${delta} | ${run.statusSummary.passed} | ${run.statusSummary.failed} | ${run.statusSummary.timedOut} | ${run.statusSummary.skipped} |`
    );
    prevTotal = run.totalDurationMs;
  }
  lines.push('');

  for (const domainId of payload.domainIds) {
    lines.push(`## Domain: ${domainId}`);
    lines.push('');
    lines.push('| Run | Status | Duration | Delta vs Prev | Exit |');
    lines.push('| --- | --- | ---: | ---: | ---: |');

    let prevDomainDuration = null;
    for (const run of payload.runs) {
      const domain = run.domains.find((entry) => entry.id === domainId) ?? null;
      const durationMs = domain?.durationMs ?? 0;
      const delta = prevDomainDuration === null ? 'n/a' : formatDelta(durationMs - prevDomainDuration);
      lines.push(
        `| ${run.generatedAt} | ${(domain?.status ?? 'n/a').toUpperCase()} | ${formatDuration(durationMs)} | ${delta} | ${domain?.exitCode ?? '-'} |`
      );
      prevDomainDuration = durationMs;
    }
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  for (const note of cfg.notes) {
    lines.push(`- ${note}`);
  }

  return `${lines.join('\n')}\n`;
};

const run = async () => {
  await fs.mkdir(metricsDir, { recursive: true });
  const sourceFiles = await collectSourceFiles();
  const runs = await loadRuns(sourceFiles);
  const domainIds = domainIdsInOrder(runs);

  const summary = {
    runCount: runs.length,
    oldestRun: runs[0]?.generatedAt ?? null,
    newestRun: runs[runs.length - 1]?.generatedAt ?? null,
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    suite,
    label: cfg.label,
    windowDays: Math.max(1, Number.isFinite(windowDays) ? windowDays : 7),
    summary,
    domainIds,
    runs,
  };

  const stamp = payload.generatedAt.replace(/[:.]/g, '-');
  const latestJsonPath = path.join(metricsDir, `${cfg.trendPrefix}latest.json`);
  const latestMdPath = path.join(metricsDir, `${cfg.trendPrefix}latest.md`);
  const historicalJsonPath = path.join(metricsDir, `${cfg.trendPrefix}${stamp}.json`);
  const historicalMdPath = path.join(metricsDir, `${cfg.trendPrefix}${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.writeFile(latestMdPath, toMarkdown(payload), 'utf8');

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.writeFile(historicalMdPath, toMarkdown(payload), 'utf8');
  }

  console.log(
    `[domain-suite-trend] suite=${suite} runs=${summary.runCount} oldest=${summary.oldestRun ?? '-'} newest=${summary.newestRun ?? '-'}`
  );
  console.log(`Wrote ${path.relative(root, latestJsonPath)}`);
  console.log(`Wrote ${path.relative(root, latestMdPath)}`);
  if (shouldWriteHistory) {
    console.log(`Wrote ${path.relative(root, historicalJsonPath)}`);
    console.log(`Wrote ${path.relative(root, historicalMdPath)}`);
  }
};

run().catch((error) => {
  console.error('[domain-suite-trend] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
