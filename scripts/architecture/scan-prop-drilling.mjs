import fs from 'node:fs/promises';
import path from 'node:path';

import { buildScanOutput } from './lib/scan-output.mjs';
import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';

import {
  MAX_CHAIN_DEPTH,
  MAX_CHAIN_COUNT,
  TOP_BACKLOG_LIMIT,
  TOP_COMPONENT_BACKLOG_LIMIT,
  GUARDRAILS_EXCLUDED_PATHS,
  toPosix,
  isSourceFile,
  isJsxFile,
} from './prop-drilling/constants.mjs';

import { analyzeFile } from './prop-drilling/parser.mjs';

import {
  resolveEdgeTarget,
  buildExportedComponentIndex,
} from './prop-drilling/resolver.mjs';

import {
  toStateKey,
  buildChains,
  buildTransitionBacklog,
} from './prop-drilling/analyzer.mjs';

import {
  buildChainCsv,
  buildTransitionCsv,
  buildMarkdown,
} from './prop-drilling/reporter.mjs';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const outDir = path.join(root, 'docs', 'metrics');

const HISTORY_DISABLED = !args.has('--write-history') || args.has('--ci') || args.has('--no-history');
const NO_WRITE = args.has('--no-write');
const SUMMARY_JSON_ONLY = args.has('--summary-json');
const GUARDRAILS_SCOPE_ONLY = args.has('--guardrails');

const walk = async (directory) => {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const children = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [fullPath];
    })
  );

  return children.flat();
};

const isRuntimeSourceFile = (relativePath) => {
  if (GUARDRAILS_SCOPE_ONLY) {
    if (!relativePath.startsWith('src/app/')) return false;
    if (relativePath.startsWith('src/app/api/')) return false;
    if (GUARDRAILS_EXCLUDED_PATHS.has(relativePath)) return false;
  }
  if (relativePath.includes('/__tests__/')) return false;
  if (relativePath.includes('/__mocks__/')) return false;
  return !/\.(test|spec)\.[jt]sx?$/i.test(path.basename(relativePath));
};

const normalizeAbsolute = (absolutePath) => path.normalize(absolutePath);

