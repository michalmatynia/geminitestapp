import { analyzeUnsafePatterns } from './lib/check-unsafe-patterns.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Unsafe Patterns Check');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Files scanned: ${payload.summary.fileCount}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Warnings: ${payload.summary.warningCount}`);
  lines.push(`- Info: ${payload.summary.infoCount}`);
  lines.push('');
  lines.push('## Trend Counters');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('| --- | ---: |');
  for (const [key, value] of Object.entries(payload.trendCounters)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');

  if (Object.keys(payload.eslintDisabledRules).length > 0) {
    lines.push('## Top Disabled ESLint Rules');
    lines.push('');
    lines.push('| Rule | Count |');
    lines.push('| --- | ---: |');
    for (const [rule, count] of Object.entries(payload.eslintDisabledRules).slice(0, 20)) {
      lines.push(`| ${rule} | ${count} |`);
    }
    lines.push('');
  }

  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('No unsafe pattern issues detected.');
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
  lines.push('- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.');
  lines.push('- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.');
  lines.push('- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.');
  lines.push('- `eslint-disable` (info): Track which rules are most frequently disabled.');
  lines.push('- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'unsafe-patterns',
  analyze: analyzeUnsafePatterns,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[unsafe-patterns] status=${payload.status} files=${payload.summary.fileCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} info=${payload.summary.infoCount} duration=${formatDuration(payload.durationMs)}`,
    `  double-assertions=${payload.trendCounters.doubleAssertionCount} any=${payload.trendCounters.anyCount} eslint-disable=${payload.trendCounters.eslintDisableCount} non-null=${payload.trendCounters.nonNullAssertionCount}`,
  ],
});
