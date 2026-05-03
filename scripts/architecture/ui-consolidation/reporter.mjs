export const toCsvLine = (fields) =>
  fields
    .map((field) => {
      const value = String(field ?? '');
      if (!/[",\n]/.test(value)) return value;
      return `"${value.replace(/"/g, '""')}"`;
    })
    .join(',');

export const buildMarkdown = ({ summary, opportunities, clusterDiagnostics }) => {
  const lines = [];
  lines.push('# UI Consolidation Scan');
  lines.push('');
  lines.push(`Generated at: ${summary.generatedAt}`);
  lines.push('');
  lines.push('## Snapshot');
  lines.push('');
  lines.push(`- Scanned UI files: ${summary.scannedFileCount}`);
  lines.push(`- Duplicate-name clusters: ${summary.duplicateNameClusterCount}`);
  lines.push(`- Prop-signature clusters: ${summary.propSignatureClusterCount}`);
  lines.push(`- Token-similarity clusters: ${summary.tokenSimilarityClusterCount}`);
  lines.push(`- Thin re-export wrappers ignored: ${summary.thinReExportWrapperCount}`);
  lines.push(`- Total consolidation opportunities: ${summary.totalOpportunities}`);
  lines.push(`- High-priority opportunities (score >= 2000): ${summary.highPriorityCount}`);
  lines.push('');
  lines.push('## Domain Coverage');
  lines.push('');
  lines.push('| Domain | Files |');
  lines.push('| --- | ---: |');
  for (const entry of summary.domainCounts) {
    lines.push(`| \`${entry.domain}\` | ${entry.count} |`);
  }
  lines.push('');
  lines.push('## Top Families');
  lines.push('');
  lines.push('| Family | Files |');
  lines.push('| --- | ---: |');
  for (const entry of summary.familyCounts.slice(0, 15)) {
    lines.push(`| \`${entry.family}\` | ${entry.count} |`);
  }
  lines.push('');
  lines.push('## Ranked Backlog');
  lines.push('');
  lines.push('| Rank | Score | Family | Method | Files | Scopes | LOC | Template Coverage | Risk | Recommendation |');
  lines.push('| ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | --- | --- |');

  const top = opportunities.slice(0, 35);
  top.forEach((entry, index) => {
    const templatePercent = `${Math.round(entry.templateCoverage * 100)}%`;
    lines.push(
      `| ${index + 1} | ${entry.score} | \`${entry.family}\` | \`${entry.method}\` | ${entry.fileCount} | ${entry.featureCount} | ${entry.totalLines} | ${templatePercent} | ${entry.risk} | ${entry.recommendation} |`
    );
  });

  lines.push('');
  lines.push('## Top Opportunity Details');
  lines.push('');

  for (const [index, entry] of top.slice(0, 12).entries()) {
    lines.push(`### ${index + 1}. ${entry.family} (${entry.method})`);
    lines.push('');
    lines.push(`- Score: ${entry.score}`);
    lines.push(`- Files: ${entry.fileCount}`);
    lines.push(`- Scopes: ${entry.scopes.join(', ')}`);
    lines.push(`- Total LOC: ${entry.totalLines}`);
    lines.push(`- Recommendation: ${entry.recommendation}`);
    lines.push(`- Risk: ${entry.risk}`);
    if (entry.similarity !== null) {
      lines.push(`- Avg token similarity: ${entry.similarity}`);
    }
    lines.push('- Candidate files:');
    for (const file of entry.files.slice(0, 12)) {
      const templateMarker = file.templateImports > 0 ? 'template-import' : 'no-template-import';
      lines.push(`  - \`${file.path}\` (${file.lines} LOC, ${file.scope}, ${templateMarker})`);
    }
    lines.push('');
  }

  lines.push('## Execution Notes');
  lines.push('');
  lines.push('- Start with high score + low risk clusters.');
  lines.push('- Prefer migration to existing templates before creating new abstractions.');
  lines.push('- Re-run this scan after each migration wave and compare rank deltas.');

  lines.push('');
  lines.push('## Residual Clusters');
  lines.push('');
  const residualGroups = [
    { title: 'Duplicate Name Clusters', clusters: clusterDiagnostics.duplicateName },
    { title: 'Prop Signature Clusters', clusters: clusterDiagnostics.propSignature },
    { title: 'Token Similarity Clusters', clusters: clusterDiagnostics.tokenSimilarity },
  ];

  for (const group of residualGroups) {
    lines.push(`### ${group.title}`);
    lines.push('');
    if (group.clusters.length === 0) {
      lines.push('- None');
      lines.push('');
      continue;
    }
    for (const cluster of group.clusters.slice(0, 10)) {
      lines.push(
        `- \`${cluster.family}\` \`${cluster.method}\` files=${cluster.fileCount} loc=${cluster.totalLines} scopes=${cluster.scopes.join(', ')}`
      );
      for (const file of cluster.files.slice(0, 8)) {
        lines.push(`  - \`${file.path}\` (${file.lines} LOC)`);
      }
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
};

export const buildInventoryCsv = (candidates) => {
  const lines = [];
  lines.push(
    toCsvLine([
      'path',
      'domain',
      'scope',
      'family',
      'basename',
      'lines',
      'useClient',
      'templateImports',
      'uiPrimitiveImports',
      'propsSignature',
    ])
  );
  for (const candidate of candidates.sort((left, right) => right.lines - left.lines)) {
    lines.push(
      toCsvLine([
        candidate.path,
        candidate.domain,
        candidate.scope,
        candidate.family,
        candidate.basename,
        candidate.lines,
        candidate.useClient,
        candidate.templateImports,
        candidate.uiPrimitiveImports,
        candidate.propsSignature ?? '',
      ])
    );
  }
  return `${lines.join('\n')}\n`;
};