const run = async () => {
  const srcRoot = path.join(root, 'src');
  const files = (await walk(srcRoot)).filter((filePath) => isSourceFile(filePath));

  const sourcePathSet = new Set(files.map((filePath) => normalizeAbsolute(filePath)));
  const fileInfos = new Map();

  const scanInputs = [];
  for (const absolutePath of files) {
    const relativePath = toPosix(path.relative(root, absolutePath));
    if (!isRuntimeSourceFile(relativePath)) continue;
    scanInputs.push({ absolutePath, relativePath });
  }

  for (const input of scanInputs) {
    const raw = await fs.readFile(input.absolutePath, 'utf8');
    const analyzed = analyzeFile({ ...input, raw });
    fileInfos.set(input.absolutePath, analyzed);
  }

  const namedFallbackIndex = buildExportedComponentIndex(fileInfos);
  const componentById = new Map();
  for (const fileInfo of fileInfos.values()) {
    for (const component of fileInfo.components.values()) {
      componentById.set(component.id, component);
    }
  }

  const transitionsByKey = new Map();
  const componentForwardingStats = new Map();
  let unknownSpreadForwardingCount = 0;

  for (const fileInfo of fileInfos.values()) {
    for (const component of fileInfo.components.values()) {
      const forwardedProps = new Set();
      let outgoingTransitionCount = 0;
      let hasUnknownSpreadForwarding = false;

      for (const edge of component.rawEdges) {
        const targetComponentId = resolveEdgeTarget({
          fileInfo,
          edge,
          fileInfos,
          sourcePathSet,
          namedFallbackIndex,
        });
        if (!targetComponentId) continue;

        if (edge.forwardAllFromUnknown || edge.forwardFromRest) {
          hasUnknownSpreadForwarding = true;
          unknownSpreadForwardingCount += 1;
        }

        for (const mapping of edge.mappings) {
          const key = `${component.id}|${targetComponentId}|${mapping.sourceProp}|${mapping.targetProp}`;
          if (transitionsByKey.has(key)) continue;
          transitionsByKey.set(key, {
            fromComponentId: component.id,
            toComponentId: targetComponentId,
            sourceProp: mapping.sourceProp,
            targetProp: mapping.targetProp,
            relativePath: component.relativePath,
            line: edge.line,
          });
          forwardedProps.add(mapping.sourceProp);
          outgoingTransitionCount += 1;
        }
      }

      componentForwardingStats.set(component.id, {
        forwardedProps,
        outgoingTransitionCount,
        hasUnknownSpreadForwarding,
      });
    }
  }

  const adjacency = new Map();
  for (const transition of transitionsByKey.values()) {
    const fromState = toStateKey(transition.fromComponentId, transition.sourceProp);
    const list = adjacency.get(fromState) ?? [];
    list.push(transition);
    adjacency.set(fromState, list);
  }

  const chains = buildChains({ adjacency, componentById });
  chains.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.depth !== left.depth) return right.depth - left.depth;
    return right.rootFanout - left.rootFanout;
  });

  const forwardingComponentBacklog = [...componentForwardingStats.entries()]
    .map(([componentId, stats]) => {
      const component = componentById.get(componentId);
      return {
        componentId,
        name: component?.name ?? componentId,
        relativePath: component?.relativePath ?? '',
        feature: component?.feature ?? 'other',
        forwardedPropCount: stats.forwardedProps.size,
        outgoingTransitionCount: stats.outgoingTransitionCount,
        hasUnknownSpreadForwarding: stats.hasUnknownSpreadForwarding,
      };
    })
    .filter((entry) => entry.outgoingTransitionCount > 0 || entry.hasUnknownSpreadForwarding)
    .sort((left, right) => {
      if (right.forwardedPropCount !== left.forwardedPropCount) {
        return right.forwardedPropCount - left.forwardedPropCount;
      }
      return right.outgoingTransitionCount - left.outgoingTransitionCount;
    });

  const componentBacklog = forwardingComponentBacklog
    .filter(
      (entry) =>
        entry.forwardedPropCount >= 2 || entry.outgoingTransitionCount >= 3 || entry.hasUnknownSpreadForwarding
    )
    .slice(0, TOP_COMPONENT_BACKLOG_LIMIT);

  const transitionBacklog = buildTransitionBacklog({
    transitions: [...transitionsByKey.values()],
    adjacency,
    componentById,
  });

  const forwardingScopeCounts = new Map();
  for (const entry of forwardingComponentBacklog) {
    forwardingScopeCounts.set(entry.feature, (forwardingScopeCounts.get(entry.feature) ?? 0) + 1);
  }

  // --- High prop-count components ---
  const HIGH_PROP_COUNT_THRESHOLD = 12;
  const highPropCountComponents = [];
  for (const fileInfo of fileInfos.values()) {
    for (const component of fileInfo.components.values()) {
      const propCount = component.propsMeta?.knownSourceProps?.size ?? 0;
      const restCount = component.propsMeta?.restIdentifiers?.size ?? 0;
      if (propCount >= HIGH_PROP_COUNT_THRESHOLD) {
        highPropCountComponents.push({
          name: component.name,
          relativePath: component.relativePath,
          feature: component.feature,
          propCount,
          hasRestSpread: restCount > 0,
        });
      }
    }
  }
  highPropCountComponents.sort((a, b) => b.propCount - a.propCount);

  // --- Components that both receive AND forward many props (pass-through hotspots) ---
  const passThroughHotspots = [];
  for (const [componentId, stats] of componentForwardingStats.entries()) {
    const component = componentById.get(componentId);
    if (!component) continue;
    const receivedCount = component.propsMeta?.knownSourceProps?.size ?? 0;
    const forwardedCount = stats.forwardedProps.size;
    if (receivedCount >= 5 && forwardedCount >= 3) {
      const forwardRatio = forwardedCount / receivedCount;
      passThroughHotspots.push({
        name: component.name,
        relativePath: component.relativePath,
        feature: component.feature,
        receivedCount,
        forwardedCount,
        forwardRatio: Math.round(forwardRatio * 100),
      });
    }
  }
  passThroughHotspots.sort((a, b) => b.forwardRatio - a.forwardRatio || b.forwardedCount - a.forwardedCount);

  const summary = {
    generatedAt: new Date().toISOString(),
    scannedSourceFiles: scanInputs.length,
    scannedJsxFiles: scanInputs.filter((entry) => isJsxFile(entry.absolutePath)).length,
    componentCount: componentById.size,
    componentsWithForwarding: componentBacklog.length,
    componentsWithAnyForwarding: forwardingComponentBacklog.length,
    resolvedTransitionCount: transitionsByKey.size,
    depth2CandidateChainCount: transitionBacklog.length,
    candidateChainCount: chains.length,
    highPriorityChainCount: chains.filter((chain) => chain.depth >= 4).length,
    unknownSpreadForwardingCount,
    highPropCountComponentCount: highPropCountComponents.length,
    passThroughHotspotCount: passThroughHotspots.length,
    topFeatureScopes: [...forwardingScopeCounts.entries()]
      .map(([scope, count]) => ({ scope, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 20),
  };

  const backlog = chains.slice(0, TOP_BACKLOG_LIMIT);

  const result = {
    summary,
    backlog,
    transitionBacklog,
    componentBacklog,
    forwardingComponentBacklog,
    chains,
  };

  const stamp = summary.generatedAt.replace(/[:.]/g, '-');
  const latestJsonPath = path.join(outDir, 'prop-drilling-latest.json');
  const latestMdPath = path.join(outDir, 'prop-drilling-latest.md');
  const latestCsvPath = path.join(outDir, 'prop-drilling-chains-latest.csv');
  const latestTransitionCsvPath = path.join(outDir, 'prop-drilling-transitions-latest.csv');
  const historicalJsonPath = path.join(outDir, `prop-drilling-${stamp}.json`);

  if (!NO_WRITE) {
    await fs.mkdir(outDir, { recursive: true });

    await fs.writeFile(latestJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    await writeMetricsMarkdownFile({
      root,
      targetPath: latestMdPath,
      content: buildMarkdown({
        summary,
        backlog,
        transitionBacklog,
        componentBacklog,
        forwardingComponentBacklog,
        componentById,
      }),
    });
    await fs.writeFile(latestCsvPath, buildChainCsv({ chains: backlog, componentById }), 'utf8');
    await fs.writeFile(
      latestTransitionCsvPath,
      buildTransitionCsv({
        transitionBacklog: transitionBacklog.slice(0, TOP_BACKLOG_LIMIT),
        componentById,
      }),
      'utf8'
    );

    if (!HISTORY_DISABLED) {
      await fs.writeFile(historicalJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    }

    if (!SUMMARY_JSON_ONLY) {
      console.log(`Wrote ${toPosix(path.relative(root, latestJsonPath))}`);
      console.log(`Wrote ${toPosix(path.relative(root, latestMdPath))}`);
      console.log(`Wrote ${toPosix(path.relative(root, latestCsvPath))}`);
      console.log(`Wrote ${toPosix(path.relative(root, latestTransitionCsvPath))}`);
      if (!HISTORY_DISABLED) {
        console.log(`Wrote ${toPosix(path.relative(root, historicalJsonPath))}`);
      }
    }
  }

  if (SUMMARY_JSON_ONLY) {
    process.stdout.write(
      `${JSON.stringify(
        buildScanOutput({
          scannerName: 'scan-prop-drilling',
          scannerVersion: '1.0.0',
          summary,
          details: {
            backlog,
            transitionBacklog,
            componentBacklog,
            forwardingComponentBacklog,
            chains,
          },
          paths: NO_WRITE
            ? null
            : {
              latestJson: toPosix(path.relative(root, latestJsonPath)),
              latestMarkdown: toPosix(path.relative(root, latestMdPath)),
              latestChainsCsv: toPosix(path.relative(root, latestCsvPath)),
              latestTransitionsCsv: toPosix(path.relative(root, latestTransitionCsvPath)),
              historyJson: HISTORY_DISABLED ? null : toPosix(path.relative(root, historicalJsonPath)),
            },
          filters: {
            historyDisabled: HISTORY_DISABLED,
            noWrite: NO_WRITE,
            maxChainDepth: MAX_CHAIN_DEPTH,
            maxChainCount: MAX_CHAIN_COUNT,
            topBacklogLimit: TOP_BACKLOG_LIMIT,
            topComponentBacklogLimit: TOP_COMPONENT_BACKLOG_LIMIT,
          },
          notes: ['prop-drilling scan result'],
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  console.log(
    [
      `Components: ${summary.componentCount}`,
      `Forwarding components (hotspots): ${summary.componentsWithForwarding}`,
      `Forwarding components (any): ${summary.componentsWithAnyForwarding}`,
      `Transitions: ${summary.resolvedTransitionCount}`,
      `Depth>=2: ${summary.depth2CandidateChainCount}`,
      `Chains: ${summary.candidateChainCount}`,
      `Depth>=4: ${summary.highPriorityChainCount}`,
    ].join(' | ')
  );
};

run().catch((error) => {
  console.error('[prop-drilling-scan] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
