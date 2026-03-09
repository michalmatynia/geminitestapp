import { analyzeImportBoundaries } from './lib/check-import-boundaries.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Import Boundaries Check');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Files scanned: ${payload.summary.fileCount}`);
  lines.push(`- Features tracked: ${payload.summary.featureCount}`);
  lines.push(`- Circular dependencies: ${payload.summary.circularDependencyCount}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Warnings: ${payload.summary.warningCount}`);
  lines.push(`- Info: ${payload.summary.infoCount}`);
  lines.push('');

  if (payload.circularDependencies.length > 0) {
    lines.push('## Circular Dependencies');
    lines.push('');
    for (const cycle of payload.circularDependencies) {
      lines.push(`- ${cycle.join(' -> ')}`);
    }
    lines.push('');
  }

  lines.push('## Feature Dependency Graph');
  lines.push('');
  const graph = payload.featureGraph || {};
  const entries = Object.entries(graph).sort((a, b) => b[1].length - a[1].length);
  if (entries.length > 0) {
    lines.push('| Feature | Dependencies | Count |');
    lines.push('| --- | --- | ---: |');
    for (const [feature, deps] of entries.slice(0, 30)) {
      lines.push(`| ${feature} | ${deps.join(', ')} | ${deps.length} |`);
    }
    if (entries.length > 30) {
      lines.push(`| ... | ${entries.length - 30} more features | |`);
    }
  }
  lines.push('');

  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('No import boundary issues detected.');
  } else {
    const maxIssues = 200;
    const displayIssues = payload.issues.slice(0, maxIssues);
    lines.push(...renderIssueTable(displayIssues));
    if (payload.issues.length > maxIssues) {
      lines.push('');
      lines.push(`> Showing first ${maxIssues} of ${payload.issues.length} issues.`);
    }
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).');
  lines.push('- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.');
  lines.push('- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.');
  lines.push('- `prisma-outside-server` (error): Direct Prisma client usage should be restricted to server directories and API routes.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'import-boundaries',
  analyze: analyzeImportBoundaries,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[import-boundaries] status=${payload.status} files=${payload.summary.fileCount} features=${payload.summary.featureCount} cycles=${payload.summary.circularDependencyCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`,
  ],
});
