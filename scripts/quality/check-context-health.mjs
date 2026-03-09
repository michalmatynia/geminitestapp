import { analyzeContextHealth } from './lib/check-context-health.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Context Health Check');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Context files scanned: ${payload.summary.contextFileCount}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Warnings: ${payload.summary.warningCount}`);
  lines.push(`- Info: ${payload.summary.infoCount}`);
  lines.push('');
  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('All contexts are healthy.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- `context-generic-error` (warn): Use structured AppError classes for better observability.');
  lines.push(`- \`context-monolith\` (warn): Contexts with >${payload.scope.providerValueFieldThreshold} fields should be split.`);
  lines.push(`- \`context-oversized\` (warn): Context files over ${payload.scope.oversizedLocThreshold} LOC need refactoring.`);
  lines.push('- `context-missing-split` (info): Consider useXxxState/useXxxActions pattern for re-render optimization.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'context-health',
  analyze: analyzeContextHealth,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[context-health] status=${payload.status} contexts=${payload.summary.contextFileCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} info=${payload.summary.infoCount} duration=${formatDuration(payload.durationMs)}`,
  ],
});
