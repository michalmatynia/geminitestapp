import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';
import { execScanOutput } from './lib/exec-scan-output.mjs';

const root = process.cwd();
const metricsDir = path.join(root, 'docs', 'metrics');
const domainScansDir = path.join(metricsDir, 'domain-scans');
const scanTypeClustersScriptPath = fileURLToPath(new URL('./scan-type-clusters.mjs', import.meta.url));

const DOMAIN_SCANS = [
  {
    domain: 'feature:ai',
    slug: 'type-clusters-feature-ai',
  },
  {
    domain: 'feature:integrations',
    slug: 'type-clusters-feature-integrations',
  },
  {
    domain: 'feature:case-resolver',
    slug: 'type-clusters-feature-case-resolver',
  },
  {
    domain: 'shared:contracts',
    slug: 'type-clusters-shared-contracts',
  },
  {
    domain: 'shared',
    slug: 'type-clusters-shared',
  },
];

const buildDomainScanCommandArgs = (domain) => [
  '--max-old-space-size=12288',
  scanTypeClustersScriptPath,
  `--domain=${domain}`,
  '--summary-json',
  '--no-write',
  '--no-history',
];

const buildDomainReport = (result, domain) => ({
  schemaVersion: 1,
  generatedAt: result.generatedAt,
  status: result.status,
  scanner: {
    name: result.scanner?.name ?? 'scan-type-clusters',
    version: result.scanner?.version ?? '1.0.0',
    mode: 'scan',
    scope: 'src/**/*.{ts,tsx}',
  },
  filters: result.filters ?? {
    domains: [domain],
    minRisk: 0,
  },
  thresholds: {
    minClusterSize: 2,
  },
  summary: result.summary ?? {
    filesScanned: 0,
    exportedDeclarationsScanned: 0,
    candidateDeclarationsScanned: 0,
    exactShapeClusters: 0,
    nearShapeClusters: 0,
    clustersAfterFilters: 0,
    declarationsInClusters: 0,
    highestRiskScore: 0,
  },
  clusters: Array.isArray(result.details?.clusters) ? result.details.clusters : [],
  notes: Array.isArray(result.notes) ? result.notes : [],
});

const toDomainScanMarkdown = (report) => {
  const lines = [];
  lines.push('# Type Cluster Scanner Report');
  lines.push('');
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Status: ${report.status}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Files scanned: ${report.summary.filesScanned}`);
  lines.push(`- Exported declarations scanned: ${report.summary.exportedDeclarationsScanned}`);
  lines.push(`- Candidate declarations scanned: ${report.summary.candidateDeclarationsScanned}`);
  lines.push(`- Exact-shape clusters: ${report.summary.exactShapeClusters}`);
  lines.push(`- Near-shape clusters: ${report.summary.nearShapeClusters}`);
  lines.push(`- Clusters after filters: ${report.summary.clustersAfterFilters}`);
  lines.push(`- Declarations in clusters: ${report.summary.declarationsInClusters}`);
  lines.push(`- Highest risk score: ${report.summary.highestRiskScore}`);
  if (Array.isArray(report.filters?.domains) && report.filters.domains.length > 0) {
    lines.push(`- Domain filter: ${report.filters.domains.join(', ')}`);
  }
  lines.push('');
  lines.push('## Top Cluster Candidates');
  lines.push('');
  lines.push('| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |');
  lines.push('| --- | --- | ---: | ---: | --- | --- |');
  if (report.clusters.length === 0) {
    lines.push('| _none_ | - | 0 | 0 | - | - |');
  } else {
    for (const cluster of report.clusters.slice(0, 10)) {
      lines.push(
        `| \`${cluster.clusterId}\` | ${cluster.clusterKind} | ${cluster.riskScore} | ${cluster.declarationCount} | ${cluster.domains.join(', ')} | ${cluster.canonicalDtoCandidate ?? 'TBD'} |`
      );
    }
  }
  lines.push('');
  lines.push('## Initial DTO Consolidation Workflow');
  lines.push('');
  lines.push('1. Review top cluster candidates and validate semantic equivalence.');
  lines.push('2. Propose canonical DTO module path and naming for each approved cluster.');
  lines.push('3. Migrate imports incrementally and keep compatibility aliases where required.');
  lines.push('4. Re-run scanner and verify duplicate cluster count trends downward.');
  return `${lines.join('\n')}\n`;
};

const escapeCsv = (value) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
};

