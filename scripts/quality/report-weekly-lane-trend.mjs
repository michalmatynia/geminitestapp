import fs from 'node:fs/promises';
import path from 'node:path';

import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';

const args = new Set(process.argv.slice(2));
const shouldWriteHistory = !args.has('--ci') && !args.has('--no-history');
const maxRunsArg = [...args].find((arg) => arg.startsWith('--max-runs='));
const maxRuns = Number.parseInt(maxRunsArg?.split('=')[1] ?? '10', 10);

const root = process.cwd();
const metricsDir = path.join(root, 'docs', 'metrics');

const CHECK_IDS = [
  'build',
  'lint',
  'lintDomains',
  'typecheck',
  'criticalFlows',
  'securitySmoke',
  'unitDomains',
  'fullUnit',
  'e2e',
  'guardrails',
  'uiConsolidation',
  'observability',
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

const collectRunFiles = async () => {
  const files = await fs.readdir(metricsDir);
  return files
    .filter(
      (file) =>
        file.startsWith('weekly-quality-') &&
        !file.startsWith('weekly-quality-trend-') &&
        file.endsWith('.json') &&
        file !== 'weekly-quality-latest.json'
    )
    .map((file) => path.join(metricsDir, file));
};

const loadRuns = async (files) => {
  const runs = [];
  for (const file of files) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      const parsed = JSON.parse(raw);
      const generatedAt = parsed.generatedAt;
      if (!generatedAt) {
        continue;
      }
      const checks = Array.isArray(parsed.checks) ? parsed.checks : [];
      const checkMap = Object.fromEntries(checks.map((check) => [check.id, check]));
      const totalDurationMs = checks.reduce(
        (acc, check) => acc + (Number.isFinite(check.durationMs) ? check.durationMs : 0),
        0
      );
      runs.push({
        sourceFile: path.basename(file),
        generatedAt,
        summary: parsed.summary ?? null,
        passRates: parsed.passRates ?? null,
        totalDurationMs,
        checks: Object.fromEntries(
          CHECK_IDS.map((id) => {
            const check = checkMap[id];
            return [
              id,
              check
                ? {
                    status: check.status,
                    durationMs: check.durationMs,
                    exitCode: check.exitCode,
                  }
                : null,
            ];
          })
        ),
      });
    } catch {
      // Ignore invalid historical files and continue.
    }
  }

  return runs
    .sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime())
    .slice(-Math.max(1, Number.isFinite(maxRuns) ? maxRuns : 10));
};

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Weekly Lane Duration Trend');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push(`Runs analyzed: ${payload.summary.runCount}`);
  lines.push('');
  lines.push('## Run Timeline');
  lines.push('');
  lines.push('| Run | Total Duration | Passed | Failed | Timed out | Skipped |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const run of payload.runs) {
    lines.push(
      `| ${run.generatedAt} | ${formatDuration(run.totalDurationMs)} | ${run.summary?.passed ?? '-'} | ${run.summary?.failed ?? '-'} | ${run.summary?.timedOut ?? '-'} | ${run.summary?.skipped ?? '-'} |`
    );
  }
  lines.push('');

  for (const checkId of CHECK_IDS) {
    lines.push(`## Check: ${checkId}`);
    lines.push('');
    lines.push('| Run | Status | Duration | Exit |');
    lines.push('| --- | --- | ---: | ---: |');
    for (const run of payload.runs) {
      const check = run.checks[checkId];
      lines.push(
        `| ${run.generatedAt} | ${(check?.status ?? 'n/a').toUpperCase()} | ${formatDuration(check?.durationMs ?? 0)} | ${check?.exitCode ?? '-'} |`
      );
    }
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  lines.push('- This trend report summarizes historical `weekly-quality-*.json` runs.');
  lines.push('- Use this to tune per-check timeouts and detect weekly lane runtime drift.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  await fs.mkdir(metricsDir, { recursive: true });
  const files = await collectRunFiles();
  const runs = await loadRuns(files);

  const summary = {
    runCount: runs.length,
    oldestRun: runs[0]?.generatedAt ?? null,
    newestRun: runs[runs.length - 1]?.generatedAt ?? null,
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

  console.log(`[weekly-trend] runs=${summary.runCount} oldest=${summary.oldestRun ?? '-'} newest=${summary.newestRun ?? '-'}`);
  console.log(`Wrote ${path.relative(root, latestJsonPath)}`);
  console.log(`Wrote ${path.relative(root, latestMdPath)}`);
  if (shouldWriteHistory) {
    console.log(`Wrote ${path.relative(root, historicalJsonPath)}`);
    console.log(`Wrote ${path.relative(root, historicalMdPath)}`);
  }
};

run().catch((error) => {
  console.error('[weekly-trend] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
