import fs from 'node:fs/promises';
import path from 'node:path';

import { buildScanOutput } from './lib/scan-output.mjs';
import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';
import { writeManagedGeneratedDoc } from '../docs/generated-doc-frontmatter.mjs';

import {
  SOURCE_EXTENSIONS,
  SKIP_SEGMENTS,
  toPosix,
  PRIMITIVE_ALIAS_TYPES,
} from './type-clusters/constants.mjs';

import {
  collectDeclarations,
  collectNamedImports,
} from './type-clusters/parser.mjs';

import {
  toClusterReportEntry,
  buildCsv,
  buildMarkdown,
  buildPlanMarkdown,
} from './type-clusters/reporter.mjs';

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');
const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);

const collectOptionValues = (flagName) => {
  const values = [];
  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    if (!token) continue;

    if (token === flagName) {
      const nextToken = rawArgs[index + 1];
      if (nextToken && !nextToken.startsWith('-')) {
        values.push(nextToken);
        index += 1;
      }
      continue;
    }

    if (token.startsWith(`${flagName}=`)) {
      const value = token.slice(flagName.length + 1);
      if (value.length > 0) values.push(value);
    }
  }
  return values;
};

const readNumberOption = (flagName, fallbackValue) => {
  const [rawValue] = collectOptionValues(flagName);
  if (!rawValue) return fallbackValue;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallbackValue;
  return parsed;
};

const HISTORY_DISABLED = !args.has('--write-history') || args.has('--ci') || args.has('--no-history');
const NO_WRITE = args.has('--no-write');
const SUMMARY_JSON_ONLY = args.has('--summary-json');
const INIT_ONLY = args.has('--init');
const DOMAIN_FILTERS = collectOptionValues('--domain');
const MIN_RISK = readNumberOption('--min-risk', 0);
const TOP_LIMIT = Math.max(1, Math.floor(readNumberOption('--top', 25)));
const PLAN_TOP_LIMIT = Math.max(1, Math.floor(readNumberOption('--plan-top', 20)));

const toRelativePosix = (absolutePath) => toPosix(path.relative(root, absolutePath));

const walk = async (directory) => {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_SEGMENTS.has(entry.name)) return [];
        return walk(fullPath);
      }
      return [fullPath];
    })
  );

  return nested.flat();
};

const isClusterCandidateDeclaration = (declaration) => {
  if (PRIMITIVE_ALIAS_TYPES.has(declaration.rawTypeText)) return false;
  if (declaration.memberCount === 0 && declaration.shapeKind === 'structural-members') return false;
  return true;
};

