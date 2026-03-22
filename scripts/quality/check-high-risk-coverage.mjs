import { analyzeHighRiskCoverage } from './lib/check-high-risk-coverage.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const formatPct = (value) => (Number.isFinite(value) ? `${value}%` : 'n/a');

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# High-Risk Coverage Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Coverage summary source: \`${payload.coverageSummaryPath}\``);
  lines.push(`- Targets scanned: ${payload.summary.targetCount}`);
  lines.push(`- Matched targets: ${payload.summary.matchedTargetCount}`);
  lines.push(`- Passing targets: ${payload.summary.passingTargetCount}`);
  lines.push(`- Failing targets: ${payload.summary.failingTargetCount}`);
  lines.push(`- Unmatched targets: ${payload.summary.uncoveredTargetCount}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Warnings: ${payload.summary.warningCount}`);
  lines.push(`- Info: ${payload.summary.infoCount}`);
  lines.push('');
  lines.push('## Target Coverage');
  lines.push('');
  lines.push('| Target | Directory | Files | Status | Lines | Statements | Functions | Branches |');
  lines.push('| --- | --- | ---: | --- | ---: | ---: | ---: | ---: |');
  for (const target of payload.targets) {
    lines.push(
      `| ${target.label} | \`${target.directory}\` | ${target.fileCount} | ${String(target.status).toUpperCase()} | ${
        target.metrics ? formatPct(target.metrics.lines.pct) : 'n/a'
      } | ${target.metrics ? formatPct(target.metrics.statements.pct) : 'n/a'} | ${
        target.metrics ? formatPct(target.metrics.functions.pct) : 'n/a'
      } | ${target.metrics ? formatPct(target.metrics.branches.pct) : 'n/a'} |`
    );
  }
  lines.push('');
  lines.push('## Thresholds');
  lines.push('');
  lines.push('| Target | Lines | Statements | Functions | Branches |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const target of payload.targets) {
    lines.push(
      `| ${target.label} | ${target.thresholds.lines}% | ${target.thresholds.statements}% | ${target.thresholds.functions}% | ${target.thresholds.branches}% |`
    );
  }
  lines.push('');
  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('All high-risk directories meet the configured coverage thresholds.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  const failingTargetsWithFiles = payload.targets.filter(
    (target) => target.status === 'fail' && Array.isArray(target.lowestCoverageFiles) && target.lowestCoverageFiles.length > 0
  );
  if (failingTargetsWithFiles.length > 0) {
    lines.push('');
    lines.push('## Lowest Coverage Files');
    lines.push('');
    for (const target of failingTargetsWithFiles) {
      lines.push(`### ${target.label}`);
      lines.push('');
      lines.push('| File | Lines | Statements | Functions | Branches |');
      lines.push('| --- | ---: | ---: | ---: | ---: |');
      for (const file of target.lowestCoverageFiles) {
        lines.push(
          `| \`${file.filePath}\` | ${formatPct(file.lines)} | ${formatPct(file.statements)} | ${formatPct(file.functions)} | ${formatPct(file.branches)} |`
        );
      }
      lines.push('');
    }
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This check reads an existing `coverage-summary.json` artifact; it does not run coverage itself.');
  lines.push('- Threshold misses are errors. Missing coverage artifacts or unmatched target directories remain warnings until this gate is adopted broadly.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'high-risk-coverage',
  analyze: analyzeHighRiskCoverage,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[high-risk-coverage] status=${payload.status} targets=${payload.summary.targetCount} fail=${payload.summary.failingTargetCount} missing=${payload.summary.uncoveredTargetCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`,
  ],
});
