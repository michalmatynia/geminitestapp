import path from 'node:path';

import { analyzeUnsafePatterns } from './lib/check-unsafe-patterns.mjs';
import {
  formatDuration,
  parseCommonCheckArgs,
  renderIssueTable,
  renderRuleTable,
  writeCheckArtifacts,
} from './lib/check-runner.mjs';

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
  lines.push(`| Metric | Count |`);
  lines.push(`| --- | ---: |`);
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

const run = async () => {
  const root = process.cwd();
  const startedAt = Date.now();
  const { strictMode, failOnWarnings, shouldWriteHistory } = parseCommonCheckArgs();
  const payload = analyzeUnsafePatterns({ root });
  payload.durationMs = Date.now() - startedAt;
  const markdown = toMarkdown(payload);
  const outputs = await writeCheckArtifacts({
    root,
    slug: 'unsafe-patterns',
    payload,
    markdown,
    shouldWriteHistory,
  });

  console.log(
    `[unsafe-patterns] status=${payload.status} files=${payload.summary.fileCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} info=${payload.summary.infoCount} duration=${formatDuration(payload.durationMs)}`
  );
  console.log(`  double-assertions=${payload.trendCounters.doubleAssertionCount} any=${payload.trendCounters.anyCount} eslint-disable=${payload.trendCounters.eslintDisableCount} non-null=${payload.trendCounters.nonNullAssertionCount}`);
  console.log(`Wrote ${path.relative(root, outputs.latestJsonPath)}`);
  console.log(`Wrote ${path.relative(root, outputs.latestMdPath)}`);
  if (shouldWriteHistory) {
    console.log(`Wrote ${path.relative(root, outputs.historicalJsonPath)}`);
    console.log(`Wrote ${path.relative(root, outputs.historicalMdPath)}`);
  }

  if (strictMode && payload.summary.errorCount > 0) {
    process.exit(1);
  }
  if (strictMode && failOnWarnings && payload.summary.warningCount > 0) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[unsafe-patterns] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
