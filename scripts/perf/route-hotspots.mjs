import path from 'node:path';

import { collectMetrics } from '../architecture/lib-metrics.mjs';
import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';
import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';

const args = new Set(process.argv.slice(2));
const root = process.cwd();
const outPath = path.join(root, 'docs', 'metrics', 'route-hotspots.md');
const { noWrite, summaryJson } = parseCommonCheckArgs();

const buildHotspotMarkdown = (metrics) => {
  const lines = [];
  lines.push('# Route Hotspots (Static Heuristic)');
  lines.push('');
  lines.push(`Generated at: ${metrics.generatedAt}`);
  lines.push('');
  lines.push('This report ranks route/page complexity using LOC as a fast heuristic baseline.');
  lines.push('');

  lines.push('## Top API Routes by LOC');
  lines.push('');
  lines.push('| Route | LOC |');
  lines.push('| --- | ---: |');
  for (const route of metrics.api.topRouteHotspots.slice(0, 25)) {
    lines.push(`| \`${route.path}\` | ${route.lines} |`);
  }
  lines.push('');

  lines.push('## Top App Pages by LOC');
  lines.push('');
  lines.push('| Page | LOC |');
  lines.push('| --- | ---: |');
  for (const page of metrics.hotspots.topPagesByLines.slice(0, 25)) {
    lines.push(`| \`${page.path}\` | ${page.lines} |`);
  }
  lines.push('');

  lines.push('## Recommended First Runtime Profiling Targets');
  lines.push('');
  for (const route of metrics.api.topRouteHotspots.slice(0, 10)) {
    lines.push(`- \`${route.path}\``);
  }

  return `${lines.join('\n')}\n`;
};

const buildHotspotSummary = (metrics) => ({
  topApiRouteCount: metrics.api.topRouteHotspots.slice(0, 25).length,
  topPageCount: metrics.hotspots.topPagesByLines.slice(0, 25).length,
  recommendedTargetCount: metrics.api.topRouteHotspots.slice(0, 10).length,
  hottestApiRouteLines: metrics.api.topRouteHotspots[0]?.lines ?? 0,
  hottestPageLines: metrics.hotspots.topPagesByLines[0]?.lines ?? 0,
});

const buildHotspotDetails = (metrics) => ({
  topApiRoutes: metrics.api.topRouteHotspots.slice(0, 25),
  topPages: metrics.hotspots.topPagesByLines.slice(0, 25),
  recommendedProfilingTargets: metrics.api.topRouteHotspots.slice(0, 10),
  metricsGeneratedAt: metrics.generatedAt,
});

const run = async () => {
  const metrics = await collectMetrics({ root });
  const latestMarkdown = path.relative(root, outPath);

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'route-hotspots',
      generatedAt: metrics.generatedAt,
      status: 'ok',
      summary: buildHotspotSummary(metrics),
      details: buildHotspotDetails(metrics),
      paths: noWrite ? null : { latestMarkdown },
      filters: {
        ci: args.has('--ci'),
        historyDisabled: true,
        noWrite,
      },
      notes: ['route hotspots report result'],
    });
    return;
  }

  if (noWrite) {
    console.log('Skipped writing route hotspots report (--no-write).');
    return;
  }

  await writeMetricsMarkdownFile({
    root,
    targetPath: outPath,
    content: buildHotspotMarkdown(metrics),
  });

  console.log(`Wrote ${latestMarkdown}`);
};

run().catch((error) => {
  console.error('[hotspots] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