const writeOutputs = async (report) => {
  await fs.mkdir(outDir, { recursive: true });

  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const latestJsonPath = path.join(outDir, 'type-clusters-latest.json');
  const latestMdPath = path.join(outDir, 'type-clusters-latest.md');
  const latestCsvPath = path.join(outDir, 'type-clusters-latest.csv');
  const latestPlanMdPath = path.join(outDir, 'type-clusters-plan-latest.md');
  const historyJsonPath = path.join(outDir, `type-clusters-${stamp}.json`);

  if (!NO_WRITE) {
    await fs.writeFile(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    await writeMetricsMarkdownFile({
      root,
      targetPath: latestMdPath,
      content: buildMarkdown(report),
    });

    await fs.writeFile(latestCsvPath, buildCsv(report.clusters), 'utf8');

    await writeManagedGeneratedDoc({
      root,
      targetPath: latestPlanMdPath,
      content: buildPlanMarkdown(report.clusters, report.filters),
    });

    if (!HISTORY_DISABLED && !INIT_ONLY) {
      await fs.writeFile(historyJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    }
  }

  return {
    latestJsonPath,
    latestMdPath,
    latestCsvPath,
    latestPlanMdPath,
    historyJsonPath,
    wroteHistory: !NO_WRITE && !HISTORY_DISABLED && !INIT_ONLY,
  };
};

const createBaseReport = () => ({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: 'scaffold',
  scanner: {
    name: 'scan-type-clusters',
    version: '0.1.0',
    mode: INIT_ONLY ? 'init' : 'scan',
    scope: 'src/**/*.{ts,tsx}',
  },
  filters: {
    domains: DOMAIN_FILTERS,
    minRisk: MIN_RISK,
    topLimit: TOP_LIMIT,
    planTopLimit: PLAN_TOP_LIMIT,
  },
  thresholds: {
    minClusterSize: 2,
  },
  summary: {
    filesScanned: 0,
    exportedDeclarationsScanned: 0,
    candidateDeclarationsScanned: 0,
    exactShapeClusters: 0,
    nearShapeClusters: 0,
    clustersAfterFilters: 0,
    declarationsInClusters: 0,
    highestRiskScore: 0,
  },
  clusters: [],
  notes: [
    'This is a scanner scaffold output. Risk and clustering heuristics are intentionally conservative.',
    'Use clusters as review candidates before moving declarations to canonical DTO modules.',
  ],
});

const run = async () => {
  const report = createBaseReport();

  if (!INIT_ONLY) {
    const srcDir = path.join(root, 'src');
    const absoluteFiles = (await walk(srcDir)).filter((absolutePath) =>
      SOURCE_EXTENSIONS.has(path.extname(absolutePath).toLowerCase())
    );

    const declarationById = new Map();
    const fileToDeclarations = new Map();

    for (const absolutePath of absoluteFiles) {
      const { declarations } = await collectDeclarations(absolutePath);
      if (declarations.length === 0) continue;

      const declarationIds = [];
      for (const declaration of declarations) {
        declarationById.set(declaration.id, declaration);
        declarationIds.push(declaration.id);
      }
      fileToDeclarations.set(path.normalize(absolutePath), declarationIds);
    }

    const exportNameIndexByFile = new Map();
    for (const [filePath, declarationIds] of fileToDeclarations.entries()) {
      const nameToId = new Map();
      for (const declarationId of declarationIds) {
        const declaration = declarationById.get(declarationId);
        if (!declaration) continue;
        nameToId.set(declaration.name, declaration.id);
      }
      exportNameIndexByFile.set(filePath, nameToId);
    }

    for (const absolutePath of absoluteFiles) {
      const imports = await collectNamedImports(absolutePath);
      const importerPath = toRelativePosix(absolutePath);

      for (const entry of imports) {
        const declarationsByName = exportNameIndexByFile.get(entry.target);
        if (!declarationsByName) continue;
        const declarationId = declarationsByName.get(entry.importedName);
        if (!declarationId) continue;

        const declaration = declarationById.get(declarationId);
        if (!declaration) continue;

        if (!declaration.importedBy.includes(importerPath)) {
          declaration.importedBy.push(importerPath);
        }
      }
    }

    for (const declaration of declarationById.values()) {
      declaration.usageCount = declaration.importedBy.length;
    }

    const clusterCandidates = [...declarationById.values()].filter((declaration) =>
      isClusterCandidateDeclaration(declaration)
    );

    const exactShapeGroups = new Map();
    for (const declaration of clusterCandidates) {
      const key = declaration.normalizedShape;
      const group = exactShapeGroups.get(key) ?? [];
      group.push(declaration);
      exactShapeGroups.set(key, group);
    }

    const exactShapeClusters = [...exactShapeGroups.values()]
      .filter((group) => group.length >= report.thresholds.minClusterSize)
      .sort((a, b) => b.length - a.length);

    const exactShapeMembers = new Set();
    const nearShapeGroups = new Map();
    for (const group of exactShapeClusters) {
      for (const declaration of group) {
        exactShapeMembers.add(declaration.id);
      }
    }

    for (const declaration of clusterCandidates) {
      if (!declaration.propertySignature) continue;
      if (exactShapeMembers.has(declaration.id)) continue;
      const group = nearShapeGroups.get(declaration.propertySignature) ?? [];
      group.push(declaration);
      nearShapeGroups.set(declaration.propertySignature, group);
    }

    const nearShapeClusters = [...nearShapeGroups.values()]
      .filter((group) => group.length >= report.thresholds.minClusterSize)
      .sort((a, b) => b.length - a.length);

    const clusterEntries = [];

    for (const [index, group] of exactShapeClusters.entries()) {
      clusterEntries.push(
        toClusterReportEntry(
          `exact-${String(index + 1).padStart(4, '0')}`,
          'exact-shape',
          group
        )
      );
    }

    for (const [index, group] of nearShapeClusters.entries()) {
      clusterEntries.push(
        toClusterReportEntry(
          `near-${String(index + 1).padStart(4, '0')}`,
          'near-shape',
          group
        )
      );
    }

    clusterEntries.sort(
      (a, b) =>
        b.riskScore - a.riskScore || b.declarationCount - a.declarationCount || a.clusterId.localeCompare(b.clusterId)
    );

    const domainFilteredEntries =
      DOMAIN_FILTERS.length > 0
        ? clusterEntries.filter((cluster) =>
            DOMAIN_FILTERS.some((domainFilter) => cluster.domains.includes(domainFilter))
          )
        : clusterEntries;

    const filteredClusterEntries = domainFilteredEntries.filter(
      (cluster) => cluster.riskScore >= MIN_RISK
    );

    const clusteredDeclarationCount = filteredClusterEntries.reduce(
      (sum, cluster) => sum + cluster.declarationCount,
      0
    );

    report.generatedAt = new Date().toISOString();
    report.status = 'ok';
    report.summary = {
      filesScanned: absoluteFiles.length,
      exportedDeclarationsScanned: declarationById.size,
      candidateDeclarationsScanned: clusterCandidates.length,
      exactShapeClusters: exactShapeClusters.length,
      nearShapeClusters: nearShapeClusters.length,
      clustersAfterFilters: filteredClusterEntries.length,
      declarationsInClusters: clusteredDeclarationCount,
      highestRiskScore: filteredClusterEntries[0]?.riskScore ?? 0,
    };
    report.clusters = filteredClusterEntries;
  }

  const output = await writeOutputs(report);

  if (SUMMARY_JSON_ONLY) {
    process.stdout.write(
      `${JSON.stringify(
        buildScanOutput({
          scannerName: 'scan-type-clusters',
          scannerVersion: '1.0.0',
          summary: report.summary,
          details: {
            clusters: report.clusters,
            status: report.status,
          },
          filters: {
            ...report.filters,
            historyDisabled: HISTORY_DISABLED,
            noWrite: NO_WRITE,
          },
          paths: NO_WRITE
            ? null
            : {
                latestJson: toRelativePosix(output.latestJsonPath),
                latestMarkdown: toRelativePosix(output.latestMdPath),
                latestCsv: toRelativePosix(output.latestCsvPath),
                latestPlanMarkdown: toRelativePosix(output.latestPlanMdPath),
                historyJson: output.wroteHistory ? toRelativePosix(output.historyJsonPath) : null,
              },
          notes: ['type-clusters scan result'],
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  console.log(`[type-clusters] status=${report.status}`);
  console.log(
    `[type-clusters] scanned files=${report.summary.filesScanned} exportedDeclarations=${report.summary.exportedDeclarationsScanned}`
  );
  console.log(
    `[type-clusters] clusters exact=${report.summary.exactShapeClusters} near=${report.summary.nearShapeClusters}`
  );
  console.log(
    `[type-clusters] filters domains=${report.filters.domains.join('|') || '<none>'} minRisk=${report.filters.minRisk}`
  );
  if (!NO_WRITE) {
    console.log(`[type-clusters] wrote ${toRelativePosix(output.latestJsonPath)}`);
    console.log(`[type-clusters] wrote ${toRelativePosix(output.latestMdPath)}`);
    console.log(`[type-clusters] wrote ${toRelativePosix(output.latestCsvPath)}`);
    console.log(`[type-clusters] wrote ${toRelativePosix(output.latestPlanMdPath)}`);
    if (output.wroteHistory) {
      console.log(`[type-clusters] wrote ${toRelativePosix(output.historyJsonPath)}`);
    }
  }
};

run().catch((error) => {
  console.error('[type-clusters] scan failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