const toDomainScanCsv = (report) => {
  const lines = [
    [
      'clusterId',
      'clusterKind',
      'riskScore',
      'declarationCount',
      'domains',
      'canonicalDtoCandidate',
      'signatureHash',
      'signaturePreview',
      'declarations',
    ].join(','),
  ];

  for (const cluster of report.clusters) {
    lines.push(
      [
        cluster.clusterId,
        cluster.clusterKind,
        cluster.riskScore,
        cluster.declarationCount,
        cluster.domains.join('|'),
        cluster.canonicalDtoCandidate ?? '',
        cluster.signature?.normalizedShapeHash ?? '',
        cluster.signature?.preview ?? '',
        (Array.isArray(cluster.declarations) ? cluster.declarations : [])
          .map((declaration) => `${declaration.path}:${declaration.line}:${declaration.name}`)
          .join('|'),
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  return `${lines.join('\n')}\n`;
};

const toSummaryMarkdown = (payload) => {
  const lines = [];
  lines.push('# Type Cluster Domain Scan Summary');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('| Domain | Exact | Near | After Filters | Highest Risk | Source |');
  lines.push('| --- | ---: | ---: | ---: | ---: | --- |');
  for (const entry of payload.domains) {
    lines.push(
      `| ${entry.domain} | ${entry.exact} | ${entry.near} | ${entry.after} | ${entry.risk} | ${entry.source} |`
    );
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- Each row is generated by rerunning the type-cluster scanner with a single domain filter.');
  lines.push('- Prefer the per-domain markdown reports for reviewer-facing detail and the JSON/CSV files for automation.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  await fs.mkdir(domainScansDir, { recursive: true });

  const domainPayloads = [];

  for (const config of DOMAIN_SCANS) {
    const result = await execScanOutput({
      command: 'node',
      commandArgs: buildDomainScanCommandArgs(config.domain),
      cwd: root,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
      sourceName: 'scan-type-clusters',
      maxBuffer: 32 * 1024 * 1024,
    });

    if (!result.output) {
      throw new Error(
        `type cluster domain scan failed for ${config.domain}: ${result.error ?? 'no output'}`
      );
    }

    const domainReport = buildDomainReport(result.output, config.domain);
    const latestJsonPath = path.join(domainScansDir, `${config.slug}-latest.json`);
    const latestMdPath = path.join(domainScansDir, `${config.slug}-latest.md`);
    const latestCsvPath = path.join(domainScansDir, `${config.slug}-latest.csv`);

    await fs.writeFile(latestJsonPath, `${JSON.stringify(domainReport, null, 2)}\n`, 'utf8');
    await writeMetricsMarkdownFile({
      root,
      targetPath: latestMdPath,
      content: toDomainScanMarkdown(domainReport),
    });
    await fs.writeFile(latestCsvPath, toDomainScanCsv(domainReport), 'utf8');

    domainPayloads.push({
      domain: config.domain,
      generatedAt: domainReport.generatedAt,
      exact: domainReport.summary.exactShapeClusters,
      near: domainReport.summary.nearShapeClusters,
      after: domainReport.summary.clustersAfterFilters,
      risk: domainReport.summary.highestRiskScore,
      source: path.relative(root, latestJsonPath),
    });

    console.log(
      `[type-clusters-domain-scans] ${config.domain} exact=${domainReport.summary.exactShapeClusters} near=${domainReport.summary.nearShapeClusters} after=${domainReport.summary.clustersAfterFilters}`
    );
    console.log(`[type-clusters-domain-scans] Wrote ${path.relative(root, latestJsonPath)}`);
    console.log(`[type-clusters-domain-scans] Wrote ${path.relative(root, latestMdPath)}`);
    console.log(`[type-clusters-domain-scans] Wrote ${path.relative(root, latestCsvPath)}`);
  }

  const summaryPayload = {
    generatedAt: new Date().toISOString(),
    domains: domainPayloads,
  };
  const summaryJsonPath = path.join(metricsDir, 'type-clusters-domain-scan-latest.json');
  const summaryMdPath = path.join(metricsDir, 'type-clusters-domain-scan-latest.md');

  await fs.writeFile(summaryJsonPath, `${JSON.stringify(summaryPayload, null, 2)}\n`, 'utf8');
  await writeMetricsMarkdownFile({
    root,
    targetPath: summaryMdPath,
    content: toSummaryMarkdown(summaryPayload),
  });

  console.log(`[type-clusters-domain-scans] Wrote ${path.relative(root, summaryJsonPath)}`);
  console.log(`[type-clusters-domain-scans] Wrote ${path.relative(root, summaryMdPath)}`);
};

run().catch((error) => {
  console.error('[type-clusters-domain-scans] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
