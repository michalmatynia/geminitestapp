import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectMetrics, formatCompactSummary } from './lib-metrics.mjs';
import { collectNumericSummaryMetrics } from './lib/scan-summary-metrics.mjs';
import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';
import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';

const args = new Set(process.argv.slice(2));
const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');
const scanPropDrillingScriptPath = fileURLToPath(new URL('./scan-prop-drilling.mjs', import.meta.url));
const { noWrite, shouldWriteHistory, summaryJson } = parseCommonCheckArgs();

const collectPropDrillingSummary = async () => {
  return collectNumericSummaryMetrics({
    cwd: root,
    commandArgs: [
      scanPropDrillingScriptPath,
      '--ci',
      '--no-history',
      '--no-write',
      '--summary-json',
    ],
    sourceName: 'scan-prop-drilling',
    fields: {
      candidateChains: 'candidateChainCount',
      depthGte4Chains: 'highPriorityChainCount',
      forwardingComponents: 'componentsWithForwarding',
    },
  });
};

const writeJson = async (targetPath, value) => {
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const buildMetricsSummary = (metrics) => ({
  sourceFileCount: metrics.source.totalFiles,
  sourceLineCount: metrics.source.totalLines,
  useClientFileCount: metrics.source.useClientFiles,
  filesOver800: metrics.source.filesOver800,
  filesOver1000: metrics.source.filesOver1000,
  filesOver1500: metrics.source.filesOver1500,
  apiRouteCount: metrics.api.totalRoutes,
  delegatedApiRouteCount: metrics.api.delegatedServerRoutes,
  apiRoutesWithoutHandlerCount: metrics.api.routesWithoutApiHandler,
  apiRoutesWithoutExplicitCachePolicyCount: metrics.api.routesWithoutExplicitCachePolicy,
  crossFeatureEdgePairCount: metrics.architecture.crossFeatureEdgePairs,
  sharedToFeaturesTotalImportCount: metrics.imports.sharedToFeaturesTotalImports,
  setIntervalOccurrenceCount: metrics.runtime.setIntervalOccurrences,
  deepRelativeImportCount: metrics.codeHealth.deepRelativeImportCount,
  circularFeatureDependencyCount: metrics.codeHealth.circularFeatureDeps.length,
  trackedHookComplexityCount: metrics.codeHealth.hookComplexity.length,
  propDrillingCandidateChainCount: metrics.propDrilling?.candidateChains ?? 0,
  propDrillingDepthGte4ChainCount: metrics.propDrilling?.depthGte4Chains ?? 0,
  propDrillingForwardingComponentCount: metrics.propDrilling?.forwardingComponents ?? 0,
});

const buildMetricsDetails = (metrics) => ({
  source: metrics.source,
  api: metrics.api,
  imports: metrics.imports,
  architecture: metrics.architecture,
  runtime: metrics.runtime,
  codeHealth: metrics.codeHealth,
  hotspots: metrics.hotspots,
  propDrilling: metrics.propDrilling ?? null,
});

const buildMetricsFilters = () => ({
  ci: args.has('--ci'),
  historyDisabled: !shouldWriteHistory,
  noWrite,
  rawJson: args.has('--json'),
});

const writeMetricsArtifacts = async (metrics) => {
  await fs.mkdir(outDir, { recursive: true });

  const stamp = metrics.generatedAt.replace(/[:.]/g, '-');
  const latestJsonPath = path.join(outDir, 'baseline-latest.json');
  const latestMdPath = path.join(outDir, 'baseline-latest.md');
  const historicalJsonPath = path.join(outDir, `baseline-${stamp}.json`);

  await writeJson(latestJsonPath, metrics);
  await writeMetricsMarkdownFile({
    root,
    targetPath: latestMdPath,
    content: generateMarkdown(metrics),
  });

  if (shouldWriteHistory) {
    await writeJson(historicalJsonPath, metrics);
  }

  return {
    latestJson: path.relative(root, latestJsonPath),
    latestMarkdown: path.relative(root, latestMdPath),
    historicalJson: shouldWriteHistory ? path.relative(root, historicalJsonPath) : null,
  };
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
  if (metrics.propDrilling) {
    lines.push(`- Prop-drilling chains (depth >= 3): ${metrics.propDrilling.candidateChains}`);
    lines.push(`- Prop-drilling chains (depth >= 4): ${metrics.propDrilling.depthGte4Chains}`);
  }
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
  const [metricsCore, propDrilling] = await Promise.all([
    collectMetrics({ root }),
    collectPropDrillingSummary(),
  ]);
  const metrics = {
    ...metricsCore,
    propDrilling,
  };
  const writtenPaths = noWrite ? null : await writeMetricsArtifacts(metrics);

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'architecture-metrics-collect',
      generatedAt: metrics.generatedAt,
      status: 'ok',
      summary: buildMetricsSummary(metrics),
      details: buildMetricsDetails(metrics),
      paths: writtenPaths,
      filters: buildMetricsFilters(),
      notes: ['architecture baseline metrics collection result'],
    });
    return;
  }

  console.log(formatCompactSummary(metrics));
  if (writtenPaths) {
    console.log(`Wrote ${writtenPaths.latestJson}`);
    console.log(`Wrote ${writtenPaths.latestMarkdown}`);
    if (writtenPaths.historicalJson) {
      console.log(`Wrote ${writtenPaths.historicalJson}`);
    }
  } else {
    console.log('Skipped writing metrics artifacts (--no-write).');
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
