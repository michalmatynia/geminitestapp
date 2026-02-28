import fs from 'node:fs/promises';
import path from 'node:path';

import { collectMetrics, formatCompactSummary } from './lib-metrics.mjs';

const args = new Set(process.argv.slice(2));
const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');

const writeJson = async (targetPath, value) => {
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const generateMarkdown = (metrics) => {
  const largest = metrics.source.largestFile;
  const percentExplicitCache = metrics.api.totalRoutes
    ? ((metrics.api.routesWithExplicitCachePolicy / metrics.api.totalRoutes) * 100).toFixed(1)
    : '0.0';

  const lines = [];
  lines.push('# Architecture & Performance Baseline');
  lines.push('');
  lines.push(`Generated at: ${metrics.generatedAt}`);
  lines.push('');
  lines.push('## Snapshot');
  lines.push('');
  lines.push(`- Source files: ${metrics.source.totalFiles}`);
  lines.push(`- Source lines: ${metrics.source.totalLines}`);
  lines.push(`- use client files: ${metrics.source.useClientFiles}`);
  lines.push(`- Files >= 1000 LOC: ${metrics.source.filesOver1000}`);
  lines.push(`- Files >= 1500 LOC: ${metrics.source.filesOver1500}`);
  if (largest) {
    lines.push(`- Largest file: \`${largest.path}\` (${largest.lines} LOC)`);
  }
  lines.push(`- API routes: ${metrics.api.totalRoutes}`);
  lines.push(`- API delegated server routes: ${metrics.api.delegatedServerRoutes}`);
  lines.push(`- API routes without apiHandler/delegation: ${metrics.api.routesWithoutApiHandler}`);
  lines.push(
    `- API explicit cache policy coverage: ${metrics.api.routesWithExplicitCachePolicy}/${metrics.api.totalRoutes} (${percentExplicitCache}%)`
  );
  lines.push(`- Cross-feature dependency pairs: ${metrics.architecture.crossFeatureEdgePairs}`);
  lines.push(`- Shared -> features imports: ${metrics.imports.sharedToFeaturesTotalImports}`);
  lines.push(`- setInterval occurrences: ${metrics.runtime.setIntervalOccurrences}`);
  lines.push('');
  lines.push('## Top API Hotspots (by LOC)');
  lines.push('');
  lines.push('| Route | LOC |');
  lines.push('| --- | ---: |');
  for (const route of metrics.api.topRouteHotspots.slice(0, 15)) {
    lines.push(`| \`${route.path}\` | ${route.lines} |`);
  }
  lines.push('');
  lines.push('## Top Cross-Feature Dependencies');
  lines.push('');
  lines.push('| Edge | References |');
  lines.push('| --- | ---: |');
  for (const edge of metrics.architecture.topCrossFeatureEdges.slice(0, 15)) {
    lines.push(`| \`${edge.edge}\` | ${edge.references} |`);
  }
  lines.push('');
  lines.push('## Top File Hotspots (by LOC)');
  lines.push('');
  lines.push('| File | LOC |');
  lines.push('| --- | ---: |');
  for (const file of metrics.hotspots.topFilesByLines.slice(0, 20)) {
    lines.push(`| \`${file.path}\` | ${file.lines} |`);
  }

  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const metrics = await collectMetrics({ root });
  await fs.mkdir(outDir, { recursive: true });

  const stamp = metrics.generatedAt.replace(/[:.]/g, '-');
  const latestJsonPath = path.join(outDir, 'baseline-latest.json');
  const latestMdPath = path.join(outDir, 'baseline-latest.md');
  const historicalJsonPath = path.join(outDir, `baseline-${stamp}.json`);

  await writeJson(latestJsonPath, metrics);
  await fs.writeFile(latestMdPath, generateMarkdown(metrics), 'utf8');

  if (!args.has('--ci')) {
    await writeJson(historicalJsonPath, metrics);
  }

  console.log(formatCompactSummary(metrics));
  console.log(`Wrote ${path.relative(root, latestJsonPath)}`);
  console.log(`Wrote ${path.relative(root, latestMdPath)}`);
  if (!args.has('--ci')) {
    console.log(`Wrote ${path.relative(root, historicalJsonPath)}`);
  }

  if (args.has('--json')) {
    console.log(JSON.stringify(metrics, null, 2));
  }
};

run().catch((error) => {
  console.error('[metrics] failed to collect baseline metrics');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
