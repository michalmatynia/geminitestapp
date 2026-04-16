import { scoreCluster } from './analyzer.mjs';

export const toClusterReportEntry = (clusterId, clusterKind, declarations) => {
  const domains = [...new Set(declarations.map((declaration) => declaration.source.domain))].sort();
  const totalUsage = declarations.reduce((sum, declaration) => sum + declaration.usageCount, 0);
  const riskScore = scoreCluster({
    declarationCount: declarations.length,
    domainCount: domains.length,
    totalUsage,
  });

  const [sample] = declarations;

  return {
    clusterId,
    clusterKind,
    canonicalDtoCandidate: null,
    riskScore,
    declarationCount: declarations.length,
    domains,
    signature: {
      shapeKind: sample.shapeKind,
      normalizedShapeHash: sample.normalizedShapeHash,
      memberCount: sample.memberCount,
      preview:
        sample.shapeKind === 'type-expression'
          ? sample.rawTypeText?.slice(0, 160) ?? ''
          : sample.signatures.slice(0, 8).join('; '),
    },
    declarations: declarations.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      path: d.source.path,
      source: d.source,
      usageCount: d.usageCount,
    })),
  };
};

export const buildCsv = (clusters) => {
  const lines = [
    'cluster_id,kind,risk_score,declarations,domains,usage,shape_hash,preview',
  ];

  for (const cluster of clusters) {
    const fields = [
      cluster.clusterId,
      cluster.clusterKind,
      cluster.riskScore,
      cluster.declarationCount,
      cluster.domains.join('|'),
      cluster.declarations.reduce((sum, d) => sum + d.usageCount, 0),
      cluster.signature.normalizedShapeHash,
      cluster.signature.preview.replace(/"/g, '""'),
    ];
    lines.push(fields.map((f) => `"${f}"`).join(','));
  }

  return lines.join('\n');
};

export const buildMarkdown = (report) => {
  const { summary, clusters, filters } = report;
  const lines = [
    '# Type Clusters Scan',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Files scanned: ${summary.filesScanned}`,
    `- Exported declarations: ${summary.exportedDeclarationsScanned}`,
    `- Candidate declarations: ${summary.candidateDeclarationsScanned}`,
    `- Exact shape clusters: ${summary.exactShapeClusters}`,
    `- Near shape clusters: ${summary.nearShapeClusters}`,
    `- Highest risk score: ${summary.highestRiskScore}`,
    '',
    '## Top Clusters',
    '',
    '| ID | Kind | Risk | Decls | Domains | Preview |',
    '| --- | --- | ---: | ---: | --- | --- |',
  ];

  for (const cluster of clusters.slice(0, filters?.topLimit ?? 50)) {
    lines.push(
      `| \`${cluster.clusterId}\` | ${cluster.clusterKind} | ${cluster.riskScore} | ${cluster.declarationCount} | ${cluster.domains.join(', ')} | \`${cluster.signature.preview}\` |`
    );
  }

  return lines.join('\n');
};

export const buildPlanMarkdown = (clusters, filters) => {
  const lines = [
    '# Type Cluster Consolidation Plan',
    '',
    '## Prioritized Worklist',
    '',
  ];

  let index = 1;
  for (const cluster of clusters.filter((c) => c.riskScore >= 10).slice(0, filters?.planTopLimit ?? 20)) {
    lines.push(`${index}. [ ] ${cluster.clusterId} (${cluster.clusterKind})`);
    lines.push(`Risk: ${cluster.riskScore} | Declarations: ${cluster.declarationCount}`);
    lines.push(`Domains: ${cluster.domains.join(', ')}`);
    lines.push(`Suggested DTO: ${cluster.canonicalDtoCandidate ?? 'TBD'}`);
    lines.push(`Signature: ${cluster.signature.shapeKind} (${cluster.signature.normalizedShapeHash})`);
    lines.push('Notes: Validate semantic equivalence before migration.');
    lines.push('');
    index += 1;
  }

  return lines.join('\n') + '\n';
};
